package com.pitchperfect.mobile.controller;

import com.pitchperfect.mobile.model.LearnerProgress;
import com.pitchperfect.mobile.service.ProgressService;
import com.pitchperfect.mobile.service.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/learner")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LearnerController {

    private final ProgressService progressService;
    private final RagService ragService;

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

        String answer = ragService.answer(trainingId, slideIndex, question, locale);
        return ResponseEntity.ok(Map.of("answer", answer));
    }
}
