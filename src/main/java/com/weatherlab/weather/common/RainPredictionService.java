package com.weatherlab.weather.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weatherlab.weather.data.WeatherAnalyticsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class RainPredictionService {
    private final ObjectMapper objectMapper;
    private final WeatherAnalyticsService analytics;
    private final String pythonCommand;
    private final Path root;

    public RainPredictionService(ObjectMapper objectMapper, WeatherAnalyticsService analytics,
                                 @Value("${weather.python-command:python}") String pythonCommand,
                                 @Value("${weather.data-file:./data/raw/GlobalWeatherRepository.csv}") String dataFile) {
        this.objectMapper = objectMapper; this.analytics = analytics; this.pythonCommand = pythonCommand;
        this.root = Path.of(dataFile).toAbsolutePath().normalize().getParent().getParent().getParent();
    }

    public Map<String, Object> predictCity(String key) {
        return invoke("--city-key", key);
    }

    public Map<String, Object> predictManual(Map<String, Object> values) {
        try {
            Path runtime = root.resolve(".runtime");
            Files.createDirectories(runtime);
            Path payload = Files.createTempFile(runtime, "weather-predict-", ".json");
            try {
                objectMapper.writeValue(payload.toFile(), values);
                return invoke("--payload", payload.toString());
            } finally {
                Files.deleteIfExists(payload);
            }
        } catch (IOException exception) {
            return unavailable("Could not prepare model input: " + exception.getMessage());
        }
    }

    public Map<String, Object> rank(int limit) {
        return invoke("--rank", Integer.toString(Math.max(3, Math.min(limit, 30))));
    }

    private Map<String, Object> invoke(String... args) {
        Path script = root.resolve("algorithm/predict_cli.py");
        Path model = root.resolve("algorithm/ml_models/rain_model.joblib");
        if (!Files.isRegularFile(script) || !Files.isRegularFile(model))
            return unavailable("Rain model files are missing. Run the model training task first.");
        try {
            java.util.List<String> command = new java.util.ArrayList<>();
            command.add(pythonCommand); command.add(script.toString());
            command.add("--dataset"); command.add(analytics.currentSnapshot().path().toString());
            for (int i = 0; i < args.length; i++) {
                command.add(args[i]);
                if (i + 1 < args.length) command.add(args[++i]);
            }
            Process process = new ProcessBuilder(command).directory(root.toFile()).redirectErrorStream(true).start();
            boolean finished = process.waitFor(75, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return unavailable("Model inference timed out after 75 seconds");
            }
            byte[] output = process.getInputStream().readAllBytes();
            String text = new String(output, java.nio.charset.StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0) return unavailable(tail(text, 1200));
            java.util.List<String> lines = text.lines().toList();
            for (int i = lines.size() - 1; i >= 0; i--) {
                String line = lines.get(i);
                try {
                    return objectMapper.readValue(line, new TypeReference<Map<String, Object>>() {});
                } catch (IOException ignored) {
                    // Python packages can print startup warnings before the final JSON line.
                }
            }
            return unavailable("Model process returned no JSON response");
        } catch (IOException exception) {
            return unavailable("Python model runtime is unavailable: " + exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return unavailable("Model inference was interrupted");
        }
    }

    private Map<String, Object> unavailable(String message) {
        return Map.of("available", false, "message", message);
    }

    private String tail(String value, int limit) { return value.length() <= limit ? value : value.substring(value.length() - limit); }
}
