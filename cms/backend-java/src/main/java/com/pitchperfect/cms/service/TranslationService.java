package com.pitchperfect.cms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.cms.model.FAQ;
import com.pitchperfect.cms.model.Quiz;
import com.pitchperfect.cms.model.Slide;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class TranslationService {

    private static final MediaType JSON = MediaType.get("application/json");
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
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

    public List<Slide> fillMissingTranslations(List<Slide> slides, List<String> targetLocales) {
        List<String> locales = nonEnglish(targetLocales);
        for (Slide slide : slides) {
            String sourceText = slide.getTranscripts().get("en");
            if (sourceText == null || sourceText.isBlank()) continue;
            for (String locale : locales) {
                if (slide.getTranscripts().getOrDefault(locale, "").isBlank()) {
                    slide.getTranscripts().put(locale, translate(sourceText, locale));
                }
            }
        }
        return slides;
    }

    public List<FAQ> fillFaqTranslations(List<FAQ> faqs, List<String> targetLocales) {
        List<String> locales = nonEnglish(targetLocales);
        for (FAQ faq : faqs) {
            String srcQ = faq.getQuestions().get("en");
            String srcA = faq.getAnswers().get("en");
            for (String locale : locales) {
                if (faq.getQuestions().getOrDefault(locale, "").isBlank())
                    faq.getQuestions().put(locale, translate(srcQ, locale));
                if (faq.getAnswers().getOrDefault(locale, "").isBlank())
                    faq.getAnswers().put(locale, translate(srcA, locale));
            }
        }
        return faqs;
    }

    public List<Quiz> fillQuizTranslations(List<Quiz> quizzes, List<String> targetLocales) {
        List<String> locales = nonEnglish(targetLocales);
        for (Quiz quiz : quizzes) {
            String srcQ = quiz.getQuestions().get("en");
            String srcA = quiz.getExpectedAnswers().get("en");
            for (String locale : locales) {
                if (quiz.getQuestions().getOrDefault(locale, "").isBlank())
                    quiz.getQuestions().put(locale, translate(srcQ, locale));
                if (quiz.getExpectedAnswers().getOrDefault(locale, "").isBlank())
                    quiz.getExpectedAnswers().put(locale, translate(srcA, locale));
            }
        }
        return quizzes;
    }

    // English is the source — never translate into it
    private List<String> nonEnglish(List<String> locales) {
        return locales.stream().filter(l -> !"en".equalsIgnoreCase(l)).toList();
    }

    private String translate(String text, String targetLocale) {
        if (text == null || text.isBlank()) return text;
        String language = localeToLanguage(targetLocale);
        try {
            String url = endpoint.replaceAll("/$", "")
                    + "/openai/deployments/" + deployment
                    + "/chat/completions?api-version=" + apiVersion;

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
                    log.warn("Azure OpenAI translation failed for locale {} (HTTP {})", targetLocale, response.code());
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
