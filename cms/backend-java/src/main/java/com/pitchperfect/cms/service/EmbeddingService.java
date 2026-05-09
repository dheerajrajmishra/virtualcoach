package com.pitchperfect.cms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.cms.model.FAQ;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Generates dense vector embeddings via Azure OpenAI (text-embedding-3-small by default).
 * Embeddings are stored on FAQ.embedding so that RagService can do cosine-similarity
 * retrieval at query time without a dedicated vector database.
 */
@Slf4j
@Service
public class EmbeddingService {

    private static final MediaType JSON_MEDIA = MediaType.get("application/json");

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${azure.openai.endpoint}")
    private String endpoint;

    @Value("${azure.openai.key}")
    private String apiKey;

    @Value("${azure.openai.embedding-deployment:text-embedding-3-small}")
    private String embeddingDeployment;

    @Value("${azure.openai.api-version}")
    private String apiVersion;

    // ── Batch ingestion helper ─────────────────────────────────────────────────

    /**
     * Embeds the English question of every FAQ in the list.
     * FAQs with no English question, or that fail, are left with a null embedding
     * (they simply won't appear in semantic search results — graceful degradation).
     */
    public List<FAQ> generateEmbeddings(List<FAQ> faqs) {
        if (faqs.isEmpty()) return faqs;
        log.info("Generating embeddings for {} FAQs using deployment '{}'", faqs.size(), embeddingDeployment);
        int ok = 0;
        for (FAQ faq : faqs) {
            String question = faq.getQuestions() != null ? faq.getQuestions().get("en") : null;
            if (question == null || question.isBlank()) continue;
            try {
                List<Double> vec = embed(question);
                if (vec != null) {
                    faq.setEmbedding(vec);
                    ok++;
                }
            } catch (Exception e) {
                log.warn("Embedding failed for FAQ {}: {}", faq.getId(), e.getMessage());
            }
        }
        log.info("Embedded {}/{} FAQs successfully", ok, faqs.size());
        return faqs;
    }

    // ── Core embedding call ────────────────────────────────────────────────────

    /**
     * Calls Azure OpenAI embeddings endpoint and returns the float vector.
     * Returns null on any non-retriable error so callers can decide on fallback.
     */
    public List<Double> embed(String text) throws Exception {
        String url = endpoint.replaceAll("/$", "")
                + "/openai/deployments/" + embeddingDeployment
                + "/embeddings?api-version=" + apiVersion;

        String body = objectMapper.writeValueAsString(Map.of("input", text));

        Request request = new Request.Builder()
                .url(url)
                .addHeader("api-key", apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(body, JSON_MEDIA))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                log.warn("Embedding API returned HTTP {}", response.code());
                return null;
            }
            JsonNode root = objectMapper.readTree(response.body().string());
            JsonNode arr = root.at("/data/0/embedding");
            if (arr.isMissingNode() || !arr.isArray()) {
                log.warn("Unexpected embedding response shape — missing /data/0/embedding");
                return null;
            }
            List<Double> vec = new ArrayList<>(arr.size());
            for (JsonNode v : arr) vec.add(v.asDouble());
            return vec;
        }
    }

    // ── Similarity math ────────────────────────────────────────────────────────

    /**
     * Cosine similarity in [−1, 1].  Returns 0.0 if either vector is null or lengths differ.
     */
    public double cosineSimilarity(List<Double> a, List<Double> b) {
        if (a == null || b == null || a.size() != b.size()) return 0.0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.size(); i++) {
            double ai = a.get(i), bi = b.get(i);
            dot   += ai * bi;
            normA += ai * ai;
            normB += bi * bi;
        }
        return (normA == 0 || normB == 0) ? 0.0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
