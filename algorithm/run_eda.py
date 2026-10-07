#!/usr/bin/env python
"""Reusable exploratory analysis for the GlobalWeatherRepository dataset."""

from __future__ import annotations

import argparse
import json
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


REQUIRED_COLUMNS = {
    "country",
    "location_name",
    "latitude",
    "longitude",
    "last_updated_epoch",
    "last_updated",
    "temperature_celsius",
    "condition_text",
    "wind_mph",
    "wind_kph",
    "pressure_mb",
    "pressure_in",
    "precip_mm",
    "precip_in",
    "humidity",
    "cloud",
    "feels_like_celsius",
    "visibility_km",
    "uv_index",
    "gust_mph",
    "gust_kph",
    "air_quality_PM2.5",
    "air_quality_PM10",
    "air_quality_us-epa-index",
}

SELECTED_NUMERIC_COLUMNS = [
    "temperature_celsius",
    "feels_like_celsius",
    "humidity",
    "cloud",
    "pressure_mb",
    "wind_kph",
    "gust_kph",
    "precip_mm",
    "visibility_km",
    "uv_index",
    "air_quality_PM2.5",
    "air_quality_PM10",
]

UNIT_CHECKS = {
    "temperature (F from C)": (
        "temperature_fahrenheit",
        lambda frame: frame["temperature_celsius"] * 9 / 5 + 32,
    ),
    "wind (kph from mph)": (
        "wind_kph",
        lambda frame: frame["wind_mph"] * 1.609344,
    ),
    "gust (kph from mph)": (
        "gust_kph",
        lambda frame: frame["gust_mph"] * 1.609344,
    ),
    "pressure (in from mb)": (
        "pressure_in",
        lambda frame: frame["pressure_mb"] * 0.02952998,
    ),
    "precipitation (in from mm)": (
        "precip_in",
        lambda frame: frame["precip_mm"] * 0.0393701,
    ),
    "visibility (miles from km)": (
        "visibility_miles",
        lambda frame: frame["visibility_km"] * 0.621371,
    ),
}

DOMAIN_CHECKS = {
    "Temperature outside -60 to 60 C": lambda frame: frame["temperature_celsius"].lt(-60)
    | frame["temperature_celsius"].gt(60),
    "Pressure outside 850 to 1100 mb": lambda frame: frame["pressure_mb"].lt(850)
    | frame["pressure_mb"].gt(1100),
    "Humidity outside 0 to 100%": lambda frame: frame["humidity"].lt(0)
    | frame["humidity"].gt(100),
    "Cloud cover outside 0 to 100%": lambda frame: frame["cloud"].lt(0)
    | frame["cloud"].gt(100),
    "Negative precipitation": lambda frame: frame["precip_mm"].lt(0),
    "Negative visibility": lambda frame: frame["visibility_km"].lt(0),
    "Negative PM2.5": lambda frame: frame["air_quality_PM2.5"].lt(0),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Input weather CSV path")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Directory for figures and generated reports",
    )
    return parser.parse_args()


def configure_plotting() -> None:
    sns.set_theme(style="whitegrid", context="notebook")
    plt.rcParams.update(
        {
            "figure.dpi": 150,
            "savefig.dpi": 180,
            "axes.titleweight": "bold",
            "axes.labelsize": 10,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
        }
    )


def load_dataset(csv_path: Path) -> pd.DataFrame:
    frame = pd.read_csv(csv_path)
    missing = sorted(REQUIRED_COLUMNS.difference(frame.columns))
    if missing:
        raise ValueError(f"The CSV is missing required columns: {', '.join(missing)}")

    frame["observed_at_utc"] = pd.to_datetime(
        frame["last_updated_epoch"], unit="s", utc=True, errors="coerce"
    )
    frame["observed_at_local"] = pd.to_datetime(frame["last_updated"], errors="coerce")
    if frame["observed_at_utc"].isna().any() or frame["observed_at_local"].isna().any():
        raise ValueError("The dataset contains unparseable observation timestamps.")

    frame["utc_date"] = frame["observed_at_utc"].dt.tz_localize(None).dt.normalize()
    frame["local_month"] = frame["observed_at_local"].dt.to_period("M").dt.to_timestamp()
    frame["local_month_number"] = frame["observed_at_local"].dt.month
    frame["condition_normalized"] = (
        frame["condition_text"].astype(str).str.strip().str.lower().str.title()
    )
    return frame


def save_figure(figure: plt.Figure, figure_path: Path) -> None:
    figure.tight_layout()
    figure.savefig(figure_path, bbox_inches="tight")
    plt.close(figure)


