package com.weatherlab.weather.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.text.Normalizer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Random;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.ToDoubleFunction;
import java.util.stream.Collectors;

@Service
public class WeatherAnalyticsService {
    private final WeatherDataService dataService;
    private final ObjectMapper objectMapper;
    private final Path profileDir;
    private final AtomicReference<Cache> cacheRef = new AtomicReference<>();

    public WeatherAnalyticsService(WeatherDataService dataService, ObjectMapper objectMapper,
                                   @Value("${weather.profile-dir:./data/profile}") String profileDir) {
        this.dataService = dataService;
        this.objectMapper = objectMapper;
        this.profileDir = Path.of(profileDir).toAbsolutePath().normalize();
    }

    public Map<String, Object> summary() {
        Cache cache = cache();
        DatasetSnapshot snapshot = cache.snapshot;
        double[] temperatures = snapshot.records().stream().mapToDouble(WeatherRecord::temperature)
                .filter(Double::isFinite).sorted().toArray();
        double[] pm25 = snapshot.records().stream().mapToDouble(WeatherRecord::pm25)
                .filter(Double::isFinite).sorted().toArray();
        long countries = snapshot.records().stream().map(WeatherRecord::country).distinct().count();
        long cityNames = snapshot.records().stream().map(WeatherRecord::city).distinct().count();
        long cityPairs = cache.latest.size();
        LocalDate start = snapshot.records().stream().map(WeatherRecord::utcDate).min(LocalDate::compareTo).orElse(LocalDate.now());
        LocalDate end = snapshot.records().stream().map(WeatherRecord::utcDate).max(LocalDate::compareTo).orElse(LocalDate.now());
        double average = Arrays.stream(temperatures).average().orElse(0);

        Map<String, Long> quality = qualityRules(snapshot.records());
        Map<String, Object> cleaning = cleaning(snapshot);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("project_title", "Global Weather Analytics and Recommendation System");
        result.put("source_file", snapshot.path().getFileName().toString());
        result.put("records", snapshot.records().size());
        result.put("fields", snapshot.fields());
        result.put("countries", countries);
        result.put("locations", cityNames);
        result.put("city_country_pairs", cityPairs);
        result.put("time_start", start.atStartOfDay().toString());
        result.put("time_end", end.atTime(23, 59).toString());
        result.put("temperature_mean", round(average, 1));
        result.put("temperature_median", round(quantile(temperatures, .5), 1));
        result.put("air_quality_pm25_median", round(quantile(pm25, .5), 1));
        result.put("duplicate_rows", snapshot.duplicateRows());
        result.put("cleaning", cleaning);
        result.put("quality_rules", quality);
        return result;
    }

    public Map<String, Object> cleaning() {
        return Map.of("report", cleaning(cache().snapshot));
    }

