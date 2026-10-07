# -*- coding: utf-8 -*-
"""GlobalWeatherRepository 数据清洗模块（后端 app.py 与 EDA 脚本共享）。

处理该 Kaggle 数据集的三类已知质量问题，全部规则基于数据自身证据，结果可复现：

R1 国家名标准化    同一国家的非英文/变体写法归并为标准英文名（如 "Польша"/"Polônia" -> Poland）。
R2 城市身份校验    同名城市的记录按多数票确定"主位置"，剔除远在他国且坐标偏离主位置
                    的少数错乱行（如城市名 Beirut 但坐标在波兰弗罗茨瓦夫的记录）。
                    另含一份人工复核确认的垃圾行清单（城市名/国家名明显不可能成立的组合）。
R3 城市拼写归并    同一国家内、坐标相距不足 20km 的不同城市名拼写视为同一城市，
                    统一使用记录数最多的规范写法（如 Beijing Shi -> Beijing）。

清洗只修改 country / location_name 两列的取值并剔除无效行，不动任何气象数值；
被剔除的物理边界异常值（温度越界等）仍保留，由数据质量页的边界规则单独统计。
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

# ---------------------------------------------------------------------------
# R1: 国家名别名表（数据集实际出现的变体 -> 标准英文名）
# ---------------------------------------------------------------------------
COUNTRY_ALIASES: dict[str, str] = {
    "Bélgica": "Belgium",
    "Belgien": "Belgium",
    "Malásia": "Malaysia",
    "Polônia": "Poland",
    "Польша": "Poland",
    "Südkorea": "South Korea",
    "Turkménistan": "Turkmenistan",
    "Гватемала": "Guatemala",
    "Турция": "Turkey",
    "火鸡": "Turkey",
    "كولومبيا": "Colombia",
    "Inde": "India",
    "Letonia": "Latvia",
    "Jemen": "Yemen",
    "Komoren": "Comoros",
    "Estonie": "Estonia",
    "Marrocos": "Morocco",
    "Marokko": "Morocco",
    "Mexique": "Mexico",
    "Saudi Arabien": "Saudi Arabia",
    "Saint-Vincent-et-les-Grenadines": "Saint Vincent and the Grenadines",
    "USA United States of America": "United States of America",
}

# ---------------------------------------------------------------------------
# R2b: 人工复核确认的垃圾行（城市名与国家/坐标的组合不可能成立，
#       且该城市名在数据集中无其他可信记录可参照）。键为 "国家 | 城市"。
# ---------------------------------------------------------------------------
JUNK_CITY_KEYS: set[str] = {
    "Turkey | -Kingdom",
    "Colombia | Costa Rica",
    "Guatemala | New Guatemala",
    "Turkmenistan | Krasnyy Turkmenistan",
    "United States of America | Palau",  # 坐标是帕劳群岛，国家却标为美国
    "Malaysia | Ivory Ivory Ban",
    "Morocco | Morocco City",
    "Mexico | Mexico (Grupo Mexico)",
    "Poland | Moldova",  # 城市名是国家名
    "Philippines | Kiyabo",
}

# R2: 同名城市少数组与主位置的最小偏离距离（km），超过才判定为错乱行
MISMATCH_DISTANCE_KM = 150.0
# R3: 同国不同拼写视为同一城市的最大距离（km）
MERGE_DISTANCE_KM = 20.0

# R3 规范名优先表（领域知识，人工复核）：该数据集的同一城市会随时间切换地点标签
# （如哥斯达黎加主观测点先后为 San Ignacio -> San Jose -> San Andres，汤加长期
# 使用带错字的 "Nuku`Aloia"），"记录数最多"的拼写未必是通行名称。归并簇内若
# 出现下列通行名（通常是该国首都），优先作为规范名；其余情况仍按记录数取。
PREFERRED_CITY_NAMES: dict[str, str] = {
    "Jamaica": "Kingston",
    "Palau": "Koror",
    "Costa Rica": "San Jose",
    "Tonga": "Nuku'alofa",
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """两点间大圆距离（km），用于坐标比对。"""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def clean_weather_frame(frame: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """清洗天气数据框，返回 (清洗后的副本, 清洗报告字典)。"""
    frame = frame.copy()
    frame["country"] = frame["country"].astype(str).str.strip()
    frame["location_name"] = frame["location_name"].astype(str).str.strip()
    report: dict[str, Any] = {
        "rows_before": int(len(frame)),
        "cities_before": int(frame["location_name"].nunique()),
        "countries_before": int(frame["country"].nunique()),
    }

    # R1 国家名标准化
    renamed: dict[str, str] = {}
    alias_mask = frame["country"].isin(COUNTRY_ALIASES)
    for raw, count in frame.loc[alias_mask, "country"].value_counts().items():
        renamed[raw] = f"{COUNTRY_ALIASES[raw]}（{int(count)} 行）"
        frame.loc[alias_mask & frame["country"].eq(raw), "country"] = COUNTRY_ALIASES[raw]
    report["country_renames"] = renamed

    # R2b 剔除人工确认的垃圾行
    junk_mask = (frame["country"] + " | " + frame["location_name"]).isin(JUNK_CITY_KEYS)
    report["dropped_junk_keys"] = sorted(
        set(frame.loc[junk_mask, "country"] + " | " + frame.loc[junk_mask, "location_name"])
    )
    frame = frame.loc[~junk_mask].copy()

    # R2 同名城市身份校验：多数票主位置，剔除远偏离的少数异国组
    dropped_mismatch: list[str] = []
    keep_mask = pd.Series(True, index=frame.index)
    for city, group in frame.groupby("location_name"):
        if group["country"].nunique() < 2:
            continue
        stats = group.groupby("country").agg(
            rows=("location_name", "size"),
            lat=("latitude", "median"),
            lon=("longitude", "median"),
        )
        dominant = stats.sort_values("rows", ascending=False).index[0]
        dom_lat = float(stats.loc[dominant, "lat"])
        dom_lon = float(stats.loc[dominant, "lon"])
        for country, row in stats.iterrows():
            if country == dominant:
                continue
            distance = _haversine_km(dom_lat, dom_lon, float(row["lat"]), float(row["lon"]))
            if distance > MISMATCH_DISTANCE_KM:
                mask = (frame["location_name"] == city) & (frame["country"] == country)
                keep_mask &= ~mask
                dropped_mismatch.append(
                    f"{city}（{country} {int(row['rows'])} 行，距主位置 {distance:.0f} km）"
                )
    frame = frame.loc[keep_mask].copy()
    report["dropped_mismatch"] = sorted(dropped_mismatch)

    # R3 同国近距拼写归并：坐标 20km 内的标签视为同一城市，用记录数最多的写法
    merges: dict[str, str] = {}
    label_stats = (
        frame.groupby(["country", "location_name"])
        .agg(rows=("location_name", "size"), lat=("latitude", "median"), lon=("longitude", "median"))
        .reset_index()
    )
    for country, labels in label_stats.groupby("country"):
        accepted: list[tuple[float, float, str]] = []  # (lat, lon, 规范名)
        for _, row in labels.sort_values("rows", ascending=False).iterrows():
            hit = next(
                (name for lat, lon, name in accepted
                 if _haversine_km(float(row["lat"]), float(row["lon"]), lat, lon) <= MERGE_DISTANCE_KM),
                None,
            )
            if hit is None:
                accepted.append((float(row["lat"]), float(row["lon"]), str(row["location_name"])))
            elif hit != row["location_name"]:
                merges[f"{country} | {row['location_name']}"] = f"{country} | {hit}"

    # 按"归并簇"统一重命名：簇内所有标签（含记录数最多的原规范名）统一改为最终
    # 规范名 —— 最终名优先取领域知识优先表中的通行名，否则取记录数最多的写法。
    # 不能只改被归并标签，否则原规范名（如 Port Royal）会残留成独立城市。
    rename_map: dict[tuple[str, str], str] = {}
    clusters: dict[tuple[str, str], set[str]] = {}
    for key, value in merges.items():
        country, canonical = value.split(" | ", 1)
        clusters.setdefault((country, canonical), set()).add(key.split(" | ", 1)[1])
    for (country, canonical), labels in clusters.items():
        labels.add(canonical)
        preferred = PREFERRED_CITY_NAMES.get(country)
        final = preferred if preferred and preferred in labels else canonical
        for label in labels:
            if label != final:
                rename_map[(country, label)] = final

    if rename_map:
        pairs = list(zip(frame["country"], frame["location_name"]))
        frame["location_name"] = pd.Series(
            [rename_map.get(pair, pair[1]) for pair in pairs], index=frame.index
        )
        merges = {f"{c} | {label}": f"{c} | {final}" for (c, label), final in rename_map.items()}
    report["label_merges"] = merges

    frame = frame.reset_index(drop=True)
    report["rows_removed"] = report["rows_before"] - int(len(frame))
    report["rows_after"] = int(len(frame))
    report["cities_after"] = int(frame["location_name"].nunique())
    report["countries_after"] = int(frame["country"].nunique())
    report["mismatch_removed"] = sum(
        int(part.split("行")[0].strip().split(" ")[-1]) for part in report["dropped_mismatch"]
    )
    report["junk_removed"] = len(report["dropped_junk_keys"])
    return frame, report


def cleaning_summary(report: dict[str, Any]) -> dict[str, Any]:
    """压缩版报告，随 /api/summary 返回给前端。"""
    return {
        "rows_before": report["rows_before"],
        "rows_after": report["rows_after"],
        "rows_removed": report["rows_removed"],
        "junk_removed": report["junk_removed"],
        "mismatch_removed": report["mismatch_removed"],
        "country_rename_count": len(report["country_renames"]),
        "label_merge_count": len(report["label_merges"]),
        "cities_before": report["cities_before"],
        "cities_after": report["cities_after"],
        "countries_before": report["countries_before"],
        "countries_after": report["countries_after"],
        "detail": report,
    }


if __name__ == "__main__":
    import io
    import sys

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    from pathlib import Path

    default_csv = Path(__file__).resolve().parents[1] / "data" / "raw" / "GlobalWeatherRepository.csv"
    raw = pd.read_csv(default_csv)
    cleaned, rep = clean_weather_frame(raw)
    print(f"行数 {rep['rows_before']} -> {rep['rows_after']}（剔除 {rep['rows_removed']}）")
    print(f"城市 {rep['cities_before']} -> {rep['cities_after']}，国家 {rep['countries_before']} -> {rep['countries_after']}")
    print(f"\nR1 国家名归并 {len(rep['country_renames'])} 项: {rep['country_renames']}")
    print(f"\nR2b 垃圾行剔除 {rep['junk_removed']} 项: {rep['dropped_junk_keys']}")
    print(f"\nR2 错乱行剔除 {len(rep['dropped_mismatch'])} 组: {rep['dropped_mismatch']}")
    print(f"\nR3 拼写归并 {len(rep['label_merges'])} 组:")
    for key, value in sorted(rep["label_merges"].items()):
        print(f"  {key} -> {value}")
