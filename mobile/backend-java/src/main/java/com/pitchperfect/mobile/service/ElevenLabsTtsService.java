package com.pitchperfect.mobile.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.mobile.config.ElevenLabsProperties;
import com.pitchperfect.mobile.dto.TtsSynthesisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ElevenLabsTtsService {

    private static final String TTS_BASE_URL = "https://api.in.residency.elevenlabs.io/v1/text-to-speech";
    private static final Duration CACHE_TTL = Duration.ofDays(1);

    private final ElevenLabsProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();

    @Value("${app.storage.local-path:./storage}")
    private String storagePath;

    // ── Public entry point ────────────────────────────────────────────────────

    public TtsSynthesisResponse synthesize(String text, String locale) throws IOException {
        Path cacheFile = cacheFilePath(locale, text);

        TtsSynthesisResponse cached = readCache(cacheFile);
        if (cached != null) {
            log.debug("TTS cache hit: {}", cacheFile.getFileName());
            return cached;
        }

        TtsSynthesisResponse result = callElevenLabs(text, locale);
        writeCache(cacheFile, result);
        return result;
    }

    // ── ElevenLabs API call ───────────────────────────────────────────────────

    private TtsSynthesisResponse callElevenLabs(String text, String locale) throws IOException {
        String voiceId  = props.getLocaleVoices().getOrDefault(locale, props.getDefaultVoiceId());
        double stability = props.getLocaleStability().getOrDefault(locale, props.getStability());
        double style     = props.getLocaleStyle().getOrDefault(locale, 0.0);

        String url = TTS_BASE_URL + "/" + voiceId + "/with-timestamps";

        Map<String, Object> voiceSettings = new HashMap<>();
        voiceSettings.put("stability", stability);
        voiceSettings.put("similarity_boost", props.getSimilarityBoost());
        voiceSettings.put("style", style);
        voiceSettings.put("use_speaker_boost", true);

        Map<String, Object> requestPayload = new HashMap<>();
        requestPayload.put("text", text);
        requestPayload.put("model_id", props.getModel());
        requestPayload.put("voice_settings", voiceSettings);

        Request request = new Request.Builder()
                .url(url)
                .addHeader("xi-api-key", props.getApiKey())
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                .post(RequestBody.create(objectMapper.writeValueAsString(requestPayload),
                        MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                log.error("ElevenLabs TTS failed (HTTP {}): {}", response.code(), body);
                throw new IOException("ElevenLabs TTS error " + response.code());
            }

            JsonNode root = objectMapper.readTree(body);
            String audioBase64 = root.path("audio_base64").asText();

            JsonNode alignment = root.has("normalized_alignment")
                    ? root.path("normalized_alignment")
                    : root.path("alignment");

            List<String> characters = new ArrayList<>();
            List<Double> startTimes = new ArrayList<>();
            List<Double> endTimes   = new ArrayList<>();

            if (!alignment.isMissingNode()) {
                for (JsonNode ch : alignment.path("characters")) characters.add(ch.asText());
                for (JsonNode t  : alignment.path("character_start_times_seconds")) startTimes.add(t.asDouble());
                for (JsonNode t  : alignment.path("character_end_times_seconds"))   endTimes.add(t.asDouble());
            }

            double duration = endTimes.isEmpty() ? 0.0 : endTimes.get(endTimes.size() - 1);

            TtsSynthesisResponse result = new TtsSynthesisResponse();
            result.setAudioBase64(audioBase64);
            result.setCharacters(characters);
            result.setCharacterStartTimes(startTimes);
            result.setCharacterEndTimes(endTimes);
            result.setDuration(duration);
            return result;
        }
    }

    // ── File cache helpers ────────────────────────────────────────────────────

    private Path cacheFilePath(String locale, String text) {
        String hash = md5Hex(locale + "|" + text);
        return Path.of(storagePath, "tts-cache", hash + ".json");
    }

    private TtsSynthesisResponse readCache(Path file) {
        try {
            if (!Files.exists(file)) return null;
            FileTime lastModified = Files.getLastModifiedTime(file);
            if (Instant.now().minus(CACHE_TTL).isAfter(lastModified.toInstant())) {
                Files.deleteIfExists(file);
                log.debug("TTS cache expired, deleted: {}", file.getFileName());
                return null;
            }
            return objectMapper.readValue(file.toFile(), TtsSynthesisResponse.class);
        } catch (IOException e) {
            log.warn("TTS cache read failed ({}): {}", file.getFileName(), e.getMessage());
            return null;
        }
    }

    private void writeCache(Path file, TtsSynthesisResponse result) {
        try {
            Files.createDirectories(file.getParent());
            objectMapper.writeValue(file.toFile(), result);
            log.debug("TTS cached: {}", file.getFileName());
        } catch (IOException e) {
            log.warn("TTS cache write failed ({}): {}", file.getFileName(), e.getMessage());
        }
    }

    private static String md5Hex(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("MD5")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 unavailable", e);
        }
    }
}
