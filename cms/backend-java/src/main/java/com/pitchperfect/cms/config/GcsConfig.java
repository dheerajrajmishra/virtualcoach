package com.pitchperfect.cms.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Slf4j
@Configuration
public class GcsConfig {

    @Bean
    public Storage gcsStorage() {
        try {
            return StorageOptions.newBuilder()
                    .setCredentials(GoogleCredentials.getApplicationDefault())
                    .build()
                    .getService();
        } catch (IOException e) {
            log.warn("GCS credentials not configured — file upload and audio features will be unavailable at runtime.");
            return StorageOptions.getDefaultInstance().getService();
        }
    }
}