def create_temporal_coverage_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    daily = frame.groupby("utc_date").agg(
        records=("country", "size"), locations=("location_name", "nunique")
    )
    figure, axes = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
    axes[0].plot(daily.index, daily["records"], color="#176B87", linewidth=1.1)
    axes[0].set_title("Daily observation volume")
    axes[0].set_ylabel("Records")
    axes[1].plot(daily.index, daily["locations"], color="#A45C40", linewidth=1.1)
    axes[1].set_title("Daily location coverage")
    axes[1].set_ylabel("Unique locations")
    axes[1].set_xlabel("UTC date")
    axes[1].xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    axes[1].xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    save_figure(figure, figures_dir / "01_temporal_coverage.png")


def create_temperature_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    daily = frame.groupby("utc_date")["temperature_celsius"].agg(
        mean="mean", p10=lambda values: values.quantile(0.1), p90=lambda values: values.quantile(0.9)
    )
    daily["rolling_mean"] = daily["mean"].rolling(14, min_periods=1).mean()
    figure, axis = plt.subplots(figsize=(12, 5.5))
    axis.fill_between(daily.index, daily["p10"], daily["p90"], color="#62B6CB", alpha=0.3, label="10th-90th percentile")
    axis.plot(daily.index, daily["mean"], color="#176B87", linewidth=0.8, alpha=0.65, label="Daily mean")
    axis.plot(daily.index, daily["rolling_mean"], color="#C84B31", linewidth=2, label="14-day mean")
    axis.set_title("Global temperature distribution over time")
    axis.set_xlabel("UTC date")
    axis.set_ylabel("Temperature (C)")
    axis.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    axis.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    axis.legend(frameon=False, loc="upper right")
    save_figure(figure, figures_dir / "02_global_temperature_trend.png")


def select_climate_locations(frame: pd.DataFrame, maximum: int = 10) -> list[str]:
    city_mean = frame.groupby("location_name")["temperature_celsius"].mean().sort_values()
    targets = np.linspace(0.05, 0.95, maximum)
    selected: list[str] = []
    for quantile in targets:
        target = city_mean.quantile(quantile)
        available = city_mean.drop(index=selected, errors="ignore")
        if available.empty:
            break
        selected.append((available - target).abs().idxmin())
    return selected


def create_climate_profiles_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    locations = select_climate_locations(frame)
    subset = frame[frame["location_name"].isin(locations)]
    monthly = (
        subset.groupby(["location_name", "local_month_number"])["temperature_celsius"]
        .mean()
        .reset_index()
    )
    figure, axis = plt.subplots(figsize=(12, 6))
    for location in locations:
        values = monthly[monthly["location_name"] == location]
        axis.plot(values["local_month_number"], values["temperature_celsius"], linewidth=1.6, marker="o", markersize=3, label=location)
    axis.set_xticks(range(1, 13))
    axis.set_xlabel("Local calendar month")
    axis.set_ylabel("Mean temperature (C)")
    axis.set_title("Seasonal temperature profiles across climate bands")
    axis.legend(ncol=2, fontsize=8, frameon=False, loc="upper center", bbox_to_anchor=(0.5, -0.18))
    save_figure(figure, figures_dir / "03_seasonal_city_profiles.png")


def create_condition_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    conditions = frame["condition_normalized"].value_counts().head(15).sort_values()
    figure, axis = plt.subplots(figsize=(10, 6.5))
    bars = axis.barh(conditions.index, conditions.values, color="#176B87")
    axis.bar_label(bars, labels=[f"{value:,}" for value in conditions.values], padding=3, fontsize=8)
    axis.set_title("Most frequently observed weather conditions")
    axis.set_xlabel("Records")
    axis.set_ylabel("Condition")
    save_figure(figure, figures_dir / "04_weather_conditions.png")


