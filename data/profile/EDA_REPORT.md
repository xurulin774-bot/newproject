# Global weather dataset EDA report

## Dataset profile

| Metric | Value |
| --- | ---: |
| Records | 166,254 |
| Original fields | 41 |
| Countries | 211 |
| Locations | 268 |
| UTC coverage start | 2024-05-16T08:45:00+00:00 |
| UTC coverage end | 2026-09-19T05:45:00+00:00 |
| Fully duplicated rows | 0 |
| Missing values | 0 |

The source provides repeated current-weather snapshots, not a complete daily observation grid. Time-series results therefore aggregate the available observations, with the timestamp standardized to UTC for comparability.

## Core observations

- Temperature: mean 21.465 C, median 23.7 C, range -29.8 C to 79.3 C.
- PM2.5: median 13.135, 95th percentile 73.075, maximum 1614.1.
- Sampling interval: median 24.00 hours; 95th percentile 24.50 hours; gaps longer than 24 hours: 44,645.
- Condition labels are normalized before aggregation, so variants such as `Partly Cloudy` and `Partly cloudy` are treated as one category.

## EDA figures

| File | Purpose |
| --- | --- |
| `figures/01_temporal_coverage.png` | Daily record volume and active-location coverage |
| `figures/02_global_temperature_trend.png` | Global daily temperature mean and 10th-90th percentile band |
| `figures/03_seasonal_city_profiles.png` | Monthly temperature profiles sampled across climate bands |
| `figures/04_weather_conditions.png` | Normalized weather-condition frequency |
| `figures/05_air_quality.png` | PM2.5 / PM10 relationship and EPA-index frequency |
| `figures/06_feature_correlation.png` | Correlation heatmap for weather and air-quality features |
| `figures/07_latest_geospatial_snapshot.png` | Latest available temperature and PM2.5 coordinate snapshot |
| `figures/08_humidity_precipitation_visibility.png` | Humidity, cloud cover, rainfall, and visibility patterns |
| `figures/09_domain_quality_checks.png` | Counts of records outside physical plausibility rules |

## Most frequent conditions

| Condition | Records |
| --- | ---: |
| Partly Cloudy | 54,206 |
| Sunny | 49,061 |
| Patchy Rain Nearby | 15,358 |
| Overcast | 9,315 |
| Clear | 9,260 |
| Mist | 6,639 |
| Light Rain | 4,768 |
| Light Rain Shower | 4,430 |
| Cloudy | 2,346 |
| Fog | 2,160 |
| Moderate Or Heavy Rain With Thunder | 1,211 |
| Moderate Rain | 1,136 |
| Patchy Light Rain With Thunder | 944 |
| Light Drizzle | 805 |
| Patchy Light Drizzle | 547 |

## Unit consistency checks

Each test compares a reported unit with the paired value computed from its source unit. Small residuals are expected from decimal rounding.

| Pair | Mean absolute error | Maximum absolute error |
| --- | ---: | ---: |
| temperature (F from C) | 0.034438 | 0.120000 |
| wind (kph from mph) | 0.047728 | 0.120179 |
| gust (kph from mph) | 0.044528 | 0.127834 |
| pressure (in from mb) | 0.004817 | 0.019640 |
| precipitation (in from mm) | 0.000662 | 0.005118 |
| visibility (miles from km) | 0.286254 | 0.994194 |

## Domain-rule checks

These are screening rules rather than automatic deletion rules. Review flagged records before excluding them from analysis or a forecast target.

| Rule | Flagged records |
| --- | ---: |
| Temperature outside -60 to 60 C | 1 |
| Pressure outside 850 to 1100 mb | 12 |
| Humidity outside 0 to 100% | 0 |
| Cloud cover outside 0 to 100% | 0 |
| Negative precipitation | 0 |
| Negative visibility | 0 |
| Negative PM2.5 | 0 |

## Reconstruction guidance

1. Keep `last_updated_epoch` as the canonical event time and derive UTC/local date parts in the data pipeline; do not group globally by the raw local timestamp.
2. Preserve `country`, `location_name`, `latitude`, `longitude`, and `timezone` as a location dimension. Use a composite city key because names can recur across countries.
3. Store physical base units only for modeling: Celsius, kph, mb, mm, km. Derive Fahrenheit, mph, inches, and miles at presentation time to avoid duplicated, collinear model features.
4. Normalize `condition_text` into a controlled vocabulary and retain the raw text for traceability. The source contains capitalization variants.
5. Treat air-quality fields as a separate feature group. Use robust scaling or log transforms for PM2.5, PM10, and gas concentrations because their distributions are strongly right-skewed.
6. Add per-location resampling and gap flags before forecasting. The collection frequency varies, so a missing time step is not automatically a zero-weather event.
7. Quarantine or cap domain-rule outliers before fitting. This source includes at least one 79.3 C temperature record, which is unlikely for a capital-city weather observation.
8. Replace these source paths through the `--input` argument when changing datasets; the script validates required columns before generating outputs.
