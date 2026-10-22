from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, default=ROOT / "algorithm/ml_models/rain_model.joblib")
    parser.add_argument("--meta", type=Path, default=ROOT / "algorithm/ml_models/rain_model_meta.json")
    parser.add_argument("--payload", type=Path)
    parser.add_argument("--dataset", type=Path, default=ROOT / "data/raw/GlobalWeatherRepository.csv")
    parser.add_argument("--city-key", default="")
    parser.add_argument("--rank", type=int, default=0)
    args = parser.parse_args()
    if not args.model.is_file() or not args.meta.is_file():
        print(json.dumps({"available": False, "message": "Rain model artifact is not available"}))
        return
    model = joblib.load(args.model)
    metadata = json.loads(args.meta.read_text(encoding="utf-8"))
    features = metadata["features"]
    medians = metadata["medians"]
    frame: pd.DataFrame
    records: list[dict] = []
    if args.payload:
        values = json.loads(args.payload.read_text(encoding="utf-8"))
        month = float(values.get("month") or pd.Timestamp.now().month)
        temperature = float(values.get("temperature", medians["temperature_celsius"]))
        humidity = float(values.get("humidity", medians["humidity"]))
        cloud = float(values.get("cloud", medians["cloud"]))
        wind = float(values.get("wind", medians["wind_kph"]))
        gust = float(values.get("gust", wind * 1.4))
        feels = float(values.get("feels_like", temperature))
        row = {
            "temperature_celsius": temperature, "feels_like_celsius": feels,
            "feels_temp_diff": feels - temperature, "humidity": humidity, "cloud": cloud,
            "dew_spread_proxy": humidity * cloud / 100.0,
            "pressure_mb": float(values.get("pressure", medians["pressure_mb"])),
            "wind_kph": wind, "gust_kph": gust,
            "gust_wind_ratio": gust / wind if wind else medians["gust_wind_ratio"],
            "visibility_km": float(values.get("visibility", medians["visibility_km"])),
            "uv_index": float(values.get("uv", medians["uv_index"])),
            "month_sin": np.sin(2 * np.pi * month / 12), "month_cos": np.cos(2 * np.pi * month / 12),
            "air_quality_PM2.5": float(values.get("pm25", medians["air_quality_PM2.5"])),
            "air_quality_PM10": float(values.get("pm10", medians["air_quality_PM10"])),
            "air_quality_Ozone": float(values.get("ozone", medians["air_quality_Ozone"])),
        }
        frame = pd.DataFrame([row])
        records.append({"city": values.get("city", "Manual input"), "country": values.get("country", ""), **row})
        features_frame = frame[features].fillna(pd.Series(medians))
        probability = float(model.predict_proba(features_frame)[:, 1][0] * 100)
        item = records[0]
        item["inputs"] = {name: float(features_frame.iloc[0][name]) for name in features}
        item["drivers"] = [{"feature": name, "value": round(value, 2),
                            "z": round((value - medians[name]) / max(abs(medians[name]), 1), 2)}
                           for name, value in item["inputs"].items()]
        item["probability"] = round(probability, 1)
        print(json.dumps({"available": True, "model": metadata["best_name"], **item}))
        return
    else:
        from data_cleaning import clean_weather_frame
        source = pd.read_csv(args.dataset)
        source, _ = clean_weather_frame(source)
        source["observed_at_utc"] = pd.to_datetime(source["last_updated_epoch"], unit="s", utc=True, errors="coerce")
        source = source.sort_values("observed_at_utc").groupby(["country", "location_name"], as_index=False).tail(1)
        source["month"] = source["observed_at_utc"].dt.month
        source["feels_temp_diff"] = source["feels_like_celsius"] - source["temperature_celsius"]
        source["gust_wind_ratio"] = source["gust_kph"] / source["wind_kph"].replace(0, np.nan)
        source["dew_spread_proxy"] = source["humidity"] * source["cloud"] / 100.0
        source["month_sin"] = np.sin(2 * np.pi * source["month"] / 12)
        source["month_cos"] = np.cos(2 * np.pi * source["month"] / 12)
        if args.city_key:
            country, _, city = args.city_key.partition(" | ")
            source = source[(source["country"] == country) & (source["location_name"] == city)]
        if source.empty:
            print(json.dumps({"available": False, "message": "City not found"}))
            return
        features_frame = source[features].fillna(pd.Series(medians))
        probabilities = model.predict_proba(features_frame)[:, 1] * 100
        records = []
        for (_, item), probability in zip(source.iterrows(), probabilities):
            records.append({"city": item["location_name"], "country": item["country"],
                            "condition": item["condition_text"], "temperature": float(item["temperature_celsius"]),
                            "humidity": int(item["humidity"]), "cloud": int(item["cloud"]),
                            "probability": round(float(probability), 1)})
        if args.rank:
            records.sort(key=lambda item: item["probability"], reverse=True)
            print(json.dumps({"available": True, "model": metadata["best_name"], "items": records[:args.rank]}))
            return
        item = records[0]
        frame = features_frame
        probability = float(probabilities[0])
        row = {name: float(frame.iloc[0][name]) for name in features}
        item["inputs"] = row
        item["drivers"] = [{"feature": name, "value": round(value, 2), "z": round((value - medians[name]) / max(abs(medians[name]), 1), 2)}
                           for name, value in row.items()]
        item["probability"] = round(probability, 1)
        print(json.dumps({"available": True, "model": metadata["best_name"], **item}))


if __name__ == "__main__":
    main()