def create_air_quality_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    air = frame[["air_quality_PM2.5", "air_quality_PM10", "air_quality_us-epa-index"]].dropna()
    air = air[(air["air_quality_PM2.5"] > 0) & (air["air_quality_PM10"] > 0)]
    sample = air.sample(min(len(air), 25000), random_state=42)
    figure, axes = plt.subplots(1, 2, figsize=(13, 5.5))
    scatter = axes[0].scatter(
        sample["air_quality_PM2.5"],
        sample["air_quality_PM10"],
        c=sample["air_quality_us-epa-index"],
        cmap="viridis",
        s=7,
        alpha=0.3,
        edgecolors="none",
    )
    axes[0].set_xscale("log")
    axes[0].set_yscale("log")
    axes[0].set_title("PM2.5 and PM10 relationship")
    axes[0].set_xlabel("PM2.5")
    axes[0].set_ylabel("PM10")
    colorbar = figure.colorbar(scatter, ax=axes[0])
    colorbar.set_label("US EPA index")

    index_counts = air["air_quality_us-epa-index"].value_counts().sort_index()
    axes[1].bar(index_counts.index.astype(str), index_counts.values, color="#A45C40")
    axes[1].set_title("US EPA air-quality index distribution")
    axes[1].set_xlabel("US EPA index")
    axes[1].set_ylabel("Records")
    save_figure(figure, figures_dir / "05_air_quality.png")


def create_correlation_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    correlation = frame[SELECTED_NUMERIC_COLUMNS].corr(numeric_only=True)
    figure, axis = plt.subplots(figsize=(12, 10))
    sns.heatmap(
        correlation,
        ax=axis,
        cmap="vlag",
        vmin=-1,
        vmax=1,
        center=0,
        square=True,
        linewidths=0.25,
        cbar_kws={"label": "Pearson correlation"},
    )
    axis.set_title("Correlation structure of weather and air-quality features")
    axis.tick_params(axis="x", labelrotation=45, labelsize=8)
    axis.tick_params(axis="y", labelsize=8)
    save_figure(figure, figures_dir / "06_feature_correlation.png")


def create_geospatial_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    latest = (
        frame.sort_values("observed_at_utc")
        .groupby("location_name", as_index=False)
        .tail(1)
        .copy()
    )
    figure, axes = plt.subplots(1, 2, figsize=(14, 5.8), sharex=True, sharey=True)
    temperature = axes[0].scatter(
        latest["longitude"],
        latest["latitude"],
        c=latest["temperature_celsius"],
        cmap="coolwarm",
        s=45,
        alpha=0.85,
        edgecolors="white",
        linewidths=0.35,
    )
    axes[0].set_title("Latest city temperature")
    axes[0].set_xlabel("Longitude")
    axes[0].set_ylabel("Latitude")
    figure.colorbar(temperature, ax=axes[0], label="Temperature (C)")

    pm25 = axes[1].scatter(
        latest["longitude"],
        latest["latitude"],
        c=latest["air_quality_PM2.5"],
        cmap="magma_r",
        s=45,
        alpha=0.85,
        edgecolors="white",
        linewidths=0.35,
    )
    axes[1].set_title("Latest city PM2.5")
    axes[1].set_xlabel("Longitude")
    figure.colorbar(pm25, ax=axes[1], label="PM2.5")
    for axis in axes:
        axis.set_xlim(-185, 185)
        axis.set_ylim(-65, 85)
        axis.grid(alpha=0.25)
    save_figure(figure, figures_dir / "07_latest_geospatial_snapshot.png")


def create_humidity_precipitation_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    rain = frame[["humidity", "cloud", "precip_mm", "visibility_km", "wind_kph"]].dropna()
    sample = rain.sample(min(len(rain), 25000), random_state=42)
    figure, axes = plt.subplots(1, 2, figsize=(13, 5.5))
    scatter = axes[0].scatter(
        sample["humidity"],
        sample["cloud"],
        c=np.log1p(sample["precip_mm"]),
        cmap="Blues",
        s=7,
        alpha=0.3,
        edgecolors="none",
    )
    axes[0].set_title("Humidity, cloud cover, and rainfall")
    axes[0].set_xlabel("Humidity (%)")
    axes[0].set_ylabel("Cloud cover (%)")
    figure.colorbar(scatter, ax=axes[0], label="log(1 + precipitation mm)")

    axes[1].hist(frame["visibility_km"], bins=30, color="#176B87", alpha=0.85)
    axes[1].set_title("Visibility distribution")
    axes[1].set_xlabel("Visibility (km)")
    axes[1].set_ylabel("Records")
    save_figure(figure, figures_dir / "08_humidity_precipitation_visibility.png")


def calculate_domain_checks(frame: pd.DataFrame) -> dict[str, int]:
    return {label: int(check(frame).sum()) for label, check in DOMAIN_CHECKS.items()}


