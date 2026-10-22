package com.weatherlab.weather.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weatherlab.weather.common.ModelTrainingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class ModelAdminController {
    private final ModelMapper models;
    private final ModelTrainingService training;

    public ModelAdminController(ModelMapper models, ModelTrainingService training) {
        this.models = models; this.training = training;
    }

    @GetMapping("/api/models")
    public Map<String, Object> list(HttpServletRequest request, @RequestParam(defaultValue = "1") long page,
                                    @RequestParam(defaultValue = "20") long size) {
        AdminGuard.require(request);
        Page<ModelEntity> result = models.selectPage(new Page<>(Math.max(1, page), Math.min(100, Math.max(1, size))),
                new QueryWrapper<ModelEntity>().orderByDesc("id"));
        return Map.of("items", result.getRecords(), "total", result.getTotal(), "page", result.getCurrent(), "size", result.getSize());
    }

    @GetMapping("/api/models/{id}")
    public Map<String, Object> detail(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request); return Map.of("item", require(id));
    }

    @PostMapping("/api/models")
    public Map<String, Object> create(HttpServletRequest request, @Valid @RequestBody ModelRequest body) {
        AdminGuard.require(request);
        ModelEntity model = new ModelEntity();
        model.setModelName(body.modelName()); model.setAlgorithm(body.algorithm()); model.setTarget(body.target());
        model.setStatus("READY"); model.setMetricsJson(body.metricsJson()); model.setArtifactPath(body.artifactPath());
        model.setCreatedAt(LocalDateTime.now()); model.setUpdatedAt(LocalDateTime.now()); models.insert(model);
        return Map.of("item", model);
    }

    @PutMapping("/api/models/{id}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable long id,
                                      @Valid @RequestBody ModelRequest body) {
        AdminGuard.require(request);
        ModelEntity model = require(id);
        model.setModelName(body.modelName()); model.setAlgorithm(body.algorithm()); model.setTarget(body.target());
        model.setMetricsJson(body.metricsJson()); model.setArtifactPath(body.artifactPath());
        model.setUpdatedAt(LocalDateTime.now()); models.updateById(model);
        return Map.of("item", model);
    }

    @DeleteMapping("/api/models/{id}")
    public Map<String, Object> delete(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request);
        ModelEntity model = require(id);
        if ("RUNNING".equals(model.getStatus())) throw new IllegalArgumentException("A running model cannot be deleted");
        models.deleteById(id); training.remove(id);
        return Map.of("code", 200, "message", "Model deleted");
    }

    @PostMapping("/api/models/train")
    public Map<String, Object> train(HttpServletRequest request) {
        AdminGuard.require(request); return training.start();
    }

    @GetMapping("/api/models/{id}/status")
    public Map<String, Object> status(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request); return training.status(id, require(id));
    }

    @GetMapping("/api/models/{id}/result")
    public Map<String, Object> result(HttpServletRequest request, @PathVariable long id) {
        AdminGuard.require(request); return training.result(id, require(id));
    }

    private ModelEntity require(long id) {
        ModelEntity model = models.selectById(id);
        if (model == null) throw new NoSuchElementException("Model not found: " + id);
        return model;
    }

    public record ModelRequest(@NotBlank @Size(max = 180) String modelName,
                               @NotBlank @Size(max = 100) String algorithm,
                               @NotBlank @Size(max = 180) String target,
                               @Size(max = 200000) String metricsJson,
                               @Size(max = 800) String artifactPath) {}
}
