package com.weatherlab.weather.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.weatherlab.weather.data.WeatherDataService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DatabaseInitializer implements CommandLineRunner {
    private final UserMapper users;
    private final DatasetMapper datasets;
    private final WeatherDataService weatherData;
    private final PasswordEncoder passwordEncoder;
    private final String adminName;
    private final String adminPassword;

    public DatabaseInitializer(UserMapper users, DatasetMapper datasets, WeatherDataService weatherData,
                               PasswordEncoder passwordEncoder,
                               @Value("${weather.admin.username:admin}") String adminName,
                               @Value("${weather.admin.password:123456}") String adminPassword) {
        this.users = users;
        this.datasets = datasets;
        this.weatherData = weatherData;
        this.passwordEncoder = passwordEncoder;
        this.adminName = adminName;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        UserEntity user = users.selectOne(new QueryWrapper<UserEntity>().eq("username", adminName));
        if (user == null) {
            user = new UserEntity();
            user.setUsername(adminName);
            user.setPasswordHash(passwordEncoder.encode(adminPassword));
            user.setDisplayName("Weather Administrator");
            user.setRole("ADMIN");
            user.setCreatedAt(LocalDateTime.now());
            users.insert(user);
        }
        if (datasets.selectCount(new QueryWrapper<>()) == 0) {
            var snapshot = weatherData.snapshot();
            DatasetEntity dataset = new DatasetEntity();
            dataset.setName(snapshot.path().getFileName().toString());
            dataset.setFilePath(snapshot.path().toString());
            dataset.setDescription("Initial weather observation dataset");
            dataset.setRowCount(snapshot.records().size());
            dataset.setFieldCount(snapshot.fields());
            dataset.setStatus("ACTIVE");
            dataset.setCreatedAt(LocalDateTime.now());
            dataset.setUpdatedAt(LocalDateTime.now());
            datasets.insert(dataset);
        }
    }
}