def create_data_quality_figure(frame: pd.DataFrame, figures_dir: Path) -> None:
    checks = calculate_domain_checks(frame)
    labels = list(checks)
    values = list(checks.values())
    colors = ["#C84B31" if value else "#5B8C5A" for value in values]
    figure, axis = plt.subplots(figsize=(10, 5.5))
    bars = axis.barh(labels, values, color=colors)
    axis.bar_label(bars, labels=[str(value) for value in values], padding=3)
    axis.set_title("Domain-rule data quality checks")
    axis.set_xlabel("Records outside rule")
    axis.set_ylabel("Rule")
    axis.set_xlim(0, max(values) + max(1, max(values) * 0.2))
    save_figure(figure, figures_dir / "09_domain_quality_checks.png")


def calculate_unit_checks(frame: pd.DataFrame) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {}
    for label, (actual_column, expected_formula) in UNIT_CHECKS.items():
        if actual_column not in frame.columns:
            continue
        error = (frame[actual_column] - expected_formula(frame)).abs()
        results[label] = {
            "mean_absolute_error": float(error.mean()),
            "max_absolute_error": float(error.max()),
        }
    return results


def calculate_gap_statistics(frame: pd.DataFrame) -> dict[str, float | int]:
    ordered = frame.sort_values(["location_name", "observed_at_utc"])
    gaps = ordered.groupby("location_name")["observed_at_utc"].diff().dt.total_seconds().div(3600)
    positive_gaps = gaps[gaps > 0]
    return {
        "median_hours": float(positive_gaps.median()),
        "p95_hours": float(positive_gaps.quantile(0.95)),
        "gaps_over_24_hours": int((positive_gaps > 24).sum()),
    }


def rounded(value: float) -> float:
    return round(float(value), 4)


def create_profile(frame: pd.DataFrame, source_path: Path) -> dict[str, object]:
    latest = frame.loc[frame["observed_at_utc"].idxmax(), "observed_at_utc"]
    earliest = frame.loc[frame["observed_at_utc"].idxmin(), "observed_at_utc"]
    profile = {
        "source_file": str(source_path),
        "rows": int(len(frame)),
        "columns": int(len(frame.columns) - 6),
        "countries": int(frame["country"].nunique()),
        "locations": int(frame["location_name"].nunique()),
        "time_coverage_utc": {"start": earliest.isoformat(), "end": latest.isoformat()},
        "missing_values": {column: int(value) for column, value in frame.isna().sum().items() if value},
        "duplicate_rows": int(frame.drop(columns=["observed_at_utc", "observed_at_local", "utc_date", "local_month", "local_month_number", "condition_normalized"]).duplicated().sum()),
        "top_conditions": {key: int(value) for key, value in frame["condition_normalized"].value_counts().head(15).items()},
        "temperature_celsius": {
            "mean": rounded(frame["temperature_celsius"].mean()),
            "median": rounded(frame["temperature_celsius"].median()),
            "min": rounded(frame["temperature_celsius"].min()),
            "max": rounded(frame["temperature_celsius"].max()),
        },
        "air_quality_pm25": {
            "median": rounded(frame["air_quality_PM2.5"].median()),
            "p95": rounded(frame["air_quality_PM2.5"].quantile(0.95)),
            "max": rounded(frame["air_quality_PM2.5"].max()),
        },
        "sampling_gaps": calculate_gap_statistics(frame),
        "unit_consistency": calculate_unit_checks(frame),
        "domain_checks": calculate_domain_checks(frame),
    }
    return profile


