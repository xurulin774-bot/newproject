package com.weatherlab.weather.data;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class WeatherDataService {
    private static final Logger log = LoggerFactory.getLogger(WeatherDataService.class);
    private final Path configuredPath;
    private final AtomicReference<DatasetSnapshot> snapshot = new AtomicReference<>();

    public WeatherDataService(@Value("${weather.data-file:./data/raw/GlobalWeatherRepository.csv}") String dataFile) {
        configuredPath = Path.of(dataFile).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void loadInitialDataset() throws IOException {
        reload();
    }

    public DatasetSnapshot snapshot() {
        DatasetSnapshot current = snapshot.get();
        if (current == null) throw new IllegalStateException("Weather data has not been loaded");
        return current;
    }

    public synchronized DatasetSnapshot reload() throws IOException {
        DatasetSnapshot loaded = CsvReader.read(configuredPath);
        snapshot.set(loaded);
        log.info("Loaded {} weather rows from {} ({} invalid or duplicate rows skipped)",
                loaded.records().size(), loaded.path(), loaded.rowsRemoved());
        return loaded;
    }

    public synchronized DatasetSnapshot activate(Path file) throws IOException {
        DatasetSnapshot loaded = CsvReader.read(file);
        snapshot.set(loaded);
        log.info("Activated dataset {} with {} records", loaded.path(), loaded.records().size());
        return loaded;
    }

    public Path configuredPath() { return configuredPath; }
}
