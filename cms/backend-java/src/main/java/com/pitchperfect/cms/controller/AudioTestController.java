package com.pitchperfect.cms.controller;

import com.pitchperfect.cms.config.ElevenLabsProperties;
import com.pitchperfect.cms.service.AudioFactoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Quick-test endpoint for ElevenLabs TTS — active only in the "dev" profile.
 *
 * All voice settings can be passed as query params so you can try any voice/
 * stability/style combination without touching application.yml or restarting.
 *
 * ── Synthesize (returns raw MP3) ────────────────────────────────────────────
 *
 *   POST /api/test/tts
 *     ?text=नमस्ते, यह एक परीक्षण है
 *     &locale=hi                              ← uses config voice for this locale (default)
 *     &voiceId=Ms9OTvWb99V6DwRHZn6q          ← override voice ID
 *     &stability=0.30                         ← override stability  (0.0–1.0)
 *     &similarityBoost=0.75                   ← override similarity boost
 *     &style=0.15                             ← override style exaggeration
 *     &apiKey=your_elevenlabs_key             ← override API key (uses config if omitted)
 *     &baseUrl=https://api.elevenlabs.io/v1   ← override base URL (uses config if omitted)
 *
 *   Open in browser → plays inline.
 *   curl -X POST "http://localhost:8080/api/test/tts?voiceId=Ms9OTvWb99V6DwRHZn6q&text=Hello" --output out.mp3
 *
 * ── Effective settings preview (no API call) ────────────────────────────────
 *
 *   GET /api/test/tts/info?locale=hi&voiceId=Ms9OTvWb99V6DwRHZn6q&stability=0.3
 *   Returns the exact parameters that would be sent to ElevenLabs.
 */
@Slf4j
@RestController
@RequestMapping("/api/test/tts")
@RequiredArgsConstructor
@Profile("dev")
public class AudioTestController {

    private final AudioFactoryService audioFactoryService;
    private final ElevenLabsProperties elProps;

    @PostMapping(produces = "audio/mpeg")
    public ResponseEntity<byte[]> synthesize(
            @RequestParam String text,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String voiceId,
            @RequestParam(required = false) Double stability,
            @RequestParam(required = false) Double similarityBoost,
            @RequestParam(required = false) Double style,
            @RequestParam(required = false) String apiKey,
            @RequestParam(required = false) String baseUrl) {

        // Explicit param wins → locale config → global default
        String effectiveLocale          = locale          != null ? locale          : "en";
        String effectiveVoiceId         = voiceId         != null ? voiceId         : elProps.voiceFor(effectiveLocale);
        double effectiveStability       = stability        != null ? stability        : elProps.stabilityFor(effectiveLocale);
        double effectiveSimilarityBoost = similarityBoost != null ? similarityBoost : elProps.getSimilarityBoost();
        double effectiveStyle           = style            != null ? style            : elProps.styleFor(effectiveLocale);

        String maskedKey = apiKey != null && apiKey.length() > 8
                ? apiKey.substring(0, 4) + "…" + apiKey.substring(apiKey.length() - 4) : "(config)";

        log.info("Test TTS → voice={} stability={} similarityBoost={} style={} locale={} key={} baseUrl={} text='{}'",
                effectiveVoiceId, effectiveStability, effectiveSimilarityBoost, effectiveStyle,
                effectiveLocale, maskedKey, baseUrl != null ? baseUrl : "(config)",
                text.length() > 80 ? text.substring(0, 80) + "…" : text);

        try {
            byte[] mp3 = audioFactoryService.synthesize(
                    text, effectiveVoiceId,
                    effectiveStability, effectiveSimilarityBoost, effectiveStyle,
                    apiKey, baseUrl);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("audio/mpeg"))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"test_" + effectiveLocale + ".mp3\"")
                    .body(mp3);
        } catch (Exception e) {
            log.error("Test TTS failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Returns the exact parameters that would be sent to ElevenLabs — no API call made. */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info(
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String voiceId,
            @RequestParam(required = false) Double stability,
            @RequestParam(required = false) Double similarityBoost,
            @RequestParam(required = false) Double style,
            @RequestParam(required = false) String apiKey,
            @RequestParam(required = false) String baseUrl) {

        String effectiveLocale          = locale          != null ? locale          : "en";
        String effectiveVoiceId         = voiceId         != null ? voiceId         : elProps.voiceFor(effectiveLocale);
        double effectiveStability       = stability        != null ? stability        : elProps.stabilityFor(effectiveLocale);
        double effectiveSimilarityBoost = similarityBoost != null ? similarityBoost : elProps.getSimilarityBoost();
        double effectiveStyle           = style            != null ? style            : elProps.styleFor(effectiveLocale);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("locale",          effectiveLocale);
        info.put("voiceId",         effectiveVoiceId);
        info.put("voiceIdSource",   voiceId  != null ? "param"  : "config[" + effectiveLocale + "]");
        info.put("model",           elProps.getModel());
        info.put("stability",       effectiveStability);
        info.put("similarityBoost", effectiveSimilarityBoost);
        info.put("style",           effectiveStyle);
        info.put("baseUrl",         baseUrl  != null ? baseUrl  : "(config) " + "https://api.in.residency.elevenlabs.io/v1");
        info.put("apiKeySource",    apiKey   != null ? "param"  : "config");

        return ResponseEntity.ok(info);
    }
}
