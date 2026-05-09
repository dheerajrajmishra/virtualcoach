package com.pitchperfect.cms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.cms.model.FAQ;
import com.pitchperfect.cms.repository.FaqRepository;
import com.pitchperfect.cms.repository.SlideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * RAG (Retrieval-Augmented Generation) pipeline for the learner FAQ feature.
 *
 * Flow:
 *   1. Embed the learner's question with Azure OpenAI embeddings
 *   2. Cosine-similarity search over stored FAQ embeddings (TOP_K = 3)
 *   3. Build a grounded prompt using retrieved Q&A pairs + current slide context
 *   4. Generate a locale-aware answer with gpt-4o
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private static final MediaType JSON_MEDIA   = MediaType.get("application/json");
    private static final int    TOP_K           = 3;
    private static final double MIN_SIMILARITY  = 0.55; // discard irrelevant results below threshold

    private final EmbeddingService embeddingService;
    private final FaqRepository    faqRepository;
    private final SlideRepository  slideRepository;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(90, TimeUnit.SECONDS)
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

    // ── Public DTOs ────────────────────────────────────────────────────────────

    public record FaqSource(String question, String answer, int slideIndex) {}
    public record AskResponse(String answer, List<FaqSource> sources, boolean usedRag) {}

    // ── Main entry point ───────────────────────────────────────────────────────

    /**
     * @param trainingId  Training the learner is currently viewing
     * @param question    Learner's question (any language)
     * @param locale      Desired response locale (e.g. "hi", "en")
     * @param slideIndex  Current slide index (0-based) for contextual grounding; nullable
     */
    public AskResponse ask(String trainingId, String question, String locale, Integer slideIndex) {
        String preview = question.length() > 80 ? question.substring(0, 80) + "…" : question;
        log.info("RAG ask | training={} locale={} slide={} q='{}'", trainingId, locale, slideIndex, preview);

        // 1. Embed the question (fall back to keyword search on embedding failure)
        List<Double> qVec = null;
        try {
            qVec = embeddingService.embed(question);
        } catch (Exception e) {
            log.warn("Query embedding failed, falling back to keyword match: {}", e.getMessage());
        }

        // 2. Retrieve top-K FAQs
        List<FAQ> allFaqs  = faqRepository.findByTrainingId(trainingId);
        List<FAQ> topFaqs  = retrieveTopK(allFaqs, qVec, question);

        // 3. Current slide context (title + English transcript)
        String slideCtx = buildSlideContext(trainingId, slideIndex);

        // 4. Generate grounded answer
        String answer = generateAnswer(question, topFaqs, slideCtx, locale);

        List<FaqSource> sources = topFaqs.stream()
                .map(f -> new FaqSource(
                        localisedOrDefault(f.getQuestions(), locale),
                        localisedOrDefault(f.getAnswers(),   locale),
                        f.getSlideIndex()))
                .toList();

        return new AskResponse(answer, sources, !topFaqs.isEmpty());
    }

    // ── Retrieval ──────────────────────────────────────────────────────────────

    private List<FAQ> retrieveTopK(List<FAQ> faqs, List<Double> qVec, String question) {
        if (faqs.isEmpty()) return List.of();

        if (qVec != null) {
            // Semantic path — cosine similarity
            return faqs.stream()
                    .filter(f -> f.getEmbedding() != null && !f.getEmbedding().isEmpty())
                    .map(f -> Map.entry(f, embeddingService.cosineSimilarity(qVec, f.getEmbedding())))
                    .filter(e -> e.getValue() >= MIN_SIMILARITY)
                    .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                    .limit(TOP_K)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
        } else {
            // Keyword fallback — simple substring on the English question
            String lq = question.toLowerCase();
            String prefix = lq.substring(0, Math.min(lq.length(), 25));
            return faqs.stream()
                    .filter(f -> f.getQuestions() != null
                            && f.getQuestions().getOrDefault("en", "").toLowerCase().contains(prefix))
                    .limit(TOP_K)
                    .collect(Collectors.toList());
        }
    }

    // ── Generation ─────────────────────────────────────────────────────────────

    private String generateAnswer(String question, List<FAQ> context,
                                  String slideCtx, String locale) {
        String language = localeToLanguage(locale);

        StringBuilder ctx = new StringBuilder();
        if (!slideCtx.isBlank()) {
            ctx.append("=== Current Slide ===\n").append(slideCtx).append("\n\n");
        }
        if (!context.isEmpty()) {
            ctx.append("=== Relevant FAQ Entries ===\n");
            for (int i = 0; i < context.size(); i++) {
                FAQ f = context.get(i);
                ctx.append(i + 1).append(". Q: ")
                   .append(f.getQuestions().getOrDefault("en", "")).append("\n")
                   .append("   A: ").append(f.getAnswers().getOrDefault("en", "")).append("\n");
            }
        }

        String systemPrompt =
                "You are an AI Coach embedded in a sales training platform. " +
                "Answer the learner's question using ONLY the context provided below. " +
                "If the context does not contain enough information, say so honestly and encourage " +
                "the learner to ask their trainer. " +
                "Respond in " + language + ". " +
                "Keep your answer concise (2–4 sentences), practical, and encouraging. " +
                "Never make up facts — stay strictly grounded in the provided content.";

        String userMessage = ctx.isEmpty()
                ? "Question: " + question
                : "Context:\n" + ctx + "\nLearner's question: " + question;

        try {
            String url = endpoint.replaceAll("/$", "")
                    + "/openai/deployments/" + deployment
                    + "/chat/completions?api-version=" + apiVersion;

            String body = objectMapper.writeValueAsString(Map.of(
                    "messages", List.of(
                            Map.of("role", "system",  "content", systemPrompt),
                            Map.of("role", "user",    "content", userMessage)
                    ),
                    "temperature", 0.3,
                    "max_tokens",  400
            ));

            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("api-key", apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(body, JSON_MEDIA))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) {
                    log.error("RAG generation returned HTTP {}", response.code());
                    return fallbackAnswer(locale);
                }
                JsonNode root = objectMapper.readTree(response.body().string());
                String text = root.at("/choices/0/message/content").asText("").trim();
                return text.isEmpty() ? fallbackAnswer(locale) : text;
            }
        } catch (Exception e) {
            log.error("RAG generation error: {}", e.getMessage());
            return fallbackAnswer(locale);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String buildSlideContext(String trainingId, Integer slideIndex) {
        if (slideIndex == null) return "";
        return slideRepository.findByTrainingIdOrderBySlideIndex(trainingId).stream()
                .filter(s -> s.getSlideIndex() == slideIndex)
                .findFirst()
                .map(s -> {
                    String transcript = s.getTranscripts() != null
                            ? s.getTranscripts().getOrDefault("en", "") : "";
                    return "Title: \"" + s.getTitle() + "\"\nTranscript: " + transcript;
                })
                .orElse("");
    }

    private String localisedOrDefault(Map<String, String> map, String locale) {
        if (map == null) return "";
        return map.getOrDefault(locale, map.getOrDefault("en", ""));
    }

    private String fallbackAnswer(String locale) {
        return switch (locale) {
            case "hi" -> "माफ़ करें, मुझे इस सवाल का जवाब नहीं मिला। कृपया अपने प्रशिक्षक से पूछें।";
            case "ta" -> "மன்னிக்கவும், பதில் கிடைக்கவில்லை. உங்கள் பயிற்சியாளரிடம் கேளுங்கள்.";
            case "te" -> "క్షమించండి, సమాధానం దొరకలేదు. దయచేసి మీ శిక్షకుడిని అడగండి.";
            case "mr" -> "माफ करा, उत्तर सापडले नाही. कृपया तुमच्या प्रशिक्षकाला विचारा.";
            case "bn" -> "দুঃখিত, উত্তর পাওয়া যায়নি। অনুগ্রহ করে আপনার প্রশিক্ষককে জিজ্ঞাসা করুন।";
            default   -> "Sorry, I couldn't find an answer in the training content. Please ask your trainer.";
        };
    }

    private String localeToLanguage(String locale) {
        return switch (locale) {
            case "hi" -> "Hindi";
            case "ta" -> "Tamil";
            case "te" -> "Telugu";
            case "mr" -> "Marathi";
            case "bn" -> "Bengali";
            default   -> "English";
        };
    }
}
