package com.pitchperfect.mobile.controller;

import com.pitchperfect.mobile.model.LearnerProgress;
import com.pitchperfect.mobile.model.Quiz;
import com.pitchperfect.mobile.service.FaqCacheService;
import com.pitchperfect.mobile.repository.QuizRepository;
import com.pitchperfect.mobile.service.ProgressService;
import com.pitchperfect.mobile.service.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;

import com.pitchperfect.mobile.model.LearnerProgress;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/learner")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LearnerController {

    private final ProgressService progressService;
    private final RagService ragService;
    private final FaqCacheService faqCacheService;
    private final QuizRepository quizRepository;
    private final com.pitchperfect.mobile.service.ElevenLabsSpeechService elevenLabsSpeechService;

    @GetMapping("/progress/{trainingId}")
    public ResponseEntity<LearnerProgress> getProgress(
            @PathVariable String trainingId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "") String assignmentId) {
        return ResponseEntity.ok(progressService.getOrCreate(userId, trainingId, assignmentId));
    }

    @PatchMapping("/progress/{trainingId}/slide")
    public ResponseEntity<LearnerProgress> updateSlide(
            @PathVariable String trainingId,
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Integer> body) {
        int slideIndex = body.get("slideIndex");
        int totalSlides = body.get("totalSlides");
        return ResponseEntity.ok(progressService.updateSlide(userId, trainingId, slideIndex, totalSlides));
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> askCoach(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Object> body) {
        String trainingId = (String) body.get("trainingId");
        int slideIndex = (int) body.get("slideIndex");
        String question = (String) body.get("question");
        String locale = (String) body.getOrDefault("locale", "en");

        String answer = ragService.answer(trainingId, slideIndex, question, locale, userId);
        return ResponseEntity.ok(Map.of("answer", answer));
    }

    @GetMapping("/quiz/{trainingId}/slide/{slideIndex}")
    public ResponseEntity<?> getQuiz(
            @PathVariable String trainingId,
            @PathVariable int slideIndex,
            @RequestParam(defaultValue = "en") String locale) {

        List<Quiz> quizzes = quizRepository.findByTrainingIdAndSlideIndex(trainingId, slideIndex);
        if (quizzes.isEmpty()) return ResponseEntity.noContent().build();

        Quiz quiz = quizzes.get(0);
        String question = quiz.getQuestions() != null
                ? quiz.getQuestions().getOrDefault(locale, quiz.getQuestions().getOrDefault("en", ""))
                : "";

        return ResponseEntity.ok(Map.of(
                "id",         quiz.getId(),
                "slideIndex", quiz.getSlideIndex(),
                "question",   question,
                "inputType",  quiz.getInputType() != null ? quiz.getInputType() : "text",
                "maxScore",   quiz.getMaxScore()
        ));
    }

    @GetMapping("/all-progress")
    public ResponseEntity<List<LearnerProgress>> getAllProgress(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(progressService.getAllProgress(userId));
    }

    @PostMapping("/progress/{trainingId}/complete")
    public ResponseEntity<LearnerProgress> markComplete(
            @PathVariable String trainingId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(progressService.markComplete(userId, trainingId));
    }

    @PostMapping("/progress/{trainingId}/reset")
    public ResponseEntity<LearnerProgress> resetProgress(
            @PathVariable String trainingId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(progressService.resetProgress(userId, trainingId));
    }

    @GetMapping("/faq-hints/{trainingId}")
    public ResponseEntity<List<String>> faqHints(
            @PathVariable String trainingId,
            @RequestParam(defaultValue = "en") String locale) {

        List<String> questions = faqCacheService.findByTrainingId(trainingId).stream()
                .map(faq -> faq.getQuestions() != null
                        ? faq.getQuestions().getOrDefault(locale, faq.getQuestions().getOrDefault("en", ""))
                        : "")
                .filter(q -> !q.isBlank())
                .distinct()
                .collect(Collectors.toList());
        return ResponseEntity.ok(questions);
    }

    @PostMapping("/transcribe")
    public ResponseEntity<Map<String, String>> transcribeAudio(
            @RequestPart MultipartFile audio,
            @RequestParam(defaultValue = "en") String locale) throws java.io.IOException {
        String text = elevenLabsSpeechService.transcribe(audio.getBytes(), audio.getContentType(), locale);
        return ResponseEntity.ok(Map.of("text", text));
    }
}
