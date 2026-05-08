package com.pitchperfect.cms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.pitchperfect.cms.model.Slide;
import com.pitchperfect.cms.repository.SlideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioFactoryService {

    private static final String ELEVENLABS_BASE = "https://api.in.residency.elevenlabs.io/v1";
    private static final MediaType JSON = MediaType.get("application/json");

    private final Storage gcsStorage;
    private final SlideRepository slideRepository;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${elevenlabs.api-key}")
    private String apiKey;

    @Value("${elevenlabs.model:eleven_multilingual_v2}")
    private String model;

    @Value("${elevenlabs.default-voice-id:pNInz6obpgDQGcFmaJgB}")
    private String defaultVoiceId;

    @Value("${elevenlabs.stability:0.5}")
    private double stability;

    @Value("${elevenlabs.similarity-boost:0.75}")
    private double similarityBoost;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.local-path:./storage}")
    private String localStoragePath;

    @Value("${app.gcs.bucket-name}")
    private String bucketName;

    @Value("${app.gcs.audio-prefix}")
    private String audioPrefix;

    /**
     * Regenerates audio for a single slide+locale after a transcript edit.
     */
    public void regenerateLocaleAudio(String trainingId, Slide slide, String locale) throws Exception {
        Map<String, String> transcripts = slide.getTranscripts();
        String text = transcripts != null ? transcripts.get(locale) : null;
        if (text == null || text.isBlank()) {
            throw new RuntimeException("No transcript found for locale: " + locale);
        }
        String audioUrl = synthesizeAndSave(trainingId, slide, locale, text);
        Map<String, String> audioUrls = new java.util.HashMap<>(
                slide.getAudioUrls() != null ? slide.getAudioUrls() : new java.util.HashMap<>());
        audioUrls.put(locale, audioUrl);
        slide.setAudioUrls(audioUrls);
        slideRepository.save(slide);
        log.info("Regenerated audio for slide {}/{} locale={}", trainingId, slide.getSlideIndex(), locale);
    }

    /**
     * Generates audio for all slides. If any slide fails, an exception is thrown
     * to ensure the IngestionService marks the entire process as ERROR.
     */
    public void generateAllAudio(String trainingId, List<Slide> slides) throws Exception {
        for (Slide slide : slides) {
            for (Map.Entry<String, String> entry : slide.getTranscripts().entrySet()) {
                String locale = entry.getKey();
                String text = entry.getValue();
                if (text == null || text.isBlank())
                    continue;

                // Any error here will now bubble up and stop the ingestion pipeline
                String audioUrl = synthesizeAndSave(trainingId, slide, locale, text);
                slide.getAudioUrls().put(locale, audioUrl);

                // Rate limiting gap
                Thread.sleep(350);
            }
            slideRepository.save(slide);
            log.info("Audio generated for slide {}/{}", trainingId, slide.getSlideIndex());
        }
    }

    private String synthesizeAndSave(String trainingId, Slide slide, String locale, String text) throws Exception {
        byte[] mp3Bytes = callElevenLabs(text, locale);

        String path = audioPrefix + trainingId + "/" + slide.getSlideIndex() + "_" + locale + ".mp3";

        if ("local".equalsIgnoreCase(storageType)) {
            Path targetPath = Paths.get(localStoragePath, path);
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, mp3Bytes);
            log.info("Saved audio locally: {}", targetPath.toAbsolutePath());
            return "/storage/" + path;
        } else {
            BlobId blobId = BlobId.of(bucketName, path);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType("audio/mpeg")
                    .setCacheControl("public, max-age=86400")
                    .build();

            gcsStorage.create(blobInfo, mp3Bytes);
            return "gs://" + bucketName + "/" + path;
        }
    }

    private byte[] callElevenLabs(String text, String locale) throws Exception {
        String voiceId = resolveVoiceId(locale);

        String body = objectMapper.writeValueAsString(Map.of(
                "text", text,
                "model_id", model,
                "voice_settings", Map.of(
                        "stability", stability,
                        "similarity_boost", similarityBoost,
                        "style", 0.0,
                        "use_speaker_boost", true)));

        String url = ELEVENLABS_BASE + "/text-to-speech/" + voiceId + "?output_format=mp3_44100_128";

        Request request = new Request.Builder()
                .url(url)
                .addHeader("xi-api-key", apiKey)
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "audio/mpeg")
                .post(RequestBody.create(body, JSON))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                String errorBody = response.body() != null ? response.body().string() : "";
                throw new RuntimeException("ElevenLabs TTS error (HTTP " + response.code() + "): " + errorBody);
            }
            return response.body().bytes();
        }
    }

    private String resolveVoiceId(String locale) {
        return defaultVoiceId;
    }
}
