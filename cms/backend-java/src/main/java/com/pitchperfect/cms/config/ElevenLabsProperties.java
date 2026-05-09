package com.pitchperfect.cms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Typed binding for all elevenlabs.* config.
 * Per-locale maps let you tune voice, stability, and style independently
 * for each language — critical for natural-sounding Indian language TTS.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "elevenlabs")
public class ElevenLabsProperties {

    private String apiKey;
    private String model = "eleven_multilingual_v2";
    private String defaultVoiceId = "pNInz6obpgDQGcFmaJgB";

    /** Global fallback stability — overridden per locale via locale-stability map. */
    private double stability = 0.5;

    /** Global fallback similarity-boost — overridden per locale via locale-similarity-boost map. */
    private double similarityBoost = 0.75;

    /** Voice ID per locale. Falls back to defaultVoiceId if locale not listed. */
    private Map<String, String> localeVoices = new HashMap<>();

    /**
     * Stability override per locale (0.0–1.0).
     * Lower = more expressive and natural; higher = more consistent but robotic.
     * Indian languages typically sound much better at 0.25–0.35.
     */
    private Map<String, Double> localeStability = new HashMap<>();

    /**
     * Style exaggeration per locale (0.0–1.0, default 0.0).
     * A small non-zero value (0.10–0.20) adds expressiveness to Indian language voices.
     */
    private Map<String, Double> localeStyle = new HashMap<>();

    public String voiceFor(String locale) {
        return localeVoices.getOrDefault(locale, defaultVoiceId);
    }

    public double stabilityFor(String locale) {
        return localeStability.getOrDefault(locale, stability);
    }

    public double styleFor(String locale) {
        return localeStyle.getOrDefault(locale, 0.0);
    }
}
