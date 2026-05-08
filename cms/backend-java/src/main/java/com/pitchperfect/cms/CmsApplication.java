package com.pitchperfect.cms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CmsApplication {
    public static void main(String[] args) {
        // Load .env file from common locations
        loadDotenv(".");
        loadDotenv("../../");
        
        SpringApplication.run(CmsApplication.class, args);
    }

    private static void loadDotenv(String path) {
        try {
            io.github.cdimascio.dotenv.Dotenv dotenv = io.github.cdimascio.dotenv.Dotenv.configure()
                    .directory(path)
                    .ignoreIfMissing()
                    .load();
            
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
            });
        } catch (Exception e) {
            // Ignore if directory doesn't exist or is invalid
        }
    }
}
