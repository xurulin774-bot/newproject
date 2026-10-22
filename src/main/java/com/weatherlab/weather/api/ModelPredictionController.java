package com.weatherlab.weather.api;

import com.weatherlab.weather.common.RainPredictionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class ModelPredictionController {
    private final RainPredictionService prediction;

    public ModelPredictionController(RainPredictionService prediction) { this.prediction = prediction; }

    @GetMapping("/api/ml/predict")
    public Map<String, Object> predictCity(@RequestParam(defaultValue = "") String k) {
        if (k.isBlank()) return Map.of("available", false, "message", "Select a city before predicting");
        return prediction.predictCity(k);
    }

    @PostMapping("/api/ml/predict")
    public Map<String, Object> predictManual(@Valid @RequestBody ManualInput body) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("month", body.month()); values.put("temperature", body.temperature());
        values.put("humidity", body.humidity()); values.put("cloud", body.cloud());
        values.put("pressure", body.pressure()); values.put("wind", body.wind());
        values.put("visibility", body.visibility()); values.put("pm25", body.pm25());
        return prediction.predictManual(values);
    }

    @GetMapping("/api/ml/risk_rank")
    public Map<String, Object> riskRank(@RequestParam(defaultValue = "10") int limit) {
        return prediction.rank(limit);
    }

    public record ManualInput(@Min(1) @Max(12) int month,
                              @DecimalMin("-60") @DecimalMax("60") double temperature,
                              @DecimalMin("0") @DecimalMax("100") double humidity,
                              @DecimalMin("0") @DecimalMax("100") double cloud,
                              @DecimalMin("850") @DecimalMax("1100") double pressure,
                              @DecimalMin("0") @DecimalMax("200") double wind,
                              @DecimalMin("0") @DecimalMax("100") double visibility,
                              @DecimalMin("0") @DecimalMax("5000") double pm25) {}
}
