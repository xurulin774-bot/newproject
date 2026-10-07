#!/usr/bin/env python
"""Local web service for the global weather analysis and recommendation project."""

from __future__ import annotations

import argparse
import json
import math
import mimetypes
import secrets
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "algorithm"))

from clustering import kmeans  # noqa: E402  共享聚类模块位于 algorithm/
from data_cleaning import clean_weather_frame  # noqa: E402  共享清洗模块位于 algorithm/

RAIN_MODEL_DIR = PROJECT_ROOT / "algorithm" / "ml_models"
_rain_predictor: "RainPredictor | None" = None
_rain_predictor_failed = False


class RainPredictor:
    """加载 ml_train.py 持久化的最佳降水模型，提供在线推理。"""

    def __init__(self, model_dir: Path) -> None:
        import joblib

        self.model = joblib.load(model_dir / "rain_model.joblib")
        meta = json.loads((model_dir / "rain_model_meta.json").read_text(encoding="utf-8"))
        self.name = meta["best_name"]
        self.features = meta["features"]
        self.medians = meta["medians"]

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        """frame 需含全部特征列；缺失值按训练集中位数填补。"""
        X = frame[self.features].fillna(pd.Series(self.medians))
        return self.model.predict_proba(X)[:, 1]

    def manual_frame(self, values: dict[str, Any]) -> pd.DataFrame:
        """把前端滑块的少量手动参数补全成完整特征行（缺省取训练集中位数）。"""
        median = self.medians
        month = float(values.get("month") or pd.Timestamp.now().month)
        temperature = float(values.get("temperature", median["temperature_celsius"]))
        humidity = float(values.get("humidity", median["humidity"]))
        cloud = float(values.get("cloud", median["cloud"]))
        wind = float(values.get("wind", median["wind_kph"]))
        gust = float(values.get("gust", wind * 1.4))
        row = {
            "temperature_celsius": temperature,
            "feels_like_celsius": float(values.get("feels_like", temperature)),
            "feels_temp_diff": float(values.get("feels_like", temperature)) - temperature,
            "humidity": humidity,
            "cloud": cloud,
            "dew_spread_proxy": humidity * cloud / 100.0,
            "pressure_mb": float(values.get("pressure", median["pressure_mb"])),
            "wind_kph": wind,
            "gust_kph": gust,
            "gust_wind_ratio": gust / wind if wind else median["gust_wind_ratio"],
            "visibility_km": float(values.get("visibility", median["visibility_km"])),
            "uv_index": float(values.get("uv", median["uv_index"])),
            "month_sin": np.sin(2 * np.pi * month / 12),
            "month_cos": np.cos(2 * np.pi * month / 12),
            "air_quality_PM2.5": float(values.get("pm25", median["air_quality_PM2.5"])),
            "air_quality_PM10": float(values.get("pm10", median["air_quality_PM10"])),
            "air_quality_Ozone": float(values.get("ozone", median["air_quality_Ozone"])),
        }
        return pd.DataFrame([row])


def get_rain_predictor() -> RainPredictor | None:
    """首次调用时加载持久化模型；加载失败（未训练/缺依赖）返回 None 并缓存失败状态。"""
    global _rain_predictor, _rain_predictor_failed
    if _rain_predictor is not None:
        return _rain_predictor
    if _rain_predictor_failed:
        return None
    try:
        _rain_predictor = RainPredictor(RAIN_MODEL_DIR)
        print(f"[weather-system] 降水模型已加载：{_rain_predictor.name}")
        return _rain_predictor
    except Exception as exc:  # noqa: BLE001  缺模型或缺依赖都应在页面给出友好提示
        print(f"[weather-system] 降水模型加载失败：{exc}")
        _rain_predictor_failed = True
        return None


def engineer_weather_features(frame: pd.DataFrame) -> pd.DataFrame:
    """按训练阶段（ml_train.load_dataset）一致的规则派生特征列。"""
    frame = frame.copy()
    month = frame["observed_at_utc"].dt.month
    frame["month_sin"] = np.sin(2 * np.pi * month / 12)
    frame["month_cos"] = np.cos(2 * np.pi * month / 12)
    frame["feels_temp_diff"] = frame["feels_like_celsius"] - frame["temperature_celsius"]
    frame["gust_wind_ratio"] = frame["gust_kph"] / frame["wind_kph"].replace(0, np.nan)
    frame["dew_spread_proxy"] = frame["humidity"] * frame["cloud"] / 100.0
    return frame
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "GlobalWeatherRepository.csv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FIGURES_DIR = PROJECT_ROOT / "figures"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "123456"

REQUIRED_COLUMNS = {
    "country",
    "location_name",
    "latitude",
    "longitude",
    "timezone",
    "last_updated_epoch",
    "last_updated",
    "temperature_celsius",
    "condition_text",
    "wind_kph",
    "pressure_mb",
    "precip_mm",
    "humidity",
    "cloud",
    "visibility_km",
    "uv_index",
    "air_quality_PM2.5",
    "air_quality_PM10",
    "air_quality_us-epa-index",
}


def json_default(value: Any) -> Any:
    """Convert pandas/numpy scalar values into JSON-safe values."""

    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return str(value)


def clean_text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def bounded_inverse(series: pd.Series, ceiling: float) -> pd.Series:
    values = pd.to_numeric(series, errors="coerce").fillna(ceiling)
    return (1 - values.clip(lower=0, upper=ceiling) / ceiling).clip(0, 1)


def bounded_target(series: pd.Series, target: float, radius: float) -> pd.Series:
    values = pd.to_numeric(series, errors="coerce").fillna(target)
    return (1 - (values - target).abs() / radius).clip(0, 1)


