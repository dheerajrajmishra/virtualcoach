package com.pitchperfect.cms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.pitchperfect.cms.config.ElevenLabsProperties;
import com.pitchperfect.cms.model.Slide;
import com.pitchperfect.cms.repository.SlideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioFactoryService {

    private static final String ELEVENLABS_BASE = "https://api.in.residency.elevenlabs.io/v1";
    private static final MediaType JSON = MediaType.get("application/json");

    private final Storage gcsStorage;
    private final SlideRepository slideRepository;
    private final ElevenLabsProperties elProps;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.local-path:./storage}")
    private String localStoragePath;

    @Value("${app.gcs.bucket-name}")
    private String bucketName;

    @Value("${app.gcs.audio-prefix}")
    private String audioPrefix;

    @Autowired
    @Qualifier("audioExecutor")
    private Executor audioExecutor;

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
     * Generates audio for all slides in parallel (3 concurrent threads — one per
     * slide).
     * Each thread handles all locales for its slide sequentially, so there are no
     * concurrent writes to the same slide's audioUrls map.
     * The 3-thread cap replaces the old 350 ms sleep for ElevenLabs rate-limiting.
     */
    public void generateAllAudio(String trainingId, List<Slide> slides) throws Exception {
        log.info("Generating audio for {} slides using 3 concurrent threads", slides.size());
        long t0 = System.currentTimeMillis();

        List<CompletableFuture<Void>> futures = slides.stream()
                .map(slide -> CompletableFuture.runAsync(
                        () -> generateSlideAudio(trainingId, slide), audioExecutor))
                .toList();

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (CompletionException e) {
            throw new Exception("Audio generation failed: " + e.getCause().getMessage(), e.getCause());
        }

        // Batch-save all slides once everything is done — avoids N individual saves
        slideRepository.saveAll(slides);
        log.info("Audio generation complete for {} slides in {}ms",
                slides.size(), System.currentTimeMillis() - t0);
    }

    /**
     * Generates audio for every locale of one slide sequentially.
     * Called from a single audioExecutor thread — no concurrency within this
     * method.
     */
    private void generateSlideAudio(String trainingId, Slide slide) {
        for (Map.Entry<String, String> entry : slide.getTranscripts().entrySet()) {
            String locale = entry.getKey();
            String text = entry.getValue();
            if (text == null || text.isBlank())
                continue;
            try {
                String audioUrl = synthesizeAndSave(trainingId, slide, locale, text);
                slide.getAudioUrls().put(locale, audioUrl);
                log.debug("Audio ready: slide {}/{} locale={}", trainingId, slide.getSlideIndex(), locale);
            } catch (Exception e) {
                throw new RuntimeException(
                        "Audio failed for slide " + slide.getSlideIndex() + "/" + locale + ": " + e.getMessage(), e);
            }
        }
        log.info("Audio generated for slide {}/{}", trainingId, slide.getSlideIndex());
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
            return "https://storage.googleapis.com/" + bucketName + "/" + path;
        }
    }

    /**
     * Synthesizes text using per-locale voice/settings from config.
     * Does not save to storage or touch the DB.
     */
    public byte[] synthesize(String text, String locale) throws Exception {
        return callElevenLabs(text, locale);
    }

    /**
     * Synthesizes text with fully explicit settings — bypasses config entirely.
     * Used by the test endpoint so any voice/key/URL/stability/style can be tried
     * on the fly.
     *
     * @param apiKey  ElevenLabs API key — falls back to configured key if null
     * @param baseUrl ElevenLabs base URL — falls back to configured URL if null
     */
    public byte[] synthesize(String text, String voiceId,
            double stability, double similarityBoost, double style,
            String apiKey, String baseUrl) throws Exception {
        String effectiveKey = (apiKey != null && !apiKey.isBlank()) ? apiKey : elProps.getApiKey();
        String effectiveBaseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.replaceAll("/$", "")
                : ELEVENLABS_BASE;

        log.info("TTS (explicit) baseUrl={} voice={} stability={} similarityBoost={} style={}",
                effectiveBaseUrl, voiceId, stability, similarityBoost, style);

        String body = objectMapper.writeValueAsString(Map.of(
                "text", text,
                "model_id", elProps.getModel(),
                "voice_settings", Map.of(
                        "stability", stability,
                        "similarity_boost", similarityBoost,
                        "style", style,
                        "use_speaker_boost", true)));

        String url = effectiveBaseUrl + "/text-to-speech/" + voiceId + "?output_format=mp3_44100_128";

        Request request = new Request.Builder()
                .url(url)
                .addHeader("xi-api-key", effectiveKey)
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

    private byte[] callElevenLabs(String text, String locale) throws Exception {
        String voiceId = elProps.voiceFor(locale);
        double stab = elProps.stabilityFor(locale);
        double simBoost = elProps.getSimilarityBoost();
        double style = elProps.styleFor(locale);

        log.debug("TTS locale={} voice={} stability={} style={}", locale, voiceId, stab, style);

        String body = objectMapper.writeValueAsString(Map.of(
                "text", text,
                "model_id", elProps.getModel(),
                "voice_settings", Map.of(
                        "stability", stab,
                        "similarity_boost", simBoost,
                        "style", style,
                        "use_speaker_boost", true)));

        String url = ELEVENLABS_BASE + "/text-to-speech/" + voiceId + "?output_format=mp3_44100_128";

        Request request = new Request.Builder()
                .url(url)
                .addHeader("xi-api-key", elProps.getApiKey())
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
}
