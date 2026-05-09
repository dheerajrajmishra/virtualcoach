package com.pitchperfect.mobile.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ElevenLabsSpeechService {

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${elevenlabs.api-key}")
    private String elevenLabsKey;

    public String transcribe(byte[] audioBytes, String contentType, String locale) {
        if (audioBytes == null || audioBytes.length == 0)
            return "";
        try {
            return callElevenLabsApi(audioBytes, "recording.m4a"); // ElevenLabs infers format from filename/bytes
        } catch (Exception e) {
            log.error("ElevenLabs STT transcription failed: {}", e.getMessage());
            return "";
        }
    }

    private String callElevenLabsApi(byte[] audioBytes, String filename) throws IOException {
        String url = "https://api.in.residency.elevenlabs.io/v1/speech-to-text";

        RequestBody fileBody = RequestBody.create(audioBytes, MediaType.parse("application/octet-stream"));
        MultipartBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", filename, fileBody)
                .addFormDataPart("model_id", "scribe_v1")
                .build();

        Request request = new Request.Builder()
                .url(url)
                .addHeader("xi-api-key", elevenLabsKey)
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (response.body() == null)
                return "";
            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                log.warn("ElevenLabs STT error (HTTP {}): {}", response.code(), responseBody);
                return "";
            }

            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("text").asText("").trim();
        }
    }
}
