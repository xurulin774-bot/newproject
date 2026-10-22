package com.weatherlab.weather.data;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

public record WeatherRecord(
        String country,
        String city,
        double latitude,
        double longitude,
        String timezone,
        long updatedEpoch,
        String updatedLocal,
        double temperature,
        double feelsLike,
        String condition,
        double windKph,
        double windDegree,
        String windDirection,
        double pressureMb,
        double precipitation,
        double humidity,
        double cloud,
        double visibilityKm,
        double uv,
        double gustKph,
        double pm25,
        double pm10,
        double epaIndex,
        double gbDefraIndex,
        double ozone,
        double nitrogenDioxide,
        double sulphurDioxide,
        double carbonMonoxide,
        int month,
        LocalDate utcDate,
        int sourceLine
) {
    public String cityKey() {
        return country + " | " + city;
    }

    public LocalDateTime observedUtc() {
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(updatedEpoch), ZoneOffset.UTC);
    }
}
