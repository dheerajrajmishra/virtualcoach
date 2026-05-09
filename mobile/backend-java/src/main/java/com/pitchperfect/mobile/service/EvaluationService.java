package com.pitchperfect.mobile.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchperfect.mobile.model.EvaluationResult;
import com.pitchperfect.mobile.model.Quiz;
import com.pitchperfect.mobile.model.QuizSubmission;
import com.pitchperfect.mobile.repository.EvaluationResultRepository;
import com.pitchperfect.mobile.repository.LearnerProgressRepository;
import com.pitchperfect.mobile.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationService {

    private static final MediaType JSON = MediaType.get("application/json");

    private final QuizRepository quizRepository;
    private final EvaluationResultRepository evaluationResultRepository;
    private final LearnerProgressRepository learnerProgressRepository;
    private final AzureSpeechService azureSpeechService;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(90, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
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

    public EvaluationResult evaluate(QuizSubmission submission) {
        try {
            Quiz quiz = quizRepository.findById(submission.getQuizId())
                    .orElseThrow(() -> new RuntimeException("Quiz not found: " + submission.getQuizId()));

            String expectedAnswer = getLocalizedOrDefault(quiz.getExpectedAnswers(), submission.getLocale());
            String rubric = getLocalizedOrDefault(quiz.getRubrics(), submission.getLocale());
            int maxScore = quiz.getMaxScore() > 0 ? quiz.getMaxScore() : 10;

            // For audio/video submissions, transcribe with Azure Speech STT first
            String responseText = resolveResponseText(submission);

            String prompt = buildEvaluationPrompt(responseText, expectedAnswer, rubric, maxScore);
            String llmResponse = callAzureOpenAI(prompt);

            EvaluationResult result = parseEvaluationResponse(llmResponse, submission, maxScore);
            persistResult(result, submission.getTrainingId());
            return result;
        } catch (Exception e) {
            log.error("Evaluation failed for submission {}: {}", submission.getId(), e.getMessage(), e);
            return EvaluationResult.builder()
                    .submissionId(submission.getId())
                    .quizId(submission.getQuizId())
                    .userId(submission.getUserId())
                    .trainingId(submission.getTrainingId())
                    .score(0)
                    .maxScore(10)
                    .feedback("Evaluation could not be completed. Please try again.")
                    .evaluatedAt(Instant.now())
                    .build();
        }
    }

    /**
     * Returns a plain-text version of the learner's response.
     * Audio and video inputs are first transcribed via Azure Speech STT.
     */
    private String resolveResponseText(QuizSubmission submission) {
        return switch (submission.getInputType()) {
            case "audio", "video" -> {
                if (submission.getMediaGcsUrl() != null && !submission.getMediaGcsUrl().isBlank()) {
                    log.info("Transcribing {} submission {} via Azure Speech",
                            submission.getInputType(), submission.getId());
                    String transcript = azureSpeechService.transcribe(
                            submission.getMediaGcsUrl(), submission.getLocale());
                    if (transcript.isBlank()) {
                        log.warn("Transcription returned empty for submission {}; proceeding with empty response",
                                submission.getId());
                    }
                    yield transcript;
                }
                yield "";
            }
            default -> submission.getTextResponse() != null ? submission.getTextResponse() : "";
        };
    }

    private String buildEvaluationPrompt(String responseText, String expectedAnswer,
                                          String rubric, int maxScore) {
        return String.format("""
                You are an expert sales training evaluator. Evaluate the learner's response below.

                Expected Answer: %s

                Scoring Rubric: %s

                Max Score: %d

                Learner's Response:
                %s

                Respond ONLY with valid JSON in this exact format:
                {
                  "score": <integer 0 to %d>,
                  "feedback": "<overall feedback in 2-3 sentences>",
                  "strengths": "<what the learner did well>",
                  "improvements": "<specific areas to improve>"
                }
                """, expectedAnswer, rubric, maxScore,
                responseText.isBlank() ? "(no response provided)" : responseText,
                maxScore);
    }

    private String callAzureOpenAI(String prompt) throws Exception {
        String url = endpoint.replaceAll("/$", "")
                + "/openai/deployments/" + deployment
                + "/chat/completions?api-version=" + apiVersion;

        String body = objectMapper.writeValueAsString(Map.of(
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are an expert sales training evaluator. Respond only with valid JSON."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2,
                "max_tokens", 800,
                "response_format", Map.of("type", "json_object")
        ));

        Request request = new Request.Builder()
                .url(url)
                .addHeader("api-key", apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(body, JSON))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Azure OpenAI evaluation error: HTTP " + response.code());
            }
            JsonNode root = objectMapper.readTree(response.body().string());
            return root.at("/choices/0/message/content").asText();
        }
    }

    private EvaluationResult parseEvaluationResponse(String json, QuizSubmission submission, int maxScore)
            throws Exception {
        JsonNode node = objectMapper.readTree(json.trim().replaceAll("```json|```", "").trim());
        int score = Math.min(node.path("score").asInt(0), maxScore);

        return EvaluationResult.builder()
                .submissionId(submission.getId())
                .quizId(submission.getQuizId())
                .userId(submission.getUserId())
                .trainingId(submission.getTrainingId())
                .score(score)
                .maxScore(maxScore)
                .scorePercent((double) score / maxScore * 100)
                .feedback(node.path("feedback").asText())
                .strengths(node.path("strengths").asText())
                .improvements(node.path("improvements").asText())
                .evaluatedAt(Instant.now())
                .build();
    }

    private void persistResult(EvaluationResult result, String trainingId) {
        evaluationResultRepository.save(result);
        String progressId = result.getUserId() + "_" + trainingId;
        learnerProgressRepository.findById(progressId).ifPresent(p -> {
            p.getQuizScores().put(result.getQuizId(), result.getScore());
            p.getQuizStatuses().put(result.getQuizId(), "GRADED");
            learnerProgressRepository.save(p);
        });
    }

    private String getLocalizedOrDefault(Map<String, String> map, String locale) {
        if (map == null) return "";
        return map.getOrDefault(locale, map.getOrDefault("en", ""));
    }
}
