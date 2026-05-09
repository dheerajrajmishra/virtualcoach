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

    public String answer(String trainingId, int slideIndex, String question, String locale) {
        log.info("RAG Service called: trainingId={}, slideIndex={}, locale='{}', question='{}'",
                trainingId, slideIndex, locale, question);
        try {
            List<String> contextFaqs = fetchRelevantFaqs(trainingId, slideIndex, locale);
            log.info("Found {} relevant FAQs for context.", contextFaqs.size());
            
            String prompt = buildRagPrompt(question, contextFaqs, locale);
            String response = callAzureOpenAI(prompt);
            
            log.info("RAG Service successfully generated answer ({} chars)", response.length());
            return response;
        } catch (Exception e) {
            log.error("RAG query failed for question '{}': {}", question, e.getMessage());
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
