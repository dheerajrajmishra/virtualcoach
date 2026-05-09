package com.pitchperfect.mobile.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * Transcribes audio using the Azure Cognitive Services Speech-to-Text REST API.
 * Supports local filesystem paths (/storage/...) and HTTP(S) URLs.
 */
@Slf4j
@Service
public class AzureSpeechService {

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${azure.speech.key}")
    private String speechKey;

    @Value("${azure.speech.region}")
    private String speechRegion;

    @Value("${app.storage.local-path:./storage}")
    private String localStoragePath;

    /**
     * Transcribes audio at the given URL/path for the specified locale.
     * Returns the transcribed text, or an empty string if transcription fails.
     */
    public String transcribe(String mediaUrl, String locale) {
        if (mediaUrl == null || mediaUrl.isBlank()) return "";
        try {
            byte[] audioBytes = fetchAudioBytes(mediaUrl);
            if (audioBytes == null || audioBytes.length == 0) {
                log.warn("Empty audio bytes for URL: {}", mediaUrl);
                return "";
            }
            return callSpeechApi(audioBytes, resolveContentType(mediaUrl), toAzureLocale(locale));
        } catch (Exception e) {
            log.error("STT transcription failed for {}: {}", mediaUrl, e.getMessage());
            return "";
        }
    }

    /**
     * Transcribes audio from direct byte array.
     */
    public String transcribe(byte[] audioBytes, String contentType, String locale) {
        if (audioBytes == null || audioBytes.length == 0) return "";
        try {
            return callSpeechApi(audioBytes, contentType, toAzureLocale(locale));
        } catch (Exception e) {
            log.error("STT transcription failed for byte array: {}", e.getMessage());
            return "";
        }
    }

    private byte[] fetchAudioBytes(String mediaUrl) throws IOException {
        if (mediaUrl.startsWith("/storage/") || mediaUrl.startsWith("./storage/")) {
            // Local storage: strip the /storage/ prefix and read from configured path
            String relativePath = mediaUrl.replaceFirst("^/?storage/", "");
            Path filePath = Paths.get(localStoragePath, relativePath);
            if (!Files.exists(filePath)) {
                log.warn("Audio file not found at local path: {}", filePath);
                return new byte[0];
            }
            return Files.readAllBytes(filePath);
        }

        if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
            Request req = new Request.Builder().url(mediaUrl).get().build();
            try (Response resp = httpClient.newCall(req).execute()) {
                if (!resp.isSuccessful() || resp.body() == null) {
                    log.warn("Failed to download audio from {}: HTTP {}", mediaUrl, resp.code());
                    return new byte[0];
                }
                return resp.body().bytes();
            }
        }

        log.warn("Unsupported media URL scheme, cannot fetch audio: {}", mediaUrl);
        return new byte[0];
    }

    private String callSpeechApi(byte[] audioBytes, String contentType, String language) throws IOException {
        // Azure Speech STT REST API — short audio (<= 60 s)
        String url = "https://" + speechRegion
                + ".stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
                + "?language=" + language
                + "&format=detailed"
                + "&profanity=raw";

        RequestBody body = RequestBody.create(audioBytes, MediaType.get(contentType));
        Request request = new Request.Builder()
                .url(url)
                .addHeader("Ocp-Apim-Subscription-Key", speechKey)
                .addHeader("Content-Type", contentType)
                .addHeader("Accept", "application/json")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (response.body() == null) return "";
            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                log.warn("Azure Speech STT error (HTTP {}): {}", response.code(), responseBody);
                return "";
            }

            JsonNode root = objectMapper.readTree(responseBody);
            String status = root.path("RecognitionStatus").asText();
            if (!"Success".equals(status)) {
                log.warn("Azure Speech STT status: {}", status);
                return "";
            }
            return root.path("DisplayText").asText("").trim();
        }
    }

    private String resolveContentType(String mediaUrl) {
        String lower = mediaUrl.toLowerCase();
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".mp4") || lower.endsWith(".m4a") || lower.endsWith(".aac")) return "audio/mp4";
        if (lower.endsWith(".ogg")) return "audio/ogg; codecs=opus";
        if (lower.endsWith(".webm")) return "audio/webm; codecs=opus";
        // Default to WAV — most compatible with Azure Speech REST API
        return "audio/wav";
    }

    private String toAzureLocale(String locale) {
        if (locale == null) return "en-IN";
        return switch (locale.toLowerCase()) {
            case "hi" -> "hi-IN";
            case "ta" -> "ta-IN";
            case "te" -> "te-IN";
            case "mr" -> "mr-IN";
            case "bn" -> "bn-IN";
            default -> "en-IN";
        };
    }
}
