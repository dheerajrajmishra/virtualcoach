package com.pitchperfect.mobile;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableCaching
public class MobileApplication {
    public static void main(String[] args) {
        SpringApplication.run(MobileApplication.class, args);
    }
}
