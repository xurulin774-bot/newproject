package com.weatherlab.weather.api;

import com.weatherlab.weather.data.WeatherAnalyticsService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
public class WeatherController {
    private final WeatherAnalyticsService analytics;

    public WeatherController(WeatherAnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "project", "Global Weather Analytics and Recommendation System",
                "records", analytics.currentSnapshot().records().size());
    }

    @GetMapping("/api/summary")
    public Map<String, Object> summary() { return analytics.summary(); }

    @GetMapping("/api/cleaning")
    public Map<String, Object> cleaning() { return analytics.cleaning(); }

    @GetMapping("/api/eda")
    public Map<String, Object> eda() { return analytics.eda(); }

    @GetMapping("/api/trend")
    public Map<String, Object> trend(@RequestParam(defaultValue = "180") int days) {
        return analytics.trend(days);
    }

    @GetMapping("/api/conditions")
    public Map<String, Object> conditions(@RequestParam(defaultValue = "10") int limit) {
        return analytics.conditions(limit);
    }

    @GetMapping("/api/map")
    public Map<String, Object> map() { return analytics.map(); }

    @GetMapping("/api/cities")
    public Map<String, Object> cities(@RequestParam(defaultValue = "") String q,
                                      @RequestParam(defaultValue = "30") int limit) {
        return analytics.cities(q, limit);
    }

    @GetMapping("/api/recommend")
    public Map<String, Object> recommend(@RequestParam(defaultValue = "comfort") String mode,
                                         @RequestParam(defaultValue = "") String q,
                                         @RequestParam(defaultValue = "8") int limit) {
        return analytics.recommend(mode, q, limit);
    }

    @GetMapping("/api/similar")
    public Map<String, Object> similar(@RequestParam String k,
                                       @RequestParam(defaultValue = "8") int limit) {
        return analytics.similar(k, limit);
    }

    @GetMapping("/api/plan")
    public Map<String, Object> plan(@RequestParam(defaultValue = "1") int month,
                                    @RequestParam(defaultValue = "comfort") String mode,
                                    @RequestParam(defaultValue = "8") int limit) {
        return analytics.plan(month, mode, limit);
    }

    @GetMapping("/api/compare")
    public Map<String, Object> compare(@RequestParam(name = "k", required = false) String[] keys) {
        return analytics.compare(keys == null ? List.of() : Arrays.asList(keys));
    }

    @GetMapping("/api/forecast")
    public Map<String, Object> forecast(@RequestParam(required = false) String k,
                                        @RequestParam(defaultValue = "30") int days) {
        return analytics.forecast(k, days);
    }

    @GetMapping("/api/clusters")
    public Map<String, Object> clusters(@RequestParam(defaultValue = "5") int k) {
        return analytics.clusters(k);
    }

    @GetMapping("/api/advice")
    public Map<String, Object> advice(@RequestParam String k,
                                      @RequestParam(required = false) Integer month) {
        return analytics.advice(k, month);
    }

    @GetMapping("/api/ml")
    public Map<String, Object> ml() { return analytics.ml(); }
}
