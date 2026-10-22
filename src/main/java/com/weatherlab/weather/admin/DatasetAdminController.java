package com.weatherlab.weather.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weatherlab.weather.data.WeatherAnalyticsService;
import com.weatherlab.weather.data.WeatherDataService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class DatasetAdminController {
    private final DatasetMapper datasets;
    private final WeatherDataService dataService;
    private final WeatherAnalyticsService analytics;
    private final Path uploadDirectory;

    public DatasetAdminController(DatasetMapper datasets, WeatherDataService dataService,
                                  WeatherAnalyticsService analytics,
                                  @Value("${weather.data-file:./data/raw/GlobalWeatherRepository.csv}") String dataFile) {
        this.datasets = datasets; this.dataService = dataService; this.analytics = analytics;
        this.uploadDirectory = Path.of(dataFile).toAbsolutePath().normalize().getParent();
    }

    @GetMapping("/api/datasets")
    public Map<String, Object> list(HttpServletRequest request, @RequestParam(defaultValue = "1") long page,
                                    @RequestParam(defaultValue = "20") long size) {
        AdminGuard.require(request);
        Page<DatasetEntity> result = datasets.selectPage(new Page<>(Math.max(1, page), Math.min(100, Math.max(1, size))),
                new QueryWrapper<DatasetEntity>().orderByDesc("id"));
        return Map.of("items", result.getRecords(), "total", result.getTotal(), "page", result.getCurrent(), "size", result.getSize());
    }

    @GetMapping("/api/datasets/{id}")
    public Map<String, Object> detail(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request); return Map.of("item", require(id));
    }

    @PostMapping("/api/datasets")
    public Map<String, Object> create(HttpServletRequest request, @Valid @RequestBody DatasetRequest body) {
        AdminGuard.require(request);
        DatasetEntity dataset = new DatasetEntity();
        dataset.setName(body.name()); dataset.setFilePath(body.filePath()); dataset.setDescription(body.description());
        dataset.setStatus("REGISTERED"); dataset.setCreatedAt(LocalDateTime.now()); dataset.setUpdatedAt(LocalDateTime.now());
        datasets.insert(dataset);
        return Map.of("item", dataset);
    }

    @PutMapping("/api/datasets/{id}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable long id,
                                      @Valid @RequestBody DatasetRequest body) {
        AdminGuard.require(request);
        DatasetEntity dataset = require(id); dataset.setName(body.name()); dataset.setFilePath(body.filePath());
        dataset.setDescription(body.description()); dataset.setUpdatedAt(LocalDateTime.now()); datasets.updateById(dataset);
        return Map.of("item", dataset);
    }

    @DeleteMapping("/api/datasets/{id}")
    public Map<String, Object> delete(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request);
        DatasetEntity dataset = require(id);
        if ("ACTIVE".equals(dataset.getStatus())) throw new IllegalArgumentException("The active dataset cannot be deleted");
        datasets.deleteById(id); return Map.of("code", 200, "message", "Dataset deleted");
    }

    @PostMapping("/api/datasets/upload")
    public Map<String, Object> upload(HttpServletRequest request, @RequestParam("file") MultipartFile file) throws IOException {
        AdminGuard.require(request);
        String original = Path.of(file.getOriginalFilename() == null ? "dataset.csv" : file.getOriginalFilename()).getFileName().toString();
        if (!original.toLowerCase().endsWith(".csv")) throw new IllegalArgumentException("Only CSV files are supported");
        Files.createDirectories(uploadDirectory);
        String stem = original.substring(0, original.length() - 4).replaceAll("[^A-Za-z0-9_-]", "_");
        String uniqueName = stem + "-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + ".csv";
        Path target = uploadDirectory.resolve(uniqueName).normalize();
        if (!target.getParent().equals(uploadDirectory)) throw new IllegalArgumentException("Invalid upload path");
        file.transferTo(target);
        try {
            var snapshot = dataService.activate(target);
            analytics.invalidate();
            DatasetEntity dataset = new DatasetEntity();
            dataset.setName(original); dataset.setFilePath(target.toString()); dataset.setDescription("Uploaded and validated weather CSV");
            dataset.setRowCount(snapshot.records().size()); dataset.setFieldCount(snapshot.fields()); dataset.setStatus("ACTIVE");
            dataset.setCreatedAt(LocalDateTime.now()); dataset.setUpdatedAt(LocalDateTime.now());
            datasets.update(null, new UpdateWrapper<DatasetEntity>().eq("status", "ACTIVE")
                    .set("status", "ARCHIVED").set("updated_at", LocalDateTime.now()));
            datasets.insert(dataset);
            return Map.of("item", dataset, "message", "CSV validated and activated");
        } catch (IOException | RuntimeException exception) {
            Files.deleteIfExists(target);
            throw exception;
        }
    }

    @PostMapping("/api/admin/reload")
    public Map<String, Object> reload(HttpServletRequest request) throws IOException {
        AdminGuard.require(request);
        var snapshot = dataService.reload(); analytics.invalidate();
        DatasetEntity active = datasets.selectOne(new QueryWrapper<DatasetEntity>().eq("status", "ACTIVE").last("LIMIT 1"));
        if (active == null) active = new DatasetEntity();
        active.setName(snapshot.path().getFileName().toString()); active.setFilePath(snapshot.path().toString());
        active.setRowCount(snapshot.records().size()); active.setFieldCount(snapshot.fields()); active.setStatus("ACTIVE");
        active.setUpdatedAt(LocalDateTime.now());
        if (active.getId() == null) { active.setCreatedAt(LocalDateTime.now()); datasets.insert(active); }
        else datasets.updateById(active);
        return Map.of("code", 200, "message", "Dataset reloaded", "records", snapshot.records().size(), "fields", snapshot.fields());
    }

    private DatasetEntity require(long id) {
        DatasetEntity dataset = datasets.selectById(id);
        if (dataset == null) throw new NoSuchElementException("Dataset not found: " + id);
        return dataset;
    }

    public record DatasetRequest(@NotBlank @Size(max = 180) String name,
                                 @NotBlank @Size(max = 800) String filePath,
                                 @Size(max = 1000) String description) {}
}
