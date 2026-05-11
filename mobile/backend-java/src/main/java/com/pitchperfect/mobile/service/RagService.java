package com.pitchperfect.mobile.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.mobile.model.UnansweredQuestion;
import com.pitchperfect.mobile.repository.UnansweredQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private static final MediaType JSON = MediaType.get("application/json");

    private static final String NO_INFO_SIGNAL = "I don't have information on that in this module";

    private final FaqCacheService faqCacheService;
    private final UnansweredQuestionRepository unansweredQuestionRepository;
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${azure.openai.endpoint}")
    private String azureEndpoint;

    @Value("${azure.openai.key}")
    private String azureApiKey;

    @Value("${azure.openai.deployment-name}")
    private String azureDeployment;

    @Value("${azure.openai.api-version}")
    private String azureApiVersion;

    @Value("${app.rag.max-context-faqs}")
    private int maxContextFaqs;

    public String answer(String trainingId, int slideIndex, String question, String locale, String userId) {
        log.info("RAG Service called: trainingId={}, slideIndex={}, locale='{}', question='{}'",
                trainingId, slideIndex, locale, question);
        try {
            List<String> contextFaqs = fetchRelevantFaqs(trainingId, slideIndex, locale);
            log.info("Found {} relevant FAQs for context.", contextFaqs.size());

            String prompt = buildRagPrompt(question, contextFaqs, locale);
            String response = callAzureOpenAI(prompt);

            if (response.contains(NO_INFO_SIGNAL)) {
                logUnanswered(trainingId, userId, slideIndex, locale, question, response);
            }

            log.info("RAG Service successfully generated answer ({} chars)", response.length());
            return response;
        } catch (Exception e) {
            log.error("RAG query failed for question '{}': {}", question, e.getMessage());
            String fallback = "I'm sorry, I couldn't find an answer to that question right now.";
            logUnanswered(trainingId, userId, slideIndex, locale, question, fallback);
            return fallback;
        }
    }

    private void logUnanswered(String trainingId, String userId, int slideIndex,
                               String locale, String question, String aiResponse) {
        try {
            unansweredQuestionRepository.save(UnansweredQuestion.builder()
                    .id(UUID.randomUUID().toString())
                    .trainingId(trainingId)
                    .userId(userId)
                    .slideIndex(slideIndex)
                    .locale(locale)
                    .question(question)
                    .aiResponse(aiResponse)
                    .askedAt(Instant.now())
                    .reviewed(false)
                    .build());
            log.info("Logged unanswered question for training={} slide={}: '{}'", trainingId, slideIndex, question);
        } catch (Exception ex) {
            log.warn("Failed to log unanswered question: {}", ex.getMessage());
        }
    }

    private List<String> fetchRelevantFaqs(String trainingId, int slideIndex, String locale) {
        // We now fetch ALL FAQs for the training to give the LLM full context, 
        // but we still prioritize the current slide's context if it exists.
        return faqCacheService.findByTrainingId(trainingId)
                .stream()
                .limit(maxContextFaqs) // Limit context items to avoid exceeding token limits
                .map(faq -> {
                    String q = faq.getQuestions() != null
                            ? faq.getQuestions().getOrDefault(locale, faq.getQuestions().getOrDefault("en", ""))
                            : "";
                    String a = faq.getAnswers() != null
                            ? faq.getAnswers().getOrDefault(locale, faq.getAnswers().getOrDefault("en", ""))
                            : "";
                    return (faq.getSlideIndex() == slideIndex ? "[CURRENT SLIDE] " : "") + "Q: " + q + "\nA: " + a;
                })
                .collect(Collectors.toList());
    }

    private String buildRagPrompt(String question, List<String> context, String locale) {
        String contextBlock = String.join("\n\n", context);
        return String.format("""
                Context:
                %s

                User Question: %s
                """, contextBlock, question);
    }

    private String callAzureOpenAI(String prompt) throws Exception {
        String url = azureEndpoint.replaceAll("/$", "")
                + "/openai/deployments/" + azureDeployment
                + "/chat/completions?api-version=" + azureApiVersion;

        log.debug("Calling Azure OpenAI at: {}", url);

        String body = objectMapper.writeValueAsString(Map.of(
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a professional AI coach for a sales training program. "
                                + "Answer the user's question based ONLY on the provided context. "
                                + "If the answer is not in the context, say 'I don't have information on that in this module.'"),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.1,
                "max_tokens", 800
        ));

        Request request = new Request.Builder()
                .url(url)
                .addHeader("api-key", azureApiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(body, JSON))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                String errorBody = response.body() != null ? response.body().string() : "";
                throw new RuntimeException("Azure OpenAI API error (HTTP " + response.code() + "): " + errorBody);
            }
            JsonNode root = objectMapper.readTree(response.body().string());
            return root.at("/choices/0/message/content").asText("No answer available.").trim();
        }
    }
}
