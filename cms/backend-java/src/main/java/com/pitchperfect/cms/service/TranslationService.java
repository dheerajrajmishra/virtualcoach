package com.pitchperfect.cms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.cms.model.FAQ;
import com.pitchperfect.cms.model.Quiz;
import com.pitchperfect.cms.model.Slide;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class TranslationService {

    private static final MediaType JSON = MediaType.get("application/json");

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${azure.openai.endpoint}")
    private String endpoint;

    @Value("${azure.openai.key}")
    private String apiKey;

    @Value("${azure.openai.deployment-name}")
    private String deployment;

    @Value("${azure.openai.api-version}")
    private String apiVersion;

    @Autowired
    @Qualifier("translationExecutor")
    private Executor translationExecutor;

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Translates all slides in parallel — one task per slide, all locales
     * within a slide are sequential so no concurrent writes to the same map.
     */
    public List<Slide> fillMissingTranslations(List<Slide> slides, List<String> targetLocales) {
        List<String> locales = nonEnglish(targetLocales);
        log.info("Translating {} slides into locales {} using {} threads",
                slides.size(), locales, 8);
        long t0 = System.currentTimeMillis();

        awaitAll(
                slides.stream()
                        .map(slide -> CompletableFuture.runAsync(
                                () -> translateSlide(slide, locales), translationExecutor))
                        .toList(),
                "slide translation");

        log.info("Slide translation done in {}ms", System.currentTimeMillis() - t0);
        return slides;
    }

    /** Translates all FAQs in parallel — one task per FAQ item. */
    public List<FAQ> fillFaqTranslations(List<FAQ> faqs, List<String> targetLocales) {
        List<String> locales = nonEnglish(targetLocales);
        awaitAll(
                faqs.stream()
                        .map(faq -> CompletableFuture.runAsync(
                                () -> translateFaq(faq, locales), translationExecutor))
                        .toList(),
                "FAQ translation");
        return faqs;
    }

    /** Translates all quizzes in parallel — one task per quiz item. */
    public List<Quiz> fillQuizTranslations(List<Quiz> quizzes, List<String> targetLocales) {
        List<String> locales = nonEnglish(targetLocales);
        awaitAll(
                quizzes.stream()
                        .map(quiz -> CompletableFuture.runAsync(
                                () -> translateQuiz(quiz, locales), translationExecutor))
                        .toList(),
                "quiz translation");
        return quizzes;
    }

    // ── Per-item translators (each owns its map — no shared state) ─────────────

    private void translateSlide(Slide slide, List<String> locales) {
        String src = slide.getTranscripts().get("en");
        if (src == null || src.isBlank()) return;
        for (String locale : locales) {
            if (slide.getTranscripts().getOrDefault(locale, "").isBlank()) {
                slide.getTranscripts().put(locale, translate(src, locale));
            }
        }
    }

    private void translateFaq(FAQ faq, List<String> locales) {
        String srcQ = faq.getQuestions().get("en");
        String srcA = faq.getAnswers().get("en");
        for (String locale : locales) {
            if (faq.getQuestions().getOrDefault(locale, "").isBlank())
                faq.getQuestions().put(locale, translate(srcQ, locale));
            if (faq.getAnswers().getOrDefault(locale, "").isBlank())
                faq.getAnswers().put(locale, translate(srcA, locale));
        }
    }

    private void translateQuiz(Quiz quiz, List<String> locales) {
        String srcQ = quiz.getQuestions().get("en");
        String srcA = quiz.getExpectedAnswers().get("en");
        for (String locale : locales) {
            if (quiz.getQuestions().getOrDefault(locale, "").isBlank())
                quiz.getQuestions().put(locale, translate(srcQ, locale));
            if (quiz.getExpectedAnswers().getOrDefault(locale, "").isBlank())
                quiz.getExpectedAnswers().put(locale, translate(srcA, locale));
        }
    }

    // ── Core translate ─────────────────────────────────────────────────────────

    private String translate(String text, String targetLocale) {
        if (text == null || text.isBlank()) return text;
        String language = localeToLanguage(targetLocale);
        try {
            String url = endpoint.replaceAll("/$", "")
                    + "/openai/deployments/" + deployment
                    + "/chat/completions?api-version=" + apiVersion;

            String maskedKey = apiKey != null && apiKey.length() > 8
                    ? apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length() - 4)
                      + " (len=" + apiKey.length() + ")"
                    : "(empty)";
            log.debug("Translating to {} | URL: {} | key: {}", targetLocale, url, maskedKey);

            String body = objectMapper.writeValueAsString(Map.of(
                    "messages", List.of(
                            Map.of("role", "system", "content",
                                    "You are a professional translator for sales training content. "
                                    + "Translate the user's text to " + language + ". "
                                    + "Return ONLY the translated text with no extra commentary."),
                            Map.of("role", "user", "content", text)
                    ),
                    "temperature", 0.1,
                    "max_tokens", 2000
            ));

            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("api-key", apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(body, JSON))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) {
                    log.warn("Azure OpenAI translation failed for locale {} (HTTP {})",
                            targetLocale, response.code());
                    return text;
                }
                JsonNode root = objectMapper.readTree(response.body().string());
                return root.at("/choices/0/message/content").asText(text).trim();
            }
        } catch (Exception e) {
            log.error("Translation error for locale {}: {}", targetLocale, e.getMessage());
            return text;
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void awaitAll(List<CompletableFuture<Void>> futures, String phase) {
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (CompletionException e) {
            // Individual translate() already falls back to source text on error —
            // log and continue so one failed locale doesn't abort the whole batch.
            log.error("Parallel {} had an error (partial results may be in English): {}",
                    phase, e.getCause().getMessage());
        }
    }

    private List<String> nonEnglish(List<String> locales) {
        return locales.stream().filter(l -> !"en".equalsIgnoreCase(l)).toList();
    }

    private String localeToLanguage(String locale) {
        return switch (locale) {
            case "hi" -> "Hindi";
            case "ta" -> "Tamil";
            case "te" -> "Telugu";
            case "mr" -> "Marathi";
            case "bn" -> "Bengali";
            default -> "English";
        };
    }
}