class WeatherStore:
    """Load the source once and expose the small aggregates needed by the UI."""

    def __init__(self, data_path: Path) -> None:
        if not data_path.exists():
            raise FileNotFoundError(f"Weather dataset not found: {data_path}")
        self.data_path = data_path

        frame = pd.read_csv(data_path)
        missing = sorted(REQUIRED_COLUMNS.difference(frame.columns))
        if missing:
            raise ValueError(f"The dataset is missing required columns: {', '.join(missing)}")

        frame, cleaning_report = clean_weather_frame(frame)
        self.cleaning_report = cleaning_report

        frame["observed_at_utc"] = pd.to_datetime(
            frame["last_updated_epoch"], unit="s", utc=True, errors="coerce"
        )
        frame["observed_at_local"] = pd.to_datetime(frame["last_updated"], errors="coerce")
        frame["utc_date"] = (
            frame["observed_at_utc"].dt.tz_convert(None).dt.normalize()
        )
        frame["condition_normalized"] = (
            frame["condition_text"].astype(str).str.strip().str.lower().str.title()
        )
        frame["observed_month"] = frame["observed_at_local"].dt.month
        frame["city_key"] = (
            frame["country"].astype(str).str.strip()
            + " | "
            + frame["location_name"].astype(str).str.strip()
        )
        self.frame = frame
        self.latest = (
            frame.sort_values("observed_at_utc")
            .groupby("city_key", as_index=False)
            .tail(1)
            .copy()
        )
        self.daily = self._build_daily()
        self.conditions = self._build_conditions()
        self.summary = self._build_summary(data_path)
        self._eda: dict[str, Any] | None = None
        self._climate: pd.DataFrame | None = None
        self._clusters: dict[int, dict[str, Any]] = {}

    def _build_daily(self) -> pd.DataFrame:
        return (
            self.frame.groupby("utc_date")
            .agg(
                temperature_mean=("temperature_celsius", "mean"),
                temperature_p10=(
                    "temperature_celsius",
                    lambda values: values.quantile(0.1),
                ),
                temperature_p90=(
                    "temperature_celsius",
                    lambda values: values.quantile(0.9),
                ),
                humidity_mean=("humidity", "mean"),
                locations=("city_key", "nunique"),
                records=("city_key", "size"),
            )
            .reset_index()
            .sort_values("utc_date")
        )

    def _build_conditions(self) -> pd.DataFrame:
        counts = (
            self.frame["condition_normalized"]
            .value_counts()
            .rename_axis("condition")
            .reset_index(name="records")
        )
        counts["share"] = counts["records"] / len(self.frame) * 100
        return counts

    def _build_summary(self, data_path: Path) -> dict[str, Any]:
        temperature = self.frame["temperature_celsius"]
        quality_rules = {
            "温度超出 -60 至 60 C": int((temperature.lt(-60) | temperature.gt(60)).sum()),
            "气压超出 850 至 1100 mb": int(
                (
                    self.frame["pressure_mb"].lt(850)
                    | self.frame["pressure_mb"].gt(1100)
                ).sum()
            ),
            "湿度超出 0 至 100%": int(
                (self.frame["humidity"].lt(0) | self.frame["humidity"].gt(100)).sum()
            ),
            "负降水量": int(self.frame["precip_mm"].lt(0).sum()),
            "负能见度": int(self.frame["visibility_km"].lt(0).sum()),
            "负 PM2.5": int(self.frame["air_quality_PM2.5"].lt(0).sum()),
        }
        earliest = self.frame["observed_at_utc"].min()
        latest = self.frame["observed_at_utc"].max()
        return {
            "project_title": "全球城市天气数据分析与出行推荐系统",
            "source_file": data_path.name,
            "records": int(len(self.frame)),
            "fields": int(
                len(
                    [
                        column
                        for column in self.frame.columns
                        if column
                        not in {
                            "observed_at_utc",
                            "observed_at_local",
                            "utc_date",
                            "condition_normalized",
                            "city_key",
                        }
                    ]
                )
            ),
            "countries": int(self.frame["country"].nunique()),
            "locations": int(self.frame["location_name"].nunique()),
            "city_country_pairs": int(self.frame["city_key"].nunique()),
            "time_start": earliest,
            "time_end": latest,
            "temperature_mean": round(float(temperature.mean()), 1),
            "temperature_median": round(float(temperature.median()), 1),
            "air_quality_pm25_median": round(
                float(self.frame["air_quality_PM2.5"].median()), 1
            ),
            "duplicate_rows": int(self.frame.duplicated().sum()),
            "cleaning": {
                "rows_before": self.cleaning_report["rows_before"],
                "rows_after": self.cleaning_report["rows_after"],
                "rows_removed": self.cleaning_report["rows_removed"],
                "junk_removed": self.cleaning_report["junk_removed"],
                "mismatch_removed": self.cleaning_report["mismatch_removed"],
                "country_rename_count": len(self.cleaning_report["country_renames"]),
                "label_merge_count": len(self.cleaning_report["label_merges"]),
                "cities_before": self.cleaning_report["cities_before"],
                "cities_after": self.cleaning_report["cities_after"],
                "countries_before": self.cleaning_report["countries_before"],
                "countries_after": self.cleaning_report["countries_after"],
            },
            "quality_rules": quality_rules,
        }

    @staticmethod
    def _latest_columns() -> dict[str, str]:
        return {
            "country": "country",
            "city": "location_name",
            "latitude": "latitude",
            "longitude": "longitude",
            "timezone": "timezone",
            "temperature": "temperature_celsius",
            "feels_like": "feels_like_celsius",
            "condition": "condition_normalized",
            "humidity": "humidity",
            "cloud": "cloud",
            "precipitation": "precip_mm",
            "visibility": "visibility_km",
            "wind": "wind_kph",
            "uv": "uv_index",
            "pm25": "air_quality_PM2.5",
            "pm10": "air_quality_PM10",
            "epa_index": "air_quality_us-epa-index",
            "updated": "observed_at_local",
        }

    def _latest_records(
        self, frame: pd.DataFrame | None = None, sort: bool = True
    ) -> list[dict[str, Any]]:
        source = self.latest if frame is None else frame
        selected = source[list(self._latest_columns().values())].rename(
            columns={value: key for key, value in self._latest_columns().items()}
        )
        if sort:
            selected = selected.sort_values(["country", "city"])
        return selected.to_dict(orient="records")

    def trend(self, days: int = 180) -> list[dict[str, Any]]:
        days = max(30, min(int(days), 730))
        selected = self.daily.tail(days).copy()
        selected["date"] = selected.pop("utc_date")
        return selected.to_dict(orient="records")

    def condition_distribution(self, limit: int = 10) -> list[dict[str, Any]]:
        limit = max(3, min(int(limit), 20))
        return self.conditions.head(limit).to_dict(orient="records")

    def map_points(self) -> list[dict[str, Any]]:
        return self._latest_records()

    def search_cities(self, query: str = "", limit: int = 30) -> list[dict[str, Any]]:
        query = clean_text(query).lower()
        frame = self.latest
        if query:
            mask = (
                frame["country"].astype(str).str.lower().str.contains(query, na=False)
                | frame["location_name"]
                .astype(str)
                .str.lower()
                .str.contains(query, na=False)
            )
            frame = frame[mask]
        frame = frame.sort_values(["country", "location_name"]).head(max(1, min(limit, 100)))
        return self._latest_records(frame)

    def recommend(
        self, mode: str = "comfort", query: str = "", limit: int = 8
    ) -> list[dict[str, Any]]:
        frame = self.latest.copy()
        query = clean_text(query).lower()
        if query:
            mask = (
                frame["country"].astype(str).str.lower().str.contains(query, na=False)
                | frame["location_name"]
                .astype(str)
                .str.lower()
                .str.contains(query, na=False)
            )
            frame = frame[mask].copy()

        if frame.empty:
            return []

        conditions = frame["condition_normalized"].astype(str).str.lower()
        bad_weather = conditions.str.contains(
            "rain|storm|snow|sleet|thunder|drizzle", regex=True, na=False
        )
        frame["temperature_score"] = bounded_target(
            frame["temperature_celsius"],
            {"warm_sunny": 25, "cool_escape": 15}.get(mode, 23),
            {"warm_sunny": 15, "cool_escape": 15}.get(mode, 18),
        )
        frame["humidity_score"] = bounded_target(frame["humidity"], 55, 55)
        frame["precipitation_score"] = bounded_inverse(frame["precip_mm"], 12)
        frame["air_score"] = bounded_inverse(frame["air_quality_PM2.5"], 100)
        frame["visibility_score"] = (
            pd.to_numeric(frame["visibility_km"], errors="coerce").fillna(0)
            .clip(lower=0, upper=15)
            / 15
        )
        frame["cloud_score"] = bounded_inverse(frame["cloud"], 100)
        frame["condition_score"] = (~bad_weather).astype(float)

        weights = {
            "comfort": {
                "temperature_score": 0.34,
                "humidity_score": 0.14,
                "precipitation_score": 0.18,
                "air_score": 0.15,
                "visibility_score": 0.10,
                "condition_score": 0.09,
            },
            "clean_air": {
                "temperature_score": 0.10,
                "precipitation_score": 0.12,
                "air_score": 0.45,
                "visibility_score": 0.20,
                "cloud_score": 0.03,
                "condition_score": 0.10,
            },
            "warm_sunny": {
                "temperature_score": 0.30,
                "humidity_score": 0.08,
                "precipitation_score": 0.20,
                "air_score": 0.10,
                "visibility_score": 0.12,
                "cloud_score": 0.12,
                "condition_score": 0.08,
            },
            "cool_escape": {
                "temperature_score": 0.35,
                "humidity_score": 0.10,
                "precipitation_score": 0.16,
                "air_score": 0.20,
                "visibility_score": 0.10,
                "condition_score": 0.09,
            },
        }.get(mode, {})

        frame["score"] = 0.0
        for column, weight in weights.items():
            frame["score"] += frame[column] * weight

        frame = frame.sort_values(
            ["score", "air_quality_PM2.5"], ascending=[False, True]
        ).head(max(1, min(limit, 30)))
        records = self._latest_records(frame, sort=False)
        for record, (_, row) in zip(records, frame.iterrows()):
            reasons: list[str] = []
            if row["temperature_score"] >= 0.7:
                reasons.append(f"温度 {row['temperature_celsius']:.1f} C")
            if row["air_score"] >= 0.7:
                reasons.append(f"PM2.5 {row['air_quality_PM2.5']:.1f}")
            if row["precipitation_score"] >= 0.75:
                reasons.append(f"降水 {row['precip_mm']:.1f} mm")
            if row["visibility_score"] >= 0.7:
                reasons.append(f"能见度 {row['visibility_km']:.1f} km")
            record["score"] = round(float(row["score"]) * 100, 1)
            record["reason"] = "；".join(reasons[:3]) or "综合指标较均衡"
        return records

    # ------------------------------------------------------------------
    # 城市气候画像与扩展分析模块（相似城市 / 出行规划 / 对比 / 聚类 / 预测）
    # ------------------------------------------------------------------

    MONTHLY_COLUMNS: dict[str, str] = {"temp": "temperature_celsius", "hum": "humidity", "pr": "precip_mm"}

    def climate(self) -> pd.DataFrame:
        """每城市长期气候画像：逐月均温/湿度/降水 + 年均 PM2.5，行索引为 city_key。"""
        if self._climate is None:
            frame = self.frame
            base = frame.groupby("city_key").agg(
                country=("country", "first"),
                city=("location_name", "first"),
                pm25=("air_quality_PM2.5", "mean"),
            )
            for prefix, column in self.MONTHLY_COLUMNS.items():
                pivot = frame.pivot_table(index="city_key", columns="observed_month", values=column, aggfunc="mean")
                pivot.columns = [f"{prefix}_{month}" for month in pivot.columns]
                base = base.join(pivot)
            self._climate = base
        return self._climate

    def climate_feature_columns(self) -> list[str]:
        columns = [f"{prefix}_{month}" for prefix in self.MONTHLY_COLUMNS for month in range(1, 13)]
        return columns + ["pm25"]

    def city_profile(self, city_key: str) -> dict[str, Any]:
        """单个城市的完整画像：最新观测 + 逐月气候序列，供对比/详情使用。"""
        climate = self.climate()
        if city_key not in climate.index:
            raise KeyError(city_key)
        row = self.latest[self.latest["city_key"] == city_key]
        if row.empty:
            raise KeyError(city_key)
        record = self._latest_records(row, sort=False)[0]
        climate_row = climate.loc[city_key]
        for prefix in self.MONTHLY_COLUMNS:
            record[f"monthly_{prefix}"] = [
                round(float(climate_row[f"{prefix}_{month}"]), 1)
                if pd.notna(climate_row[f"{prefix}_{month}"]) else None
                for month in range(1, 13)
            ]
        record["pm25_annual"] = round(float(climate_row["pm25"]), 1)
        record["city_key"] = city_key
        predictor = get_rain_predictor()
        record["rain_probability"] = None
        if predictor is not None:
            try:
                engineered = engineer_weather_features(row)
                record["rain_probability"] = round(float(predictor.predict(engineered)[0]) * 100, 1)
            except Exception:  # noqa: BLE001  模型不可用时对比页该列显示 "-"
                pass
        return record

    def _standardized_climate(self) -> tuple[pd.DataFrame, pd.DataFrame]:
        """气候特征 z-score 标准化，返回 (标准化矩阵, 原始特征矩阵)。"""
        columns = self.climate_feature_columns()
        raw = self.climate()[columns].astype(float)
        raw = raw.fillna(raw.mean())
        sigma = raw.std().replace(0, 1)
        return (raw - raw.mean()) / sigma, raw

    def similar(self, city_key: str, limit: int = 8) -> dict[str, Any]:
        """基于逐月气候向量的余弦相似度，寻找气候最相似的城市。"""
        standardized, _ = self._standardized_climate()
        if city_key not in standardized.index:
            raise KeyError(city_key)
        limit = max(1, min(int(limit), 20))
        target = standardized.loc[city_key]
        norms = np.sqrt((standardized ** 2).sum(axis=1)).replace(0, np.nan)
        target_norm = float(np.sqrt((target ** 2).sum()))
        similarities = standardized.dot(target) / (norms * target_norm)
        similarities = similarities.drop(city_key).sort_values(ascending=False).head(limit)

        target_profile = self.city_profile(city_key)
        items = []
        for key, similarity in similarities.items():
            record = self.city_profile(key)
            record["similarity"] = round(float(similarity) * 100, 1)
            items.append(record)
        return {"target": target_profile, "items": items}

    def plan(self, month: int, mode: str = "comfort", limit: int = 8) -> list[dict[str, Any]]:
        """按出行月份推荐：用该城市历史同月的均温/湿度/降水与空气质量打分。"""
        month = max(1, min(int(month), 12))
        climate = self.climate()
        temp_column, hum_column, pr_column = f"temp_{month}", f"hum_{month}", f"pr_{month}"
        frame = climate[[temp_column, hum_column, pr_column, "pm25", "country", "city"]].dropna(subset=[temp_column]).copy()

        conditions = self.frame["condition_normalized"].astype(str).str.lower()
        bad_weather = conditions.str.contains("rain|storm|snow|sleet|thunder|drizzle", regex=True, na=False)
        wet = self.frame[bad_weather].groupby("city_key").size()
        total = self.frame.groupby("city_key").size()
        frame["wet_share"] = frame.index.map(wet / total).fillna(0.0)

        temperature_target = {"warm_sunny": 25, "cool_escape": 15}.get(mode, 23)
        frame["temperature_score"] = bounded_target(frame[temp_column], temperature_target, 12)
        frame["humidity_score"] = bounded_target(frame[hum_column], 55, 40)
        frame["precipitation_score"] = bounded_inverse(frame[pr_column], 10)
        frame["air_score"] = bounded_inverse(frame["pm25"], 100)
        frame["wet_score"] = 1 - frame["wet_share"].clip(0, 1)
        weights = {
            "comfort": {"temperature_score": .38, "humidity_score": .16, "precipitation_score": .18, "air_score": .16, "wet_score": .12},
            "clean_air": {"temperature_score": .12, "humidity_score": .08, "precipitation_score": .12, "air_score": .48, "wet_score": .20},
            "warm_sunny": {"temperature_score": .34, "humidity_score": .10, "precipitation_score": .22, "air_score": .10, "wet_score": .24},
            "cool_escape": {"temperature_score": .40, "humidity_score": .12, "precipitation_score": .14, "air_score": .20, "wet_score": .14},
        }.get(mode, {"temperature_score": .38, "humidity_score": .16, "precipitation_score": .18, "air_score": .16, "wet_score": .12})
        frame["score"] = sum(frame[column] * weight for column, weight in weights.items())
        frame = frame.sort_values("score", ascending=False).head(max(1, min(int(limit), 20)))

        items = []
        for key, row in frame.iterrows():
            reason_parts = []
            if row["temperature_score"] >= 0.7:
                reason_parts.append(f"{month}月均温 {row[temp_column]:.1f} C")
            if row["precipitation_score"] >= 0.7:
                reason_parts.append(f"月均降水 {row[pr_column]:.1f} mm")
            if row["air_score"] >= 0.7:
                reason_parts.append(f"PM2.5 {row['pm25']:.1f}")
            items.append({
                "city_key": key,
                "country": row["country"],
                "city": row["city"],
                "temperature": round(float(row[temp_column]), 1),
                "humidity": round(float(row[hum_column]), 0),
                "precipitation": round(float(row[pr_column]), 1),
                "pm25": round(float(row["pm25"]), 1),
                "score": round(float(row["score"]) * 100, 1),
                "reason": "；".join(reason_parts[:3]) or f"{month}月历史同期较均衡",
            })
        return items

    def compare(self, city_keys: list[str]) -> list[dict[str, Any]]:
        """1~4 个城市的画像对比数据。"""
        profiles = []
        for key in city_keys[:4]:
            try:
                profiles.append(self.city_profile(key))
            except KeyError:
                continue
        return profiles

    def advice(self, city_key: str, month: int | None = None) -> dict[str, Any]:
        """出行助手：综合实况/历史同期气候、降水模型与空气质量生成生活指数与建议。

        month 为空表示"当前实况"模式（使用最新观测 + 模型实时降水概率）；
        指定月份则为"历史同期"模式（降水概率改用该月历史湿滑天气占比）。
        """
        climate = self.climate()
        if city_key not in climate.index:
            raise KeyError(city_key)
        profile = self.city_profile(city_key)
        current_month = int(pd.Timestamp.now().month)

        if month is None:
            mode = "now"
            temperature = float(profile["temperature"])
            humidity = float(profile["humidity"])
            precip = float(profile["precipitation"])
            pm25 = float(profile["pm25"])
            uv = float(profile["uv"])
            rain_prob = float(profile["rain_probability"]) if profile.get("rain_probability") is not None else None
            condition = profile.get("condition")
        else:
            mode = "month"
            month = max(1, min(int(month), 12))
            row = climate.loc[city_key]
            temperature = float(row[f"temp_{month}"])
            humidity = float(row[f"hum_{month}"])
            precip = float(row[f"pr_{month}"])
            sub = self.frame[(self.frame["city_key"] == city_key) & (self.frame["observed_month"] == month)]
            pm25 = float(sub["air_quality_PM2.5"].mean()) if len(sub) else float(profile["pm25"])
            uv = float(sub["uv_index"].mean()) if len(sub) else float(profile["uv"])
            wet = sub["condition_normalized"].astype(str).str.lower().str.contains(
                "rain|storm|snow|sleet|thunder|drizzle", regex=True, na=False)
            rain_prob = round(float(wet.mean()) * 100, 1) if len(sub) else None
            condition = None

        rain_prob = 0.0 if rain_prob is None else rain_prob
        deviation = round(temperature - float(climate.loc[city_key, f"temp_{current_month}"]), 1)

        # ---- 六项生活指数 ----
        if temperature >= 28:
            clothing = ("炎热", "短袖短裤，注意防暑补水", "issue")
        elif temperature >= 22:
            clothing = ("温暖", "短袖或薄长袖即可", "ok")
        elif temperature >= 15:
            clothing = ("微凉", "长袖外加薄外套", "ok")
        elif temperature >= 5:
            clothing = ("较冷", "外套毛衣注意保暖", "warn")
        else:
            clothing = ("寒冷", "羽绒服、帽子手套全套", "issue")

        if rain_prob >= 60:
            umbrella = ("必备雨具", f"降水概率约 {rain_prob:.0f}%，出门务必带伞", "issue")
        elif rain_prob >= 30:
            umbrella = ("建议携带", f"降水概率约 {rain_prob:.0f}%，有降雨可能", "warn")
        else:
            umbrella = ("基本不用", f"降水概率仅 {rain_prob:.0f}%", "ok")

        if pm25 <= 35 and rain_prob < 50 and -5 <= temperature <= 32:
            sport = ("适宜", "空气好、天气舒适，适合户外运动", "ok")
        elif pm25 <= 115 and temperature <= 35:
            sport = ("较适宜", "轻度敏感人群可酌量户外活动", "warn")
        else:
            sport = ("不适宜", "空气或天气条件较差，建议室内运动", "issue")

        if rain_prob >= 50:
            carwash = ("不宜洗车", "近期降雨概率高，洗了容易白洗", "issue")
        elif rain_prob >= 20:
            carwash = ("谨慎", "有一定降雨可能", "warn")
        else:
            carwash = ("适宜洗车", "近期无雨，放心洗车", "ok")

        if uv >= 8:
            sunscreen = ("很强", "SPF50+ 防晒霜、遮阳帽墨镜", "issue")
        elif uv >= 5:
            sunscreen = ("中等", "SPF30 防晒，午后减少暴晒", "warn")
        else:
            sunscreen = ("较弱", "常规防护即可", "ok")

        if pm25 <= 35:
            air = ("优", "空气清新，放心出行", "ok")
        elif pm25 <= 75:
            air = ("良", "空气可以接受，极敏感人群留意", "ok")
        elif pm25 <= 115:
            air = ("轻度污染", "敏感人群减少户外长时间活动", "warn")
        elif pm25 <= 150:
            air = ("中度污染", "外出建议佩戴口罩", "issue")
        else:
            air = ("重度污染", "尽量减少外出，佩戴防护口罩", "issue")

        indices = [
            {"key": "clothing", "name": "穿衣指数", "level": clothing[0], "tone": clothing[2], "text": clothing[1]},
            {"key": "umbrella", "name": "雨伞指数", "level": umbrella[0], "tone": umbrella[2], "text": umbrella[1]},
            {"key": "sport", "name": "运动指数", "level": sport[0], "tone": sport[2], "text": sport[1]},
            {"key": "carwash", "name": "洗车指数", "level": carwash[0], "tone": carwash[2], "text": carwash[1]},
            {"key": "sunscreen", "name": "防晒指数", "level": sunscreen[0], "tone": sunscreen[2], "text": sunscreen[1]},
            {"key": "air", "name": "空气质量", "level": air[0], "tone": air[2], "text": air[1]},
        ]

        score = (
            bounded_target(pd.Series([temperature]), 23, 18).iloc[0] * 0.35
            + bounded_target(pd.Series([humidity]), 55, 40).iloc[0] * 0.15
            + bounded_inverse(pd.Series([precip]), 10).iloc[0] * 0.20
            + bounded_inverse(pd.Series([pm25]), 100).iloc[0] * 0.18
            + (1 - min(rain_prob, 100) / 100) * 0.12
        ) * 100

        parts = [f"{clothing[1]}", umbrella[1], air[1]]
        if mode == "now" and abs(deviation) >= 1.5:
            parts.append(f"当前气温较历史同期{'偏高' if deviation > 0 else '偏低'} {abs(deviation):.1f} °C")
        if score >= 75:
            verdict = "非常适合出行"
        elif score >= 60:
            verdict = "总体适合出行"
        elif score >= 45:
            verdict = "出行体验一般"
        else:
            verdict = "条件较差，建议改期或调整行程"
        summary = f"{profile['city']}（{profile['country']}）综合评分 {score:.0f} 分，{verdict}。" + "；".join(parts) + "。"

        return {
            "city_key": city_key,
            "city": profile["city"],
            "country": profile["country"],
            "mode": mode,
            "month": month,
            "score": round(float(score), 1),
            "verdict": verdict,
            "indices": indices,
            "facts": {
                "temperature": round(temperature, 1),
                "humidity": round(humidity, 0),
                "precipitation": round(precip, 1),
                "pm25": round(pm25, 1),
                "uv": round(uv, 1),
                "rain_probability": rain_prob,
                "condition": condition,
                "deviation": deviation if mode == "now" else None,
            },
            "summary": summary,
            "monthly_temp": profile["monthly_temp"],
        }

    def forecast(self, city_key: str | None = None, days: int = 30) -> dict[str, Any]:
        """温度趋势外推（演示用）：30 日滑动平均 + 线性回归，非气象预报。"""
        days = max(7, min(int(days), 90))
        if city_key:
            if city_key not in self.climate().index:
                raise KeyError(city_key)
            frame = self.frame[self.frame["city_key"] == city_key]
            target_name = str(frame["location_name"].iloc[0])
        else:
            frame = self.frame
            target_name = "全球平均"
        daily = frame.groupby("utc_date")["temperature_celsius"].mean().sort_index()
        smoothed = daily.rolling(30, min_periods=10).mean().dropna()
        if len(smoothed) < 60:
            raise ValueError("该城市观测序列太短，无法拟合趋势")
        recent = smoothed.tail(180)
        x = np.arange(len(recent), dtype=float)
        slope, intercept = np.polyfit(x, recent.values, 1)
        fitted = intercept + slope * x
        residual = recent.values - fitted
        residual_std = float(residual.std())
        ss_res = float((residual ** 2).sum())
        ss_tot = float(((recent.values - recent.values.mean()) ** 2).sum())
        r2 = 1 - ss_res / ss_tot if ss_tot else 0.0

        history = [{"date": str(date.date()), "value": round(float(value), 2)} for date, value in smoothed.tail(180).items()]
        last_date = smoothed.index[-1]
        forecast_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=days)
        forecast_items = [
            {
                "date": str(date.date()),
                "value": round(float(intercept + slope * (len(recent) + offset)), 2),
                "lower": round(float(intercept + slope * (len(recent) + offset) - 2 * residual_std), 2),
                "upper": round(float(intercept + slope * (len(recent) + offset) + 2 * residual_std), 2),
            }
            for offset, date in enumerate(forecast_dates)
        ]
        return {
            "target": target_name,
            "city_key": city_key,
            "history": history,
            "forecast": forecast_items,
            "stats": {
                "slope_per_year": round(float(slope * 365), 2),
                "r2": round(r2, 3),
                "mae": round(float(np.abs(residual).mean()), 2),
                "window_days": 30,
                "fit_days": int(len(recent)),
            },
        }

    def clusters(self, k: int = 5) -> dict[str, Any]:
        """对城市气候向量做 KMeans 聚类，并按年均温升序命名气候带。"""
        k = max(2, min(int(k), 8))
        if k in self._clusters:
            return self._clusters[k]
        standardized, raw = self._standardized_climate()
        labels, _, inertia = kmeans(standardized.values, k)
        climate = self.climate().loc[standardized.index].copy()
        climate["cluster"] = labels
        temp_columns = [f"temp_{m}" for m in range(1, 13)]
        hum_columns = [f"hum_{m}" for m in range(1, 13)]
        pr_columns = [f"pr_{m}" for m in range(1, 13)]
        profiles = []
        for cluster_id in sorted(climate["cluster"].unique()):
            group = climate[climate["cluster"] == cluster_id]
            profiles.append({
                "cluster": int(cluster_id),
                "count": int(len(group)),
                "mean_temp": round(float(group[temp_columns].mean().mean()), 1),
                "mean_humidity": round(float(group[hum_columns].mean().mean()), 1),
                "mean_precipitation": round(float(group[pr_columns].mean().mean()), 1),
                "mean_pm25": round(float(group["pm25"].mean()), 1),
                "inertia_share": None,
            })
        profiles.sort(key=lambda item: item["mean_temp"])
        rename = {profile["cluster"]: number for number, profile in enumerate(profiles, 1)}
        climate["cluster"] = climate["cluster"].map(rename)
        for number, profile in enumerate(profiles, 1):
            profile["cluster"] = number

        latest = self.latest[["city_key", "country", "location_name", "latitude", "longitude"]].copy()
        latest["cluster"] = latest["city_key"].map(climate["cluster"])
        points = [
            {
                "city_key": row.city_key,
                "country": row.country,
                "city": row.location_name,
                "latitude": float(row.latitude),
                "longitude": float(row.longitude),
                "cluster": int(row.cluster),
            }
            for row in latest.dropna(subset=["cluster"]).itertuples()
        ]
        payload = {
            "k": len(profiles),
            "inertia": round(inertia, 2),
            "profiles": profiles,
            "points": points,
        }
        self._clusters[k] = payload
        return payload

    def eda_payload(self) -> dict[str, Any]:
        """EDA 交互图表所需的聚合数据，首次访问时计算并缓存。"""

        if self._eda is None:
            self._eda = self._build_eda()
        return self._eda

    def _build_eda(self) -> dict[str, Any]:
        frame = self.frame
        temporal = [
            {
                "date": str(row.utc_date.date()),
                "records": int(row.records),
                "locations": int(row.locations),
            }
            for row in self.daily.itertuples()
        ]
        temperature_trend = [
            {
                "date": str(row.utc_date.date()),
                "mean": round(float(row.temperature_mean), 2),
                "p10": round(float(row.temperature_p10), 2),
                "p90": round(float(row.temperature_p90), 2),
            }
            for row in self.daily.itertuples()
        ]
        top_keys = frame["city_key"].value_counts().head(8).index
        sub = frame[frame["city_key"].isin(top_keys)]
        seasonal_profiles = []
        for key, group in sub.groupby("city_key"):
            means = group.groupby("observed_month")["temperature_celsius"].mean()
            seasonal_profiles.append(
                {
                    "city": str(group["location_name"].iloc[0]),
                    "country": str(group["country"].iloc[0]),
                    "months": [round(float(means.get(month)), 2) if month in means else None for month in range(1, 13)],
                }
            )
        seasonal_profiles.sort(key=lambda item: -(item["months"][6] or -99))
        conditions = [
            {"condition": row.condition, "records": int(row.records), "share": round(float(row.share), 2)}
            for row in self.conditions.head(12).itertuples()
        ]
        latest_air = self.latest[["air_quality_PM2.5", "air_quality_PM10", "air_quality_us-epa-index"]].apply(
            pd.to_numeric, errors="coerce"
        )
        epa_counts = latest_air["air_quality_us-epa-index"].value_counts().sort_index()
        air_quality = {
            "scatter": [
                {"pm25": round(float(row[0]), 1), "pm10": round(float(row[1]), 1)}
                for row in latest_air[["air_quality_PM2.5", "air_quality_PM10"]].dropna().itertuples(index=False)
            ],
            "epa": [{"index": f"等级 {int(idx)}", "count": int(count)} for idx, count in epa_counts.items()],
        }
        numeric_fields = [
            ("temperature_celsius", "温度"),
            ("feels_like_celsius", "体感"),
            ("humidity", "湿度"),
            ("wind_kph", "风速"),
            ("pressure_mb", "气压"),
            ("precip_mm", "降水"),
            ("visibility_km", "能见度"),
            ("cloud", "云量"),
            ("uv_index", "紫外线"),
            ("air_quality_PM2.5", "PM2.5"),
            ("air_quality_PM10", "PM10"),
        ]
        corr = frame[[column for column, _ in numeric_fields]].corr(method="pearson")
        correlation = {
            "fields": [label for _, label in numeric_fields],
            "matrix": [[round(float(value), 3) for value in row] for row in corr.values],
        }
        humidity = pd.to_numeric(self.latest["humidity"], errors="coerce")
        visibility = pd.to_numeric(self.latest["visibility_km"], errors="coerce")
        precipitation = pd.to_numeric(self.latest["precip_mm"], errors="coerce")
        bins = list(range(0, 101, 10))
        comfort = []
        for start, end in zip(bins[:-1], bins[1:]):
            mask = (humidity >= start) & (humidity < end) if end < 100 else (humidity >= start) & (humidity <= end)
            comfort.append(
                {
                    "bin": f"{start}-{end}%",
                    "visibility": round(float(visibility[mask].mean()), 2) if mask.any() else None,
                    "precipitation": round(float(precipitation[mask].mean()), 2) if mask.any() else None,
                    "cities": int(mask.sum()),
                }
            )
        return {
            "temporal": temporal,
            "temperature_trend": temperature_trend,
            "seasonal_profiles": seasonal_profiles,
            "conditions": conditions,
            "air_quality": air_quality,
            "correlation": correlation,
            "geospatial": self._latest_records(sort=False),
            "comfort": comfort,
            "domain_checks": self.summary["quality_rules"],
            "clusters": self.clusters(5),
        }


