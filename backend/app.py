#!/usr/bin/env python
"""Local web service for the global weather analysis and recommendation project."""

from __future__ import annotations

import argparse
import json
import math
import mimetypes
import secrets
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
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

        frame = pd.read_csv(data_path)
        missing = sorted(REQUIRED_COLUMNS.difference(frame.columns))
        if missing:
            raise ValueError(f"The dataset is missing required columns: {', '.join(missing)}")

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


class WeatherRequestHandler(SimpleHTTPRequestHandler):
    """Serve the dashboard and the JSON endpoints from one local process."""

    def __init__(self, *args: Any, store: WeatherStore, **kwargs: Any) -> None:
        self.store = store
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        # Keep the terminal readable while still reporting the request status.
        print(f"[weather-system] {self.address_string()} - {format % args}")

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
                self.send_json({"status": "ok", "project": self.store.summary["project_title"]})
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
                self.send_json(self.store.summary)
                return
            if parsed.path == "/api/trend":
                self.send_json(
                    {"items": self.store.trend(self._query_int(query, "days", 180))}
                )
                return
            if parsed.path == "/api/conditions":
                self.send_json(
                    {
                        "items": self.store.condition_distribution(
                            self._query_int(query, "limit", 10)
                        )
                    }
                )
                return
            if parsed.path == "/api/map":
                self.send_json({"items": self.store.map_points()})
                return
            if parsed.path == "/api/cities":
                self.send_json(
                    {
                        "items": self.store.search_cities(
                            self._query_text(query, "q"),
                            self._query_int(query, "limit", 30),
                        )
                    }
                )
                return
            if parsed.path == "/api/recommend":
                self.send_json(
                    {
                        "items": self.store.recommend(
                            self._query_text(query, "mode", "comfort"),
                            self._query_text(query, "q"),
                            self._query_int(query, "limit", 8),
                        )
                    }
                )
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
    handler = partial(WeatherRequestHandler, store=store)
    server = ThreadingHTTPServer((args.host, args.port), handler)
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