    private Map<String, Object> cleaning(DatasetSnapshot snapshot) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("rows_before", snapshot.rowsBefore());
        details.put("rows_after", snapshot.records().size());
        details.put("rows_removed", snapshot.rowsRemoved());
        details.put("junk_removed", 0);
        details.put("mismatch_removed", 0);
        details.put("country_rename_count", 0);
        details.put("label_merge_count", 0);
        details.put("cities_before", snapshot.records().stream().map(WeatherRecord::city).distinct().count());
        details.put("cities_after", snapshot.records().stream().map(WeatherRecord::city).distinct().count());
        details.put("countries_before", snapshot.records().stream().map(WeatherRecord::country).distinct().count());
        details.put("countries_after", snapshot.records().stream().map(WeatherRecord::country).distinct().count());
        details.put("detail", Map.of("dropped_mismatch", List.of(), "dropped_junk_keys", List.of(),
                "rejected_rows", snapshot.rejectedRows().stream().limit(100).toList()));
        return details;
    }

    private Map<String, Long> qualityRules(List<WeatherRecord> records) {
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("Temperature outside -60 to 60 C", records.stream().filter(r -> r.temperature() < -60 || r.temperature() > 60).count());
        result.put("Pressure outside 850 to 1100 mb", records.stream().filter(r -> r.pressureMb() < 850 || r.pressureMb() > 1100).count());
        result.put("Humidity outside 0 to 100%", records.stream().filter(r -> r.humidity() < 0 || r.humidity() > 100).count());
        result.put("Cloud cover outside 0 to 100%", records.stream().filter(r -> r.cloud() < 0 || r.cloud() > 100).count());
        result.put("Negative precipitation", records.stream().filter(r -> r.precipitation() < 0).count());
        result.put("Negative visibility", records.stream().filter(r -> r.visibilityKm() < 0).count());
        result.put("Negative PM2.5", records.stream().filter(r -> r.pm25() < 0).count());
        return result;
    }

    public Map<String, Object> trend(int requestedDays) {
        int days = clamp(requestedDays, 30, 730);
        List<Map<String, Object>> all = cache().daily.stream().map(day -> Map.<String, Object>of(
                "date", day.date.toString(), "temperature_mean", round(day.mean, 2),
                "temperature_p10", round(day.p10, 2), "temperature_p90", round(day.p90, 2),
                "humidity_mean", round(day.humidity, 2), "locations", day.locations, "records", day.records)).toList();
        return Map.of("items", all.subList(Math.max(0, all.size() - days), all.size()));
    }

    public Map<String, Object> conditions(int limit) {
        List<Map<String, Object>> items = cache().conditionCounts.entrySet().stream().limit(clamp(limit, 3, 20))
                .map(entry -> condition(entry.getKey(), entry.getValue(), cache().snapshot.records().size())).toList();
        return Map.of("items", items);
    }

    public Map<String, Object> map() {
        return Map.of("items", cache().latest.stream().map(this::latestRecord).toList());
    }

    public Map<String, Object> cities(String query, int limit) {
        String needle = searchText(query);
        List<Map<String, Object>> items = cache().latest.stream()
                .filter(record -> needle.isBlank() || searchText(record.city()).contains(needle)
                        || searchText(record.country()).contains(needle))
                .sorted(Comparator.comparing(WeatherRecord::country).thenComparing(WeatherRecord::city))
                .limit(clamp(limit, 1, 100)).map(this::latestRecord).toList();
        return Map.of("items", items);
    }

    public Map<String, Object> recommend(String mode, String query, int limit) {
        String needle = searchText(query);
        String selectedMode = List.of("comfort", "clean_air", "warm_sunny", "cool_escape").contains(mode) ? mode : "comfort";
        List<Map<String, Object>> items = cache().latest.stream()
                .filter(record -> needle.isBlank() || searchText(record.city()).contains(needle)
                        || searchText(record.country()).contains(needle))
                .map(record -> recommendation(record, selectedMode))
                .sorted(Comparator.comparingDouble((Map<String, Object> row) -> ((Number) row.get("score")).doubleValue()).reversed())
                .limit(clamp(limit, 1, 30)).toList();
        return Map.of("items", items);
    }

    private Map<String, Object> recommendation(WeatherRecord record, String mode) {
        boolean badCondition = rainy(record.condition());
        double target = mode.equals("warm_sunny") ? 25 : mode.equals("cool_escape") ? 15 : 23;
        double temp = targetScore(record.temperature(), target, mode.equals("comfort") ? 18 : 15);
        double humidity = targetScore(record.humidity(), 55, 55);
        double rain = inverseScore(record.precipitation(), 12);
        double air = inverseScore(record.pm25(), 100);
        double visibility = clamp01(record.visibilityKm() / 15.0);
        double cloud = inverseScore(record.cloud(), 100);
        Map<String, Double> weights = switch (mode) {
            case "clean_air" -> Map.of("temperature", .10, "rain", .12, "air", .45, "visibility", .20, "cloud", .03, "condition", .10);
            case "warm_sunny" -> Map.of("temperature", .30, "humidity", .08, "rain", .20, "air", .10, "visibility", .12, "cloud", .12, "condition", .08);
            case "cool_escape" -> Map.of("temperature", .35, "humidity", .10, "rain", .16, "air", .20, "visibility", .10, "condition", .09);
            default -> Map.of("temperature", .34, "humidity", .14, "rain", .18, "air", .15, "visibility", .10, "condition", .09);
        };
        double score = temp * weights.getOrDefault("temperature", 0.0)
                + humidity * weights.getOrDefault("humidity", 0.0)
                + rain * weights.getOrDefault("rain", 0.0)
                + air * weights.getOrDefault("air", 0.0)
                + visibility * weights.getOrDefault("visibility", 0.0)
                + cloud * weights.getOrDefault("cloud", 0.0)
                + (badCondition ? 0 : 1) * weights.getOrDefault("condition", 0.0);
        List<String> reasons = new ArrayList<>();
        if (temp > .7) reasons.add("气温舒适");
        if (air > .7) reasons.add("空气质量较好");
        if (rain > .75) reasons.add("降水较少");
        if (visibility > .7) reasons.add("能见度良好");
        Map<String, Object> row = latestRecord(record);
        row.put("score", round(score * 100, 1));
        row.put("reason", reasons.isEmpty() ? "整体天气条件均衡" : String.join("；", reasons.subList(0, Math.min(3, reasons.size()))));
        return row;
    }

    public Map<String, Object> similar(String key, int limit) {
        CityClimate target = requireCity(key);
        double[] targetVector = standardizedVector(target);
        List<Map<String, Object>> items = cache().climates.values().stream().filter(row -> !row.key.equals(key))
                .map(row -> {
                    double similarity = cosine(targetVector, standardizedVector(row));
                    Map<String, Object> profile = cityProfile(row);
                    profile.put("similarity", round(similarity * 100, 1));
                    return profile;
                }).sorted(Comparator.comparingDouble((Map<String, Object> row) -> ((Number) row.get("similarity")).doubleValue()).reversed())
                .limit(clamp(limit, 1, 20)).toList();
        return Map.of("target", cityProfile(target), "items", items);
    }

    public Map<String, Object> plan(int month, String mode, int limit) {
        int selectedMonth = clamp(month, 1, 12) - 1;
        List<Map<String, Object>> items = cache().climates.values().stream()
                .filter(city -> city.monthCount[selectedMonth] > 0)
                .map(city -> {
                    double temp = city.temp[selectedMonth] / city.monthCount[selectedMonth];
                    double humidity = city.humidity[selectedMonth] / city.monthCount[selectedMonth];
                    double precip = city.precipitation[selectedMonth] / city.monthCount[selectedMonth];
                    double pm25 = city.monthPm25[selectedMonth] / city.monthCount[selectedMonth];
                    double wetShare = city.monthCount[selectedMonth] == 0 ? 0 : city.rainCount[selectedMonth] / city.monthCount[selectedMonth];
                    double target = mode.equals("warm_sunny") ? 25 : mode.equals("cool_escape") ? 15 : 23;
                    double score = .38 * targetScore(temp, target, 12) + .16 * targetScore(humidity, 55, 40)
                            + .18 * inverseScore(precip, 10) + .16 * inverseScore(pm25, 100) + .12 * (1 - wetShare);
                    String reason = tempScoreText(temp, target) + "；同期降水 " + round(precip, 1) + " mm";
                    return Map.<String, Object>of("city_key", city.key, "country", city.latest.country(), "city", city.latest.city(),
                            "temperature", round(temp, 1), "humidity", round(humidity, 0), "precipitation", round(precip, 1),
                            "pm25", round(pm25, 1), "score", round(score * 100, 1), "reason", reason);
                }).sorted(Comparator.comparingDouble((Map<String, Object> row) -> ((Number) row.get("score")).doubleValue()).reversed())
                .limit(clamp(limit, 1, 20)).toList();
        return Map.of("month", selectedMonth + 1, "items", items);
    }

    public Map<String, Object> compare(List<String> keys) {
        return Map.of("items", keys.stream().filter(key -> cache().climates.containsKey(key)).limit(4)
                .map(key -> cityProfile(cache().climates.get(key))).toList());
    }

    public Map<String, Object> forecast(String key, int days) {
        int horizon = clamp(days, 7, 90);
        List<WeatherRecord> selected;
        String target;
        if (key == null || key.isBlank()) {
            selected = cache().snapshot.records();
            target = "Global average";
        } else {
            CityClimate climate = requireCity(key);
            selected = cache().byCity.get(key);
            target = climate.latest.city();
        }
        Map<LocalDate, List<Double>> grouped = new TreeMap<>();
        selected.forEach(record -> grouped.computeIfAbsent(record.utcDate(), ignored -> new ArrayList<>()).add(record.temperature()));
        List<Daily> daily = grouped.entrySet().stream().map(entry -> Daily.from(entry.getKey(), entry.getValue(), 0, 0)).toList();
        List<Daily> smoothed = new ArrayList<>();
        for (int i = 9; i < daily.size(); i++) {
            int start = Math.max(0, i - 29);
            double mean = daily.subList(start, i + 1).stream().mapToDouble(item -> item.mean).average().orElse(0);
            smoothed.add(new Daily(daily.get(i).date, mean, mean, mean, mean, 0, i - start + 1));
        }
        if (smoothed.size() < 60) throw new IllegalArgumentException("Not enough daily observations to fit a trend");
        List<Daily> fit = smoothed.subList(Math.max(0, smoothed.size() - 180), smoothed.size());
        double meanX = (fit.size() - 1) / 2.0;
        double meanY = fit.stream().mapToDouble(item -> item.mean).average().orElse(0);
        double numerator = 0;
        double denominator = 0;
        for (int i = 0; i < fit.size(); i++) {
            numerator += (i - meanX) * (fit.get(i).mean - meanY);
            denominator += (i - meanX) * (i - meanX);
        }
        double slope = denominator == 0 ? 0 : numerator / denominator;
        double intercept = meanY - slope * meanX;
        double residualVariance = 0;
        double absoluteError = 0;
        double totalVariance = 0;
        for (int i = 0; i < fit.size(); i++) {
            double residual = fit.get(i).mean - (intercept + slope * i);
            residualVariance += residual * residual;
            absoluteError += Math.abs(residual);
            totalVariance += Math.pow(fit.get(i).mean - meanY, 2);
        }
        double residualStd = Math.sqrt(residualVariance / fit.size());
        LocalDate lastDate = smoothed.get(smoothed.size() - 1).date;
        List<Map<String, Object>> history = smoothed.stream().skip(Math.max(0, smoothed.size() - 180L))
                .map(item -> Map.<String, Object>of("date", item.date.toString(), "value", round(item.mean, 2))).toList();
        List<Map<String, Object>> future = new ArrayList<>();
        for (int i = 0; i < horizon; i++) {
            double value = intercept + slope * (fit.size() + i);
            future.add(Map.of("date", lastDate.plusDays(i + 1L).toString(), "value", round(value, 2),
                    "lower", round(value - 2 * residualStd, 2), "upper", round(value + 2 * residualStd, 2)));
        }
        Map<String, Object> stats = Map.of("slope_per_year", round(slope * 365, 2),
                "r2", round(totalVariance == 0 ? 0 : 1 - residualVariance / totalVariance, 3),
                "mae", round(absoluteError / fit.size(), 2), "window_days", 30, "fit_days", fit.size());
        return Map.of("target", target, "city_key", key == null ? "" : key, "history", history,
                "forecast", future, "stats", stats);
    }

    public Map<String, Object> clusters(int requestedK) {
        int k = clamp(requestedK, 2, 8);
        List<CityClimate> cities = new ArrayList<>(cache().climates.values());
        if (cities.size() < k) k = cities.size();
        double[][] vectors = cities.stream().map(this::standardizedVector).toArray(double[][]::new);
        int[] labels = kmeans(vectors, k);
        List<Map<String, Object>> profiles = new ArrayList<>();
        Map<Integer, Integer> clusterSizes = new HashMap<>();
        Map<Integer, double[]> summary = new HashMap<>();
        for (int i = 0; i < cities.size(); i++) {
            int label = labels[i];
            clusterSizes.merge(label, 1, Integer::sum);
            double[] sums = summary.computeIfAbsent(label, ignored -> new double[4]);
            CityClimate city = cities.get(i);
            sums[0] += city.mean(city.temp);
            sums[1] += city.mean(city.humidity);
            sums[2] += city.mean(city.precipitation);
            sums[3] += city.annualPm25();
        }
        List<Integer> orderedLabels = clusterSizes.keySet().stream()
                .sorted(Comparator.comparingDouble(label -> summary.get(label)[0] / clusterSizes.get(label))).toList();
        Map<Integer, Integer> remap = new HashMap<>();
        for (int i = 0; i < orderedLabels.size(); i++) {
            int source = orderedLabels.get(i);
            remap.put(source, i + 1);
            double[] sums = summary.get(source);
            int count = clusterSizes.get(source);
            profiles.add(Map.of("cluster", i + 1, "count", count, "mean_temp", round(sums[0] / count, 1),
                    "mean_humidity", round(sums[1] / count, 1), "mean_precipitation", round(sums[2] / count, 1),
                    "mean_pm25", round(sums[3] / count, 1), "inertia_share", 0));
        }
        List<Map<String, Object>> points = new ArrayList<>();
        for (int i = 0; i < cities.size(); i++) {
            WeatherRecord record = cities.get(i).latest;
            points.add(Map.of("city_key", cities.get(i).key, "country", record.country(), "city", record.city(),
                    "latitude", record.latitude(), "longitude", record.longitude(), "cluster", remap.get(labels[i])));
        }
        return Map.of("k", profiles.size(), "inertia", 0, "profiles", profiles, "points", points);
    }

    public Map<String, Object> advice(String key, Integer month) {
        CityClimate city = requireCity(key);
        WeatherRecord latest = city.latest;
        int selectedMonth = month == null ? latest.month() : clamp(month, 1, 12);
        int index = selectedMonth - 1;
        double temperature = month == null ? latest.temperature() : city.monthMean(city.temp, index);
        double humidity = month == null ? latest.humidity() : city.monthMean(city.humidity, index);
        double precipitation = month == null ? latest.precipitation() : city.monthMean(city.precipitation, index);
        double pm25 = month == null ? latest.pm25() : city.monthMean(city.monthPm25, index);
        double uv = month == null ? latest.uv() : city.monthMean(city.monthUv, index);
        double rainProbability = month == null ? (latest.precipitation() > .1 ? 60 : 15)
                : city.monthCount[index] == 0 ? 0 : city.rainCount[index] * 100 / city.monthCount[index];
        List<Map<String, Object>> indices = lifeIndices(temperature, humidity, precipitation, pm25, uv, rainProbability);
        double score = 100 * (.35 * targetScore(temperature, 23, 18) + .15 * targetScore(humidity, 55, 40)
                + .20 * inverseScore(precipitation, 10) + .18 * inverseScore(pm25, 100)
                + .12 * (1 - Math.min(100, rainProbability) / 100));
        String verdict = score >= 75 ? "非常适合出行" : score >= 60 ? "适合出行"
                : score >= 45 ? "出行前请做好准备" : "建议安排室内活动";
        String mode = month == null ? "now" : "month";
        String summary = verdict + "。" + indices.stream().map(row -> Objects.toString(row.get("text"), "")).collect(Collectors.joining(" "));
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("temperature", round(temperature, 1)); facts.put("humidity", round(humidity, 0));
        facts.put("precipitation", round(precipitation, 1)); facts.put("pm25", round(pm25, 1));
        facts.put("uv", round(uv, 1)); facts.put("rain_probability", round(rainProbability, 1));
        facts.put("condition", month == null ? latest.condition() : null); facts.put("deviation", null);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("city_key", key);
        result.put("city", latest.city());
        result.put("country", latest.country());
        result.put("mode", mode);
        result.put("month", month == null ? 0 : selectedMonth);
        result.put("score", round(score, 1));
        result.put("verdict", verdict);
        result.put("indices", indices);
        result.put("facts", facts);
        result.put("summary", summary);
        result.put("monthly_temp", city.monthlyMeans(city.temp));
        return result;
    }

    private List<Map<String, Object>> lifeIndices(double temperature, double humidity, double precipitation,
                                                   double pm25, double uv, double rainProbability) {
        String clothing = temperature >= 28 ? "炎热" : temperature >= 22 ? "偏暖" : temperature >= 15 ? "舒适" : temperature >= 5 ? "偏凉" : "寒冷";
        String clothingText = temperature >= 28 ? "天气较热，建议穿着轻薄并及时补水。" : temperature >= 15 ? "气温适中，可准备一件轻薄外套。" : "气温较低，外出时注意保暖。";
        String umbrella = rainProbability >= 60 ? "建议携带雨具" : rainProbability >= 30 ? "可随身带伞" : "无需携带雨具";
        String sport = pm25 <= 35 && rainProbability < 50 && temperature >= -5 && temperature <= 32 ? "适宜" : pm25 <= 115 ? "一般" : "不宜";
        String carwash = rainProbability >= 50 ? "不建议" : rainProbability >= 20 ? "稍后再看" : "适宜";
        String sunscreen = uv >= 8 ? "加强防晒" : uv >= 5 ? "建议防晒" : "紫外线较弱";
        String air = pm25 <= 35 ? "优" : pm25 <= 75 ? "良" : pm25 <= 115 ? "敏感人群注意" : "较差";
        return List.of(index("clothing", "穿衣建议", clothing, "ok", clothingText),
                index("umbrella", "雨具建议", umbrella, rainProbability >= 60 ? "issue" : "ok", "预计降水概率 " + round(rainProbability, 0) + "%。"),
                index("sport", "户外活动", sport, sport.equals("适宜") ? "ok" : "warn", "请结合空气质量和气温安排户外活动。"),
                index("carwash", "洗车指数", carwash, carwash.equals("适宜") ? "ok" : "warn", "根据降水量和降雨概率综合判断。"),
                index("sunscreen", "防晒指数", sunscreen, uv >= 8 ? "issue" : uv >= 5 ? "warn" : "ok", "紫外线指数 " + round(uv, 1) + "。"),
                index("air", "空气质量", air, pm25 <= 75 ? "ok" : "warn", "PM2.5 当前值 " + round(pm25, 1) + " μg/m³。"));
    }

    private Map<String, Object> index(String key, String name, String level, String tone, String text) {
        return Map.of("key", key, "name", name, "level", level, "tone", tone, "text", text);
    }

    public Map<String, Object> eda() {
        Cache cache = cache();
        List<Map<String, Object>> temporal = cache.daily.stream().map(day -> Map.<String, Object>of(
                "date", day.date.toString(), "records", day.records, "locations", day.locations)).toList();
        List<Map<String, Object>> tempTrend = cache.daily.stream().map(day -> Map.<String, Object>of(
                "date", day.date.toString(), "mean", round(day.mean, 2), "p10", round(day.p10, 2), "p90", round(day.p90, 2))).toList();
        List<Map<String, Object>> seasonal = cache.climates.values().stream().sorted(Comparator.comparingInt((CityClimate row) -> row.count).reversed())
                .limit(8).map(city -> Map.<String, Object>of("city", city.latest.city(), "country", city.latest.country(), "months", city.monthlyMeans(city.temp))).toList();
        List<Map<String, Object>> conditions = cache.conditionCounts.entrySet().stream().limit(12)
                .map(entry -> condition(entry.getKey(), entry.getValue(), cache.snapshot.records().size())).toList();
        List<Map<String, Object>> scatter = cache.latest.stream().map(record -> Map.<String, Object>of(
                "pm25", round(record.pm25(), 1), "pm10", round(record.pm10(), 1))).toList();
        List<Map<String, Object>> epa = cache.latest.stream().collect(Collectors.groupingBy(r -> (int) r.epaIndex(), TreeMap::new, Collectors.counting()))
                .entrySet().stream().map(entry -> Map.<String, Object>of("index", "指数等级 " + entry.getKey(), "count", entry.getValue())).toList();
        String[] labels = {"气温", "体感温度", "湿度", "风速", "气压", "降水量", "能见度", "云量", "紫外线指数", "PM2.5", "PM10"};
        ToDoubleFunction<WeatherRecord>[] selectors = selectors();
        double[][] corr = correlation(cache.snapshot.records(), selectors);
        List<List<Double>> matrix = Arrays.stream(corr).map(row -> Arrays.stream(row).mapToObj(value -> round(value, 3)).toList()).toList();
        List<Map<String, Object>> comfort = new ArrayList<>();
        for (int start = 0; start < 100; start += 10) {
            final int low = start;
            int high = start + 10;
            List<WeatherRecord> group = cache.latest.stream().filter(r -> r.humidity() >= low && (high == 100 ? r.humidity() <= high : r.humidity() < high)).toList();
            comfort.add(Map.of("bin", start + "-" + high + "%", "visibility", average(group, WeatherRecord::visibilityKm),
                    "precipitation", average(group, WeatherRecord::precipitation), "cities", group.size()));
        }
        List<Map<String, Object>> profiles = clusters(5).get("profiles") instanceof List<?> list
                ? (List<Map<String, Object>>) list : List.of();
        return Map.of("temporal", temporal, "temperature_trend", tempTrend, "seasonal_profiles", seasonal,
                "conditions", conditions, "air_quality", Map.of("scatter", scatter, "epa", epa),
                "correlation", Map.of("fields", List.of(labels), "matrix", matrix),
                "geospatial", cache.latest.stream().map(this::latestRecord).toList(), "comfort", comfort,
                "domain_checks", qualityRules(cache.snapshot.records()),
                "clusters", Map.of("k", profiles.size(), "profiles", profiles, "points", clusters(5).get("points")));
    }

    public Map<String, Object> ml() {
        Path path = profileDir.resolve("ml_metrics.json");
        if (!Files.isRegularFile(path)) return Map.of("available", false, "message", "Model metrics are not available yet. Run algorithm/ml_train.py.");
        try {
            return Map.of("available", true, "metrics", objectMapper.readValue(path.toFile(), new TypeReference<Map<String, Object>>() {}));
        } catch (IOException exception) {
            return Map.of("available", false, "message", "Could not read model metrics: " + exception.getMessage());
        }
    }

    public Path profileDir() { return profileDir; }

    public DatasetSnapshot currentSnapshot() { return dataService.snapshot(); }

    public void invalidate() { cacheRef.set(null); }

    private Cache cache() {
        DatasetSnapshot snapshot = dataService.snapshot();
        Cache current = cacheRef.get();
        if (current != null && current.snapshot == snapshot) return current;
        Cache next = buildCache(snapshot);
        cacheRef.set(next);
        return next;
    }

    private Cache buildCache(DatasetSnapshot snapshot) {
        Map<String, WeatherRecord> latestByCity = new HashMap<>();
        Map<String, List<WeatherRecord>> byCity = new HashMap<>();
        Map<LocalDate, List<WeatherRecord>> byDate = new TreeMap<>();
        Map<String, Long> conditions = new HashMap<>();
        Map<String, CityClimate> climates = new HashMap<>();
        for (WeatherRecord record : snapshot.records()) {
            latestByCity.merge(record.cityKey(), record, (left, right) -> left.updatedEpoch() >= right.updatedEpoch() ? left : right);
            byCity.computeIfAbsent(record.cityKey(), ignored -> new ArrayList<>()).add(record);
            byDate.computeIfAbsent(record.utcDate(), ignored -> new ArrayList<>()).add(record);
            conditions.merge(normalizeCondition(record.condition()), 1L, Long::sum);
            CityClimate climate = climates.computeIfAbsent(record.cityKey(), ignored -> new CityClimate(record.cityKey(), record));
            climate.add(record);
        }
        List<WeatherRecord> latest = latestByCity.values().stream()
                .sorted(Comparator.comparing(WeatherRecord::country).thenComparing(WeatherRecord::city)).toList();
        latestByCity.forEach((key, record) -> climates.get(key).latest = record);
        Map<String, Long> sortedConditions = conditions.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
        List<Daily> daily = byDate.entrySet().stream().map(entry -> {
            List<WeatherRecord> values = entry.getValue();
            double[] temps = values.stream().mapToDouble(WeatherRecord::temperature).filter(Double::isFinite).sorted().toArray();
            return Daily.from(entry.getKey(), values.stream().mapToDouble(WeatherRecord::temperature).average().orElse(0),
                    quantile(temps, .1), quantile(temps, .9), values.stream().mapToDouble(WeatherRecord::humidity).average().orElse(0),
                    (int) values.stream().map(WeatherRecord::cityKey).distinct().count(), values.size());
        }).toList();
        return new Cache(snapshot, latest, byCity, daily, sortedConditions, climates);
    }

    private Map<String, Object> latestRecord(WeatherRecord record) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("country", record.country()); value.put("city", record.city());
        value.put("latitude", record.latitude()); value.put("longitude", record.longitude());
        value.put("timezone", record.timezone()); value.put("temperature", round(record.temperature(), 1));
        value.put("feels_like", round(record.feelsLike(), 1)); value.put("condition", normalizeCondition(record.condition()));
        value.put("humidity", round(record.humidity(), 1)); value.put("cloud", round(record.cloud(), 1));
        value.put("precipitation", round(record.precipitation(), 2)); value.put("visibility", round(record.visibilityKm(), 1));
        value.put("wind", round(record.windKph(), 1)); value.put("uv", round(record.uv(), 1));
        value.put("pm25", round(record.pm25(), 1)); value.put("pm10", round(record.pm10(), 1));
        value.put("epa_index", record.epaIndex()); value.put("updated", record.updatedLocal());
        value.put("city_key", record.cityKey());
        return value;
    }

    private Map<String, Object> cityProfile(CityClimate city) {
        WeatherRecord record = city.latest;
        Map<String, Object> profile = latestRecord(record);
        profile.put("monthly_temp", city.monthlyMeans(city.temp));
        profile.put("monthly_humidity", city.monthlyMeans(city.humidity));
        profile.put("monthly_precipitation", city.monthlyMeans(city.precipitation));
        profile.put("monthly_pm25", city.monthlyMeans(city.monthPm25));
        profile.put("pm25_annual", round(city.annualPm25(), 1));
        profile.put("rain_probability", round(city.count == 0 ? 0 : city.rainCountTotal * 100.0 / city.count, 1));
        profile.put("monthly", city.monthlyMeans(city.temp));
        return profile;
    }

    private CityClimate requireCity(String key) {
        CityClimate city = cache().climates.get(key);
        if (city == null) throw new NoSuchElementException("Unknown city: " + (key == null ? "" : key));
        return city;
    }

    private double[] standardizedVector(CityClimate city) {
        int width = 49;
        double[] vector = new double[width];
        double[] values = new double[width];
        double[] columnsMean = new double[width];
        double[] columnsStd = new double[width];
        for (int i = 0; i < 12; i++) {
            values[i] = city.monthMean(city.temp, i);
            values[i + 12] = city.monthMean(city.humidity, i);
            values[i + 24] = city.monthMean(city.precipitation, i);
        }
        values[36] = city.annualPm25();
        for (int i = 0; i < 12; i++) values[37 + i] = city.monthMean(city.monthPm25, i);
        List<CityClimate> all = new ArrayList<>(cache().climates.values());
        for (int j = 0; j < width; j++) {
            final int column = j;
            double[] columnValues = all.stream().mapToDouble(row -> feature(row, column)).filter(Double::isFinite).toArray();
            columnsMean[j] = Arrays.stream(columnValues).average().orElse(0);
            final double mean = columnsMean[j];
            double variance = Arrays.stream(columnValues).map(value -> Math.pow(value - mean, 2)).average().orElse(1);
            columnsStd[j] = variance == 0 ? 1 : Math.sqrt(variance);
            vector[j] = (values[j] - columnsMean[j]) / columnsStd[j];
        }
        return vector;
    }

    private double feature(CityClimate city, int column) {
        if (column < 12) return city.monthMean(city.temp, column);
        if (column < 24) return city.monthMean(city.humidity, column - 12);
        if (column < 36) return city.monthMean(city.precipitation, column - 24);
        if (column == 36) return city.annualPm25();
        return city.monthMean(city.monthPm25, column - 37);
    }

    private int[] kmeans(double[][] values, int k) {
        if (values.length == 0) return new int[0];
        k = Math.max(1, Math.min(k, values.length));
        Random random = new Random(42);
        double[][] centers = new double[k][values[0].length];
        int first = random.nextInt(values.length);
        centers[0] = values[first].clone();
        double[] distances = new double[values.length];
        for (int c = 1; c < k; c++) {
            double total = 0;
            for (int i = 0; i < values.length; i++) {
                double nearest = Double.POSITIVE_INFINITY;
                for (int prior = 0; prior < c; prior++) nearest = Math.min(nearest, squaredDistance(values[i], centers[prior]));
                distances[i] = nearest;
                total += nearest;
            }
            double threshold = random.nextDouble() * total;
            int chosen = values.length - 1;
            for (int i = 0; i < distances.length; i++) if ((threshold -= distances[i]) <= 0) { chosen = i; break; }
            centers[c] = values[chosen].clone();
        }
        int[] labels = new int[values.length];
        Arrays.fill(labels, -1);
        for (int iteration = 0; iteration < 100; iteration++) {
            boolean changed = false;
            for (int i = 0; i < values.length; i++) {
                int best = 0;
                double distance = squaredDistance(values[i], centers[0]);
                for (int c = 1; c < k; c++) {
                    double candidate = squaredDistance(values[i], centers[c]);
                    if (candidate < distance) { distance = candidate; best = c; }
                }
                if (labels[i] != best) { labels[i] = best; changed = true; }
            }
            double[][] sums = new double[k][values[0].length];
            int[] counts = new int[k];
            for (int i = 0; i < values.length; i++) {
                counts[labels[i]]++;
                for (int j = 0; j < values[i].length; j++) sums[labels[i]][j] += values[i][j];
            }
            for (int c = 0; c < k; c++) if (counts[c] > 0)
                for (int j = 0; j < sums[c].length; j++) centers[c][j] = sums[c][j] / counts[c];
            if (!changed) break;
        }
        return labels;
    }

    private double squaredDistance(double[] left, double[] right) {
        double sum = 0;
        for (int i = 0; i < left.length; i++) sum += Math.pow(left[i] - right[i], 2);
        return sum;
    }

    private double cosine(double[] left, double[] right) {
        double dot = 0, a = 0, b = 0;
        for (int i = 0; i < left.length; i++) { dot += left[i] * right[i]; a += left[i] * left[i]; b += right[i] * right[i]; }
        return a == 0 || b == 0 ? 0 : dot / Math.sqrt(a * b);
    }

    private double[][] correlation(List<WeatherRecord> records, ToDoubleFunction<WeatherRecord>[] selectors) {
        int n = selectors.length;
        double[] meanX = new double[n], meanY = new double[n], m2X = new double[n], m2Y = new double[n];
        double[][] covariance = new double[n][n];
        long count = 0;
        for (WeatherRecord record : records) {
            count++;
            double[] values = new double[n];
            for (int i = 0; i < n; i++) values[i] = selectors[i].applyAsDouble(record);
            for (int i = 0; i < n; i++) {
                double dx = values[i] - meanX[i]; meanX[i] += dx / count; m2X[i] += dx * (values[i] - meanX[i]);
                for (int j = 0; j < n; j++) covariance[i][j] += dx * (values[j] - meanY[j]);
            }
            for (int j = 0; j < n; j++) meanY[j] += (values[j] - meanY[j]) / count;
        }
        double[][] result = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
            double denom = Math.sqrt(Math.max(0, m2X[i] * m2X[j]));
            result[i][j] = denom == 0 ? 0 : covariance[i][j] / denom;
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private ToDoubleFunction<WeatherRecord>[] selectors() {
        return new ToDoubleFunction[]{
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::temperature,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::feelsLike,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::humidity,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::windKph,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::pressureMb,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::precipitation,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::visibilityKm,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::cloud,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::uv,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::pm25,
                (ToDoubleFunction<WeatherRecord>) WeatherRecord::pm10
        };
    }

    private Map<String, Object> condition(String name, long records, int total) {
        return Map.of("condition", name, "records", records, "share", round(total == 0 ? 0 : records * 100.0 / total, 2));
    }

    private double average(List<WeatherRecord> records, ToDoubleFunction<WeatherRecord> selector) {
        return round(records.stream().mapToDouble(selector).average().orElse(0), 2);
    }

    private String normalizeCondition(String value) {
        if (value == null || value.isBlank()) return "Unknown";
        String clean = value.trim().toLowerCase();
        return Character.toUpperCase(clean.charAt(0)) + clean.substring(1);
    }

    private boolean rainy(String condition) {
        return condition != null && condition.toLowerCase().matches(".*(rain|storm|snow|sleet|thunder|drizzle).* ".trim());
    }

    private double targetScore(double value, double target, double radius) { return clamp01(1 - Math.abs(value - target) / radius); }
    private double inverseScore(double value, double ceiling) { return clamp01(1 - Math.max(0, value) / ceiling); }
    private double clamp01(double value) { return Math.max(0, Math.min(1, value)); }
    private int clamp(int value, int minimum, int maximum) { return Math.max(minimum, Math.min(maximum, value)); }
    private String safe(String value) { return value == null ? "" : value.trim(); }
    private String searchText(String value) {
        return Normalizer.normalize(safe(value), Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }
    private double round(double value, int places) { if (!Double.isFinite(value)) return 0; double scale = Math.pow(10, places); return Math.round(value * scale) / scale; }
    private double quantile(double[] values, double probability) {
        if (values.length == 0) return 0;
        double position = probability * (values.length - 1);
        int lower = (int) Math.floor(position), upper = (int) Math.ceil(position);
        return values[lower] + (values[upper] - values[lower]) * (position - lower);
    }
    private String tempScoreText(double temperature, double target) { return "月均温 " + round(temperature, 1) + "°C（目标 " + round(target, 0) + "°C）"; }

    private static final class Cache {
        private final DatasetSnapshot snapshot;
        private final List<WeatherRecord> latest;
        private final Map<String, List<WeatherRecord>> byCity;
        private final List<Daily> daily;
        private final Map<String, Long> conditionCounts;
        private final Map<String, CityClimate> climates;
        private Cache(DatasetSnapshot snapshot, List<WeatherRecord> latest, Map<String, List<WeatherRecord>> byCity,
                      List<Daily> daily, Map<String, Long> conditionCounts, Map<String, CityClimate> climates) {
            this.snapshot = snapshot; this.latest = latest; this.byCity = byCity;
            this.daily = daily; this.conditionCounts = conditionCounts; this.climates = climates;
        }
    }

    private static final class CityClimate {
        private final String key;
        private WeatherRecord latest;
        private final double[] temp = new double[12], humidity = new double[12], precipitation = new double[12];
        private final double[] monthPm25 = new double[12], monthUv = new double[12];
        private final int[] monthCount = new int[12], rainCount = new int[12];
        private int count;
        private int rainCountTotal;
        private double pm25Total;
        private CityClimate(String key, WeatherRecord latest) { this.key = key; this.latest = latest; }
        private void add(WeatherRecord record) {
            int month = Math.max(0, Math.min(11, record.month() - 1));
            temp[month] += record.temperature(); humidity[month] += record.humidity();
            precipitation[month] += record.precipitation(); monthPm25[month] += record.pm25(); monthUv[month] += record.uv();
            monthCount[month]++; count++; pm25Total += record.pm25();
            if (record.precipitation() > .1 || record.condition().toLowerCase().matches(".*(rain|storm|snow|sleet|thunder|drizzle).*")) {
                rainCount[month]++; rainCountTotal++;
            }
        }
        private double monthMean(double[] values, int month) { return monthCount[month] == 0 ? 0 : values[month] / monthCount[month]; }
        private double[] monthlyMeans(double[] values) {
            double[] result = new double[12];
            for (int i = 0; i < 12; i++) result[i] = monthMean(values, i);
            return result;
        }
        private double mean(double[] values) {
            double total = 0; int n = 0;
            for (int i = 0; i < 12; i++) if (monthCount[i] > 0) { total += values[i] / monthCount[i]; n++; }
            return n == 0 ? 0 : total / n;
        }
        private double annualPm25() { return count == 0 ? 0 : pm25Total / count; }
    }

    private static final class Daily {
        private final LocalDate date;
        private final double mean, p10, p90, humidity;
        private final int locations, records;
        private Daily(LocalDate date, double mean, double p10, double p90, double humidity, int locations, int records) {
            this.date = date; this.mean = mean; this.p10 = p10; this.p90 = p90; this.humidity = humidity;
            this.locations = locations; this.records = records;
        }
        private static Daily from(LocalDate date, List<Double> values, int locations, int records) {
            double[] sorted = values.stream().mapToDouble(Double::doubleValue).sorted().toArray();
            return from(date, Arrays.stream(sorted).average().orElse(0), percentile(sorted, .1), percentile(sorted, .9), 0, locations, records);
        }
        private static Daily from(LocalDate date, double mean, double p10, double p90, double humidity, int locations, int records) {
            return new Daily(date, mean, p10, p90, humidity, locations, records);
        }
        private static double percentile(double[] values, double q) {
            if (values.length == 0) return 0;
            double pos = q * (values.length - 1); int lo = (int) Math.floor(pos), hi = (int) Math.ceil(pos);
            return values[lo] + (values[hi] - values[lo]) * (pos - lo);
        }
    }
}