def create_report(profile: dict[str, object], output_path: Path) -> None:
    coverage = profile["time_coverage_utc"]
    temperature = profile["temperature_celsius"]
    pm25 = profile["air_quality_pm25"]
    gaps = profile["sampling_gaps"]
    unit_checks = profile["unit_consistency"]
    domain_checks = profile["domain_checks"]
    conditions = profile["top_conditions"]
    figure_rows = [
        ("01_temporal_coverage.png", "Daily record volume and active-location coverage"),
        ("02_global_temperature_trend.png", "Global daily temperature mean and 10th-90th percentile band"),
        ("03_seasonal_city_profiles.png", "Monthly temperature profiles sampled across climate bands"),
        ("04_weather_conditions.png", "Normalized weather-condition frequency"),
        ("05_air_quality.png", "PM2.5 / PM10 relationship and EPA-index frequency"),
        ("06_feature_correlation.png", "Correlation heatmap for weather and air-quality features"),
        ("07_latest_geospatial_snapshot.png", "Latest available temperature and PM2.5 coordinate snapshot"),
        ("08_humidity_precipitation_visibility.png", "Humidity, cloud cover, rainfall, and visibility patterns"),
        ("09_domain_quality_checks.png", "Counts of records outside physical plausibility rules"),
    ]
    checks = "\n".join(
        f"| {name} | {values['mean_absolute_error']:.6f} | {values['max_absolute_error']:.6f} |"
        for name, values in unit_checks.items()
    )
    top_conditions = "\n".join(
        f"| {condition} | {count:,} |" for condition, count in conditions.items()
    )
    domain_check_rows = "\n".join(
        f"| {name} | {count:,} |" for name, count in domain_checks.items()
    )
    figures = "\n".join(f"| `figures/{name}` | {purpose} |" for name, purpose in figure_rows)
    report = f"""# Global weather dataset EDA report

## Dataset profile

| Metric | Value |
| --- | ---: |
| Records | {profile['rows']:,} |
| Original fields | {profile['columns']} |
| Countries | {profile['countries']} |
| Locations | {profile['locations']} |
| UTC coverage start | {coverage['start']} |
| UTC coverage end | {coverage['end']} |
| Fully duplicated rows | {profile['duplicate_rows']:,} |
| Missing values | {sum(profile['missing_values'].values()) if profile['missing_values'] else 0} |

The source provides repeated current-weather snapshots, not a complete daily observation grid. Time-series results therefore aggregate the available observations, with the timestamp standardized to UTC for comparability.

## Core observations

- Temperature: mean {temperature['mean']} C, median {temperature['median']} C, range {temperature['min']} C to {temperature['max']} C.
- PM2.5: median {pm25['median']}, 95th percentile {pm25['p95']}, maximum {pm25['max']}.
- Sampling interval: median {gaps['median_hours']:.2f} hours; 95th percentile {gaps['p95_hours']:.2f} hours; gaps longer than 24 hours: {gaps['gaps_over_24_hours']:,}.
- Condition labels are normalized before aggregation, so variants such as `Partly Cloudy` and `Partly cloudy` are treated as one category.

## EDA figures

| File | Purpose |
| --- | --- |
{figures}

## Most frequent conditions

| Condition | Records |
| --- | ---: |
{top_conditions}

## Unit consistency checks

Each test compares a reported unit with the paired value computed from its source unit. Small residuals are expected from decimal rounding.

| Pair | Mean absolute error | Maximum absolute error |
| --- | ---: | ---: |
{checks}

## Domain-rule checks

These are screening rules rather than automatic deletion rules. Review flagged records before excluding them from analysis or a forecast target.

| Rule | Flagged records |
| --- | ---: |
{domain_check_rows}

## Reconstruction guidance

1. Keep `last_updated_epoch` as the canonical event time and derive UTC/local date parts in the data pipeline; do not group globally by the raw local timestamp.
2. Preserve `country`, `location_name`, `latitude`, `longitude`, and `timezone` as a location dimension. Use a composite city key because names can recur across countries.
3. Store physical base units only for modeling: Celsius, kph, mb, mm, km. Derive Fahrenheit, mph, inches, and miles at presentation time to avoid duplicated, collinear model features.
4. Normalize `condition_text` into a controlled vocabulary and retain the raw text for traceability. The source contains capitalization variants.
5. Treat air-quality fields as a separate feature group. Use robust scaling or log transforms for PM2.5, PM10, and gas concentrations because their distributions are strongly right-skewed.
6. Add per-location resampling and gap flags before forecasting. The collection frequency varies, so a missing time step is not automatically a zero-weather event.
7. Quarantine or cap domain-rule outliers before fitting. This source includes at least one 79.3 C temperature record, which is unlikely for a capital-city weather observation.
8. Replace these source paths through the `--input` argument when changing datasets; the script validates required columns before generating outputs.
"""
    output_path.write_text(textwrap.dedent(report), encoding="utf-8")


def main() -> None:
    args = parse_args()
    configure_plotting()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    figures_dir = args.output_dir / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)

    frame = load_dataset(args.input)
    create_temporal_coverage_figure(frame, figures_dir)
    create_temperature_figure(frame, figures_dir)
    create_climate_profiles_figure(frame, figures_dir)
    create_condition_figure(frame, figures_dir)
    create_air_quality_figure(frame, figures_dir)
    create_correlation_figure(frame, figures_dir)
    create_geospatial_figure(frame, figures_dir)
    create_humidity_precipitation_figure(frame, figures_dir)
    create_data_quality_figure(frame, figures_dir)

    profile = create_profile(frame, args.input)
    (args.output_dir / "data_profile.json").write_text(
        json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    create_report(profile, args.output_dir / "EDA_REPORT.md")
    print(json.dumps(profile, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
