package com.pitchperfect.mobile.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Data
@Component
@ConfigurationProperties(prefix = "elevenlabs")
public class ElevenLabsProperties {
    private String apiKey;
    private String model = "eleven_multilingual_v2";
    private String defaultVoiceId;
    private double stability = 0.5;
    private double similarityBoost = 0.75;
    private Map<String, String> localeVoices = new HashMap<>();
    private Map<String, Double> localeStability = new HashMap<>();
    private Map<String, Double> localeStyle = new HashMap<>();
}
