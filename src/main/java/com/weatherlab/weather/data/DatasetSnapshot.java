package com.weatherlab.weather.data;

import java.nio.file.Path;
import java.util.List;

public record DatasetSnapshot(Path path, int fields, int rowsBefore, List<WeatherRecord> records,
                              int duplicateRows, List<String> rejectedRows) {
    public int rowsRemoved() {
        return rowsBefore - records.size();
    }
}
