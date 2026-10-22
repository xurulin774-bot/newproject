package com.weatherlab.weather.common;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.weatherlab.weather.admin.ModelEntity;
import com.weatherlab.weather.admin.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class ModelTrainingService {
    private final ModelMapper models;
    private final Path projectRoot;
    private final Path metricsPath;
    private final String pythonCommand;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(task -> {
        Thread thread = new Thread(task, "weather-model-training"); thread.setDaemon(true); return thread;
    });
    private final Map<Long, String> logs = new ConcurrentHashMap<>();
    private final Map<Long, Boolean> running = new ConcurrentHashMap<>();

    public ModelTrainingService(ModelMapper models,
                                @Value("${weather.python-command:python}") String pythonCommand,
                                @Value("${weather.data-file:./data/raw/GlobalWeatherRepository.csv}") String dataFile,
                                @Value("${weather.profile-dir:./data/profile}") String profileDir) {
        this.models = models;
        this.pythonCommand = pythonCommand;
        this.projectRoot = Path.of(dataFile).toAbsolutePath().normalize().getParent().getParent().getParent();
        this.metricsPath = Path.of(profileDir).toAbsolutePath().normalize().resolve("ml_metrics.json");
    }

    public synchronized Map<String, Object> start() {
        if (running.values().stream().anyMatch(Boolean::booleanValue)) throw new IllegalArgumentException("Model training is already running");
        ModelEntity model = new ModelEntity();
        model.setModelName("Weather rain classification"); model.setAlgorithm("Python scikit-learn and LightGBM");
        model.setTarget("precip_mm > 0.1"); model.setStatus("RUNNING");
        model.setArtifactPath(projectRoot.resolve("algorithm/ml_models/rain_model.joblib").toString());
        model.setCreatedAt(LocalDateTime.now()); model.setUpdatedAt(LocalDateTime.now()); models.insert(model);
        long id = model.getId(); running.put(id, true); logs.put(id, "Training started");
        executor.submit(() -> execute(id));
        return Map.of("taskId", id, "status", "RUNNING", "message", "Training task started");
    }

    private void execute(long id) {
        Path logPath = projectRoot.resolve("logs").resolve("training-" + id + ".log");
        ModelEntity model = models.selectById(id);
        try {
            Files.createDirectories(logPath.getParent());
            ProcessBuilder builder = new ProcessBuilder(pythonCommand, "algorithm/ml_train.py",
                    "--data", "data/raw/GlobalWeatherRepository.csv", "--figures-dir", "src/main/resources/static/figures", "--report-dir", "data/profile");
            builder.directory(projectRoot.toFile()).redirectErrorStream(true).redirectOutput(logPath.toFile());
            Process process = builder.start();
            int code = process.waitFor();
            String output = Files.exists(logPath) ? Files.readString(logPath) : "";
            logs.put(id, tail(output, 12000));
            model.setStatus(code == 0 ? "SUCCEEDED" : "FAILED");
            if (code == 0 && Files.exists(metricsPath)) model.setMetricsJson(Files.readString(metricsPath));
            else if (code != 0) model.setMetricsJson("{\"error\":\"Training process exited with code " + code + "\"}");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt(); model.setStatus("FAILED"); logs.put(id, "Training interrupted");
        } catch (IOException | RuntimeException exception) {
            model.setStatus("FAILED"); logs.put(id, exception.toString());
        } finally {
            model.setUpdatedAt(LocalDateTime.now()); models.updateById(model); running.remove(id);
        }
    }

    public Map<String, Object> status(long id, ModelEntity model) {
        return Map.of("taskId", id, "status", model.getStatus(), "running", running.containsKey(id),
                "log", logs.getOrDefault(id, "Check logs/training-" + id + ".log"), "updatedAt", model.getUpdatedAt() == null ? "" : model.getUpdatedAt().toString());
    }

    public Map<String, Object> result(long id, ModelEntity model) {
        if (model.getMetricsJson() == null || model.getMetricsJson().isBlank())
            throw new NoSuchElementException("Model results are not available yet");
        return Map.of("taskId", id, "status", model.getStatus(), "metricsJson", model.getMetricsJson());
    }

    public void remove(long id) { logs.remove(id); running.remove(id); }

    private String tail(String value, int limit) { return value.length() <= limit ? value : value.substring(value.length() - limit); }
}
