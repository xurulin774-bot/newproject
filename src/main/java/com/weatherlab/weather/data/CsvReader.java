package com.weatherlab.weather.data;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class CsvReader {
    private CsvReader() {
    }

    public static DatasetSnapshot read(Path path) throws IOException {
        if (!Files.isRegularFile(path)) {
            throw new IOException("Weather CSV not found: " + path.toAbsolutePath());
        }
        List<WeatherRecord> records = new ArrayList<>();
        List<String> rejected = new ArrayList<>();
        Map<String, Integer> columns;
        int fields;
        int before = 0;
        int duplicateRows = 0;
        java.util.Set<String> seen = new java.util.HashSet<>();

        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String headerLine = reader.readLine();
            if (headerLine == null) throw new IOException("CSV file is empty");
            List<String> header = parseLine(headerLine);
            fields = header.size();
            columns = new HashMap<>();
            for (int i = 0; i < header.size(); i++) {
                columns.put(header.get(i).trim().replace("\uFEFF", ""), i);
            }
            List<String> missing = List.of("country", "location_name", "latitude", "longitude", "timezone",
                    "last_updated_epoch", "last_updated", "temperature_celsius", "condition_text", "wind_kph",
                    "pressure_mb", "precip_mm", "humidity", "cloud", "visibility_km", "uv_index",
                    "air_quality_PM2.5", "air_quality_PM10", "air_quality_us-epa-index")
                    .stream().filter(name -> !columns.containsKey(name)).toList();
            if (!missing.isEmpty()) throw new IOException("Missing required columns: " + String.join(", ", missing));

            String line;
            int lineNumber = 1;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.isBlank()) continue;
                before++;
                try {
                    List<String> values = parseLine(line);
                    WeatherRecord record = toRecord(values, columns, lineNumber);
                    if (record.country().isBlank() || record.city().isBlank()
                            || Math.abs(record.latitude()) > 90 || Math.abs(record.longitude()) > 180) {
                        rejected.add("line " + lineNumber + ": missing location or invalid coordinates");
                        continue;
                    }
                    String fingerprint = record.country() + '\u001f' + record.city() + '\u001f' + record.updatedEpoch();
                    if (!seen.add(fingerprint)) {
                        duplicateRows++;
                        continue;
                    }
                    records.add(record);
                } catch (RuntimeException exception) {
                    rejected.add("line " + lineNumber + ": " + exception.getMessage());
                }
            }
        }
        if (records.isEmpty()) throw new IOException("CSV has no valid weather records");
        return new DatasetSnapshot(path.toAbsolutePath().normalize(), fields, before, records,
                duplicateRows, rejected);
    }

    private static WeatherRecord toRecord(List<String> values, Map<String, Integer> columns, int line) {
        String country = value(values, columns, "country").trim();
        String city = value(values, columns, "location_name").trim();
        String updated = value(values, columns, "last_updated").trim();
        long epoch = (long) number(values, columns, "last_updated_epoch", 0);
        int month = 1;
        try {
            month = java.time.OffsetDateTime.parse(updated.replace(" ", "T")).getMonthValue();
        } catch (RuntimeException ignored) {
            try {
                month = java.time.LocalDateTime.parse(updated.replace(' ', 'T')).getMonthValue();
            } catch (RuntimeException ignoredAgain) {
                month = java.time.Instant.ofEpochSecond(epoch).atZone(ZoneOffset.UTC).getMonthValue();
            }
        }
        return new WeatherRecord(country, city,
                number(values, columns, "latitude", Double.NaN), number(values, columns, "longitude", Double.NaN),
                value(values, columns, "timezone"), epoch, updated,
                number(values, columns, "temperature_celsius", Double.NaN),
                number(values, columns, "feels_like_celsius", number(values, columns, "temperature_celsius", Double.NaN)),
                value(values, columns, "condition_text").trim(), number(values, columns, "wind_kph", 0),
                number(values, columns, "wind_degree", 0), value(values, columns, "wind_direction"),
                number(values, columns, "pressure_mb", 0), number(values, columns, "precip_mm", 0),
                number(values, columns, "humidity", 0), number(values, columns, "cloud", 0),
                number(values, columns, "visibility_km", 0), number(values, columns, "uv_index", 0),
                number(values, columns, "gust_kph", number(values, columns, "wind_kph", 0)),
                number(values, columns, "air_quality_PM2.5", 0), number(values, columns, "air_quality_PM10", 0),
                number(values, columns, "air_quality_us-epa-index", 0),
                number(values, columns, "air_quality_gb-defra-index", 0),
                number(values, columns, "air_quality_Ozone", 0),
                number(values, columns, "air_quality_Nitrogen_dioxide", 0),
                number(values, columns, "air_quality_Sulphur_dioxide", 0),
                number(values, columns, "air_quality_Carbon_Monoxide", 0), month,
                java.time.Instant.ofEpochSecond(epoch).atZone(ZoneOffset.UTC).toLocalDate(), line);
    }

    private static String value(List<String> row, Map<String, Integer> columns, String name) {
        Integer index = columns.get(name);
        return index == null || index >= row.size() ? "" : row.get(index);
    }

    private static double number(List<String> row, Map<String, Integer> columns, String name, double fallback) {
        String raw = value(row, columns, name).trim();
        if (raw.isEmpty() || raw.equalsIgnoreCase("null") || raw.equalsIgnoreCase("nan")) return fallback;
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    static List<String> parseLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder value = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char current = line.charAt(i);
            if (current == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    value.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (current == ',' && !quoted) {
                result.add(value.toString());
                value.setLength(0);
            } else {
                value.append(current);
            }
        }
        if (quoted) throw new IllegalArgumentException("unterminated quoted CSV value");
        result.add(value.toString());
        return result;
    }
}
