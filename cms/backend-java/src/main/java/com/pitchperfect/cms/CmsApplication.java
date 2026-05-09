package com.pitchperfect.cms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CmsApplication {
    public static void main(String[] args) {
        // .env is loaded by DotenvPostProcessor (EnvironmentPostProcessor SPI)
        // before Spring beans are initialized — no manual loading needed here.
        SpringApplication.run(CmsApplication.class, args);
    }
}