class WeatherRequestHandler(SimpleHTTPRequestHandler):
    """Serve the dashboard and the JSON endpoints from one local process.

    数据仓库 WeatherStore 挂在 server.store 上而不是 handler 实例上，
    这样 /api/admin/reload 可以在运行中替换整个数据仓库（热重载）。
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        # Keep the terminal readable while still reporting the request status.
        print(f"[weather-system] {self.address_string()} - {format % args}")

    def end_headers(self) -> None:
        # 本地演示服务：静态资源一律禁缓存，避免前端改版后浏览器仍使用旧文件。
        # API 响应在 send_json/send_auth_json 中已单独设置 no-store。
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=json_default).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return value if isinstance(value, dict) else {}

    def send_auth_json(self, payload: Any, token: str | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=json_default).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if token:
            self.send_header(
                "Set-Cookie",
                f"weather_session={token}; Path=/; HttpOnly; SameSite=Lax",
            )
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/auth/login":
                body = self.read_json_body()
                username = clean_text(body.get("username"))
                password = clean_text(body.get("password"))
                if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
                    self.send_json(
                        {"code": 401, "message": "用户名或密码错误"},
                        status=401,
                    )
                    return
                token = secrets.token_urlsafe(24)
                self.server.session_tokens.add(token)  # type: ignore[attr-defined]
                self.send_auth_json(
                    {
                        "code": 200,
                        "message": "登录成功",
                        "user": {
                            "username": ADMIN_USERNAME,
                            "display_name": "天气分析管理员",
                            "role": "系统管理员",
                        },
                    },
                    token=token,
                )
                return
            if parsed.path == "/api/auth/logout":
                token = self.get_cookie("weather_session")
                if token:
                    self.server.session_tokens.discard(token)  # type: ignore[attr-defined]
                self.send_json({"code": 200, "message": "已退出登录"})
                return
            if parsed.path == "/api/ml/predict":
                predictor = get_rain_predictor()
                if predictor is None:
                    self.send_json({"available": False, "message": "降水模型不存在：请先运行 python algorithm/ml_train.py"})
                    return
                values = self.read_json_body()
                probability = float(predictor.predict(predictor.manual_frame(values))[0])
                self.send_json({
                    "available": True, "model": predictor.name,
                    "probability": round(probability * 100, 1),
                    "label": "降水" if probability >= 0.5 else "无降水",
                })
                return
            if parsed.path == "/api/admin/reload":
                if not self.require_auth():
                    self.send_json({"code": 401, "message": "请先登录后再重载数据"}, status=401)
                    return
                print(f"[weather-system] reloading dataset: {self.server.store.data_path}")
                new_store = WeatherStore(self.server.store.data_path)
                self.server.store = new_store
                summary = new_store.summary
                self.send_json({
                    "code": 200,
                    "message": f"数据已重载：{summary['records']:,} 行 / {summary['locations']} 城 / {summary['countries']} 国",
                    "summary": {"records": summary["records"], "locations": summary["locations"], "countries": summary["countries"]},
                })
                return
            self.send_error(404, "Endpoint not found")
        except Exception as exc:
            print(f"[weather-system] POST request failed: {exc}")
            self.send_json({"error": str(exc)}, status=500)

    def get_cookie(self, name: str) -> str:
        cookie_header = self.headers.get("Cookie", "")
        for item in cookie_header.split(";"):
            key, separator, value = item.strip().partition("=")
            if separator and key == name:
                return value
        return ""

    def require_auth(self) -> bool:
        token = self.get_cookie("weather_session")
        return bool(token) and token in self.server.session_tokens

    def send_local_file(self, file_path: Path) -> None:
        if not file_path.exists() or not file_path.is_file():
            self.send_error(404, "File not found")
            return
        body = file_path.read_bytes()
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/api/health":
                self.send_json({"status": "ok", "project": self.server.store.summary["project_title"]})
                return
            if parsed.path == "/api/auth/me":
                token = self.get_cookie("weather_session")
                if token and token in self.server.session_tokens:  # type: ignore[attr-defined]
                    self.send_json(
                        {
                            "code": 200,
                            "authenticated": True,
                            "user": {
                                "username": ADMIN_USERNAME,
                                "display_name": "天气分析管理员",
                                "role": "系统管理员",
                            },
                        }
                    )
                else:
                    self.send_json({"code": 401, "authenticated": False}, status=401)
                return
            if parsed.path == "/api/summary":
                self.send_json(self.server.store.summary)
                return
            if parsed.path == "/api/cleaning":
                self.send_json({"report": self.server.store.cleaning_report})
                return
            if parsed.path == "/api/eda":
                self.send_json(self.server.store.eda_payload())
                return
            if parsed.path == "/api/trend":
                self.send_json(
                    {"items": self.server.store.trend(self._query_int(query, "days", 180))}
                )
                return
            if parsed.path == "/api/conditions":
                self.send_json(
                    {
                        "items": self.server.store.condition_distribution(
                            self._query_int(query, "limit", 10)
                        )
                    }
                )
                return
            if parsed.path == "/api/map":
                self.send_json({"items": self.server.store.map_points()})
                return
            if parsed.path == "/api/cities":
                self.send_json(
                    {
                        "items": self.server.store.search_cities(
                            self._query_text(query, "q"),
                            self._query_int(query, "limit", 30),
                        )
                    }
                )
                return
            if parsed.path == "/api/recommend":
                self.send_json(
                    {
                        "items": self.server.store.recommend(
                            self._query_text(query, "mode", "comfort"),
                            self._query_text(query, "q"),
                            self._query_int(query, "limit", 8),
                        )
                    }
                )
                return
            if parsed.path == "/api/similar":
                key = self._query_text(query, "k")
                try:
                    self.send_json(self.server.store.similar(key, self._query_int(query, "limit", 8)))
                except KeyError:
                    self.send_json({"error": f"未知城市：{key or '(未指定)'}"}, status=404)
                return
            if parsed.path == "/api/plan":
                self.send_json(
                    {
                        "month": max(1, min(self._query_int(query, "month", 1), 12)),
                        "items": self.server.store.plan(
                            self._query_int(query, "month", 1),
                            self._query_text(query, "mode", "comfort"),
                            self._query_int(query, "limit", 8),
                        ),
                    }
                )
                return
            if parsed.path == "/api/compare":
                keys = [value for value in query.get("k", []) if value][:4]
                self.send_json({"items": self.server.store.compare(keys)})
                return
            if parsed.path == "/api/forecast":
                key = self._query_text(query, "k")
                try:
                    self.send_json(self.server.store.forecast(key or None, self._query_int(query, "days", 30)))
                except KeyError:
                    self.send_json({"error": f"未知城市：{key}"}, status=404)
                return
            if parsed.path == "/api/clusters":
                self.send_json(self.server.store.clusters(self._query_int(query, "k", 5)))
                return
            if parsed.path == "/api/advice":
                key = self._query_text(query, "k")
                try:
                    month_text = self._query_text(query, "month")
                    month = int(month_text) if month_text else None
                    self.send_json(self.server.store.advice(key, month))
                except KeyError:
                    self.send_json({"error": f"未知城市：{key or '(未指定)'}"}, status=404)
                return
            if parsed.path == "/api/ml":
                metrics_path = PROJECT_ROOT / "data" / "profile" / "ml_metrics.json"
                if not metrics_path.exists():
                    self.send_json({
                        "available": False,
                        "message": "尚未训练模型：请先运行 python algorithm/ml_train.py",
                    })
                    return
                self.send_json({"available": True, "metrics": json.loads(metrics_path.read_text(encoding="utf-8"))})
                return
            if parsed.path == "/api/ml/predict":
                predictor = get_rain_predictor()
                if predictor is None:
                    self.send_json({"available": False, "message": "降水模型不存在：请先运行 python algorithm/ml_train.py"})
                    return
                key = self._query_text(query, "k")
                row = self.server.store.latest[self.server.store.latest["city_key"] == key]
                if row.empty:
                    self.send_json({"error": f"未知城市：{key or '(未指定)'}"}, status=404)
                    return
                row = row.iloc[[0]].copy()
                engineered = engineer_weather_features(row)
                probability = float(predictor.predict(engineered)[0])
                frame = self.server.store.frame
                drivers = []
                for column, label in [("humidity", "湿度"), ("cloud", "云量"), ("visibility_km", "能见度"),
                                      ("pressure_mb", "气压"), ("temperature_celsius", "温度"), ("wind_kph", "风速")]:
                    value = float(row.iloc[0][column])
                    mean = float(frame[column].mean())
                    std = float(frame[column].std()) or 1.0
                    drivers.append({"feature": label, "value": round(value, 1), "z": round((value - mean) / std, 2)})
                inputs = {
                    "month": int(row.iloc[0]["observed_at_utc"].month),
                    "temperature": round(float(row.iloc[0]["temperature_celsius"]), 1),
                    "humidity": int(float(row.iloc[0]["humidity"])),
                    "cloud": int(float(row.iloc[0]["cloud"])),
                    "pressure": int(float(row.iloc[0]["pressure_mb"])),
                    "wind": round(float(row.iloc[0]["wind_kph"]), 1),
                    "visibility": round(float(row.iloc[0]["visibility_km"]), 1),
                    "uv": round(float(row.iloc[0]["uv_index"]), 1),
                    "pm25": round(float(row.iloc[0]["air_quality_PM2.5"]), 1),
                    "pm10": round(float(row.iloc[0]["air_quality_PM10"]), 1),
                }
                self.send_json({
                    "available": True, "model": predictor.name, "city_key": key,
                    "city": str(row.iloc[0]["location_name"]), "country": str(row.iloc[0]["country"]),
                    "probability": round(probability * 100, 1),
                    "label": "降水" if probability >= 0.5 else "无降水",
                    "inputs": inputs, "drivers": drivers,
                })
                return
            if parsed.path == "/api/ml/risk_rank":
                predictor = get_rain_predictor()
                if predictor is None:
                    self.send_json({"available": False, "message": "降水模型不存在：请先运行 python algorithm/ml_train.py"})
                    return
                limit = max(3, min(self._query_int(query, "limit", 10), 30))
                latest = engineer_weather_features(self.server.store.latest)
                probabilities = predictor.predict(latest)
                ranked = latest.assign(probability=probabilities).sort_values("probability", ascending=False).head(limit)
                items = [
                    {
                        "city_key": row.city_key,
                        "country": row.country,
                        "city": row.location_name,
                        "probability": round(float(row.probability) * 100, 1),
                        "temperature": round(float(row.temperature_celsius), 1),
                        "humidity": int(float(row.humidity)),
                        "cloud": int(float(row.cloud)),
                        "condition": str(row.condition_normalized),
                    }
                    for row in ranked.itertuples()
                ]
                self.send_json({"available": True, "model": predictor.name, "items": items})
                return
            if parsed.path.startswith("/figures/"):
                filename = Path(unquote(parsed.path.removeprefix("/figures/"))).name
                self.send_local_file(FIGURES_DIR / filename)
                return
            super().do_GET()
        except Exception as exc:  # pragma: no cover - helpful local error response
            print(f"[weather-system] request failed: {exc}")
            if parsed.path.startswith("/api/"):
                self.send_json({"error": str(exc)}, status=500)
            else:
                self.send_error(500, str(exc))

    @staticmethod
    def _query_text(query: dict[str, list[str]], key: str, default: str = "") -> str:
        return query.get(key, [default])[0]

    @staticmethod
    def _query_int(query: dict[str, list[str]], key: str, default: int) -> int:
        try:
            return int(query.get(key, [str(default)])[0])
        except (TypeError, ValueError):
            return default


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8090, type=int)
    parser.add_argument("--data", default=DEFAULT_DATA_PATH, type=Path)
    args = parser.parse_args()

    print(f"[weather-system] loading {args.data}")
    store = WeatherStore(args.data)
    server = ThreadingHTTPServer((args.host, args.port), WeatherRequestHandler)
    server.store = store
    server.session_tokens = set()
    print(f"[weather-system] {store.summary['project_title']}")
    print(f"[weather-system] open http://{args.host}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[weather-system] stopping")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
