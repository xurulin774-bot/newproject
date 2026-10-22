package com.weatherlab.weather;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class WeatherApplication {
    public static void main(String[] args) {
        Path runtimeTemp = Path.of(System.getProperty("user.dir"), ".runtime", "tmp").toAbsolutePath().normalize();
        Path runtimeDocbase = Path.of(System.getProperty("user.dir"), ".runtime", "docbase").toAbsolutePath().normalize();
        try {
            Files.createDirectories(runtimeTemp);
            Files.createDirectories(runtimeDocbase);
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot create project runtime directory: " + runtimeTemp, exception);
        }
        System.setProperty("java.io.tmpdir", runtimeTemp.toString());
        SpringApplication.run(WeatherApplication.class, args);
    }

    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatDocumentRoot() {
        Path documentRoot = Path.of(System.getProperty("user.dir"), ".runtime", "docbase").toAbsolutePath().normalize();
        return factory -> factory.setDocumentRoot(documentRoot.toFile());
    }
}
