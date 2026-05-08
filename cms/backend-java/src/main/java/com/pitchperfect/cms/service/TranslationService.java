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
    private static final List<String> TRANSLATE_LOCALES = List.of("hi", "ta", "te", "mr", "bn");

    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.gemini.api-key}")
    private String geminiApiKey;

    @Value("${app.gemini.base-url}")
    private String geminiBaseUrl;

    @Value("${app.gemini.model}")
    private String geminiModel;

    public List<Slide> fillMissingTranslations(List<Slide> slides) {
        for (Slide slide : slides) {
            String sourceText = slide.getTranscripts().get("en");
            if (sourceText == null || sourceText.isBlank()) continue;

            for (String locale : TRANSLATE_LOCALES) {
                String existing = slide.getTranscripts().get(locale);
                if (existing == null || existing.isBlank()) {
                    String translated = translate(sourceText, locale);
                    slide.getTranscripts().put(locale, translated);
                }
            }
        }
        return slides;
    }

    public List<FAQ> fillFaqTranslations(List<FAQ> faqs) {
        for (FAQ faq : faqs) {
            String srcQ = faq.getQuestions().get("en");
            String srcA = faq.getAnswers().get("en");

            for (String locale : TRANSLATE_LOCALES) {
                if (faq.getQuestions().getOrDefault(locale, "").isBlank()) {
                    faq.getQuestions().put(locale, translate(srcQ, locale));
                }
                if (faq.getAnswers().getOrDefault(locale, "").isBlank()) {
                    faq.getAnswers().put(locale, translate(srcA, locale));
                }
            }
        }
        return faqs;
    }

    public List<Quiz> fillQuizTranslations(List<Quiz> quizzes) {
        for (Quiz quiz : quizzes) {
            String srcQ = quiz.getQuestions().get("en");
            String srcA = quiz.getExpectedAnswers().get("en");

            for (String locale : TRANSLATE_LOCALES) {
                if (quiz.getQuestions().getOrDefault(locale, "").isBlank()) {
                    quiz.getQuestions().put(locale, translate(srcQ, locale));
                }
                if (quiz.getExpectedAnswers().getOrDefault(locale, "").isBlank()) {
                    quiz.getExpectedAnswers().put(locale, translate(srcA, locale));
                }
            }
        }
        return quizzes;
    }

    private String translate(String text, String targetLocale) {
        String prompt = String.format(
                "Translate the following text to %s. Return ONLY the translated text, no explanations:\n\n%s",
                localeToLanguage(targetLocale), text
        );

        try {
            String reqBody = objectMapper.writeValueAsString(Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", prompt))
                    ))
            ));

            Request request = new Request.Builder()
                    .url(geminiBaseUrl + "/models/" + geminiModel + ":generateContent?key=" + geminiApiKey)
                    .post(RequestBody.create(reqBody, JSON))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) {
                    log.warn("Gemini translation failed for locale {}", targetLocale);
                    return text;
                }
                JsonNode root = objectMapper.readTree(response.body().string());
                return root.at("/candidates/0/content/parts/0/text").asText(text);
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
