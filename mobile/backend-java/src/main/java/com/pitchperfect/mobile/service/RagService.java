package com.pitchperfect.mobile.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.mobile.model.FAQ;
import com.pitchperfect.mobile.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private static final MediaType JSON = MediaType.get("application/json");

    private final FaqRepository faqRepository;
    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.gemini.api-key}")
    private String geminiApiKey;

    @Value("${app.gemini.base-url}")
    private String geminiBaseUrl;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.rag.max-context-faqs}")
    private int maxContextFaqs;

    public String answer(String trainingId, int slideIndex, String question, String locale) {
        try {
            List<String> contextFaqs = fetchRelevantFaqs(trainingId, slideIndex, locale);
            String prompt = buildRagPrompt(question, contextFaqs, locale);
            return callGemini(prompt);
        } catch (Exception e) {
            log.error("RAG query failed: {}", e.getMessage(), e);
            return "I'm sorry, I couldn't find an answer to that question right now.";
        }
    }

    private List<String> fetchRelevantFaqs(String trainingId, int slideIndex, String locale) {
        return faqRepository.findByTrainingIdAndSlideIndex(trainingId, slideIndex)
                .stream()
                .limit(maxContextFaqs)
                .map(faq -> {
                    String q = faq.getQuestions() != null
                            ? faq.getQuestions().getOrDefault(locale, faq.getQuestions().getOrDefault("en", ""))
                            : "";
                    String a = faq.getAnswers() != null
                            ? faq.getAnswers().getOrDefault(locale, faq.getAnswers().getOrDefault("en", ""))
                            : "";
                    return "Q: " + q + "\nA: " + a;
                })
                .collect(Collectors.toList());
    }

    private String buildRagPrompt(String question, List<String> context, String locale) {
        String contextBlock = String.join("\n\n", context);
        String langInstruction = "en".equals(locale) ? "" : "Respond in the same language as the question.";

        return String.format("""
                You are a helpful AI coach for a sales training program.
                Answer the user's question based ONLY on the provided context.
                If the answer is not in the context, say "I don't have information on that in this module."
                %s

                Context:
                %s

                User Question: %s

                Answer:
                """, langInstruction, contextBlock, question);
    }

    private String callGemini(String prompt) throws Exception {
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
                throw new RuntimeException("Gemini API error: " + response.code());
            }
            JsonNode root = objectMapper.readTree(response.body().string());
            return root.at("/candidates/0/content/parts/0/text").asText("No answer available.");
        }
    }
}
