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

@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationService {

    private static final MediaType JSON = MediaType.get("application/json");

    private final QuizRepository quizRepository;
    private final EvaluationResultRepository evaluationResultRepository;
    private final LearnerProgressRepository learnerProgressRepository;
    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.gemini.api-key}")
    private String geminiApiKey;

    @Value("${app.gemini.base-url}")
    private String geminiBaseUrl;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Async
    public EvaluationResult evaluate(QuizSubmission submission) {
        try {
            Quiz quiz = quizRepository.findById(submission.getQuizId())
                    .orElseThrow(() -> new RuntimeException("Quiz not found: " + submission.getQuizId()));

            String expectedAnswer = getLocalizedOrDefault(quiz.getExpectedAnswers(), submission.getLocale());
            String rubric = getLocalizedOrDefault(quiz.getRubrics(), submission.getLocale());
            int maxScore = quiz.getMaxScore() > 0 ? quiz.getMaxScore() : 10;

            String geminiPrompt = buildEvaluationPrompt(submission, expectedAnswer, rubric, maxScore);
            String geminiResponse = callGemini(geminiPrompt, submission);

            EvaluationResult result = parseEvaluationResponse(geminiResponse, submission, maxScore);
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

    private String buildEvaluationPrompt(QuizSubmission submission, String expectedAnswer,
                                          String rubric, int maxScore) {
        String userResponseSection = switch (submission.getInputType()) {
            case "text" -> "User's Text Response:\n" + submission.getTextResponse();
            case "audio" -> "User submitted an audio recording. GCS URL: " + submission.getMediaGcsUrl() +
                    "\nTranscribe and evaluate the spoken response.";
            case "video" -> "User submitted a video recording. GCS URL: " + submission.getMediaGcsUrl() +
                    "\nAnalyze both verbal content and presentation in the video.";
            default -> "User Response: " + submission.getTextResponse();
        };

        return String.format("""
                You are an expert sales training evaluator. Evaluate the learner's response.

                Expected Answer: %s

                Scoring Rubric: %s

                Max Score: %d

                %s

                Respond ONLY with valid JSON in this exact format:
                {
                  "score": <integer 0 to %d>,
                  "feedback": "<overall feedback in 2-3 sentences>",
                  "strengths": "<what the learner did well>",
                  "improvements": "<specific areas to improve>"
                }
                """, expectedAnswer, rubric, maxScore, userResponseSection, maxScore);
    }

    private String callGemini(String prompt, QuizSubmission submission) throws Exception {
        Object contentsPayload;

        if ("text".equals(submission.getInputType())) {
            contentsPayload = List.of(Map.of(
                    "parts", List.of(Map.of("text", prompt))
            ));
        } else {
            contentsPayload = List.of(Map.of(
                    "parts", List.of(
                            Map.of("text", prompt),
                            Map.of("fileData", Map.of(
                                    "mimeType", "audio".equals(submission.getInputType()) ? "audio/mpeg" : "video/mp4",
                                    "fileUri", submission.getMediaGcsUrl()
                            ))
                    )
            ));
        }

        String reqBody = objectMapper.writeValueAsString(Map.of("contents", contentsPayload));

        Request request = new Request.Builder()
                .url(geminiBaseUrl + "/models/" + geminiModel + ":generateContent?key=" + geminiApiKey)
                .post(RequestBody.create(reqBody, JSON))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Gemini API error: " + response.code());
            }
            JsonNode root = objectMapper.readTree(response.body().string());
            return root.at("/candidates/0/content/parts/0/text").asText();
        }
    }

    private EvaluationResult parseEvaluationResponse(String json, QuizSubmission submission, int maxScore)
            throws Exception {
        JsonNode node = objectMapper.readTree(json.trim().replaceAll("```json|```", "").trim());
        int score = Math.min(node.get("score").asInt(), maxScore);

        return EvaluationResult.builder()
                .submissionId(submission.getId())
                .quizId(submission.getQuizId())
                .userId(submission.getUserId())
                .trainingId(submission.getTrainingId())
                .score(score)
                .maxScore(maxScore)
                .scorePercent((double) score / maxScore * 100)
                .feedback(node.get("feedback").asText())
                .strengths(node.get("strengths").asText())
                .improvements(node.get("improvements").asText())
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
