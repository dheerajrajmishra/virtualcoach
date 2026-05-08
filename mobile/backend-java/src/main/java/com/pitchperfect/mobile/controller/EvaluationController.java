package com.pitchperfect.mobile.controller;

import com.pitchperfect.mobile.model.EvaluationResult;
import com.pitchperfect.mobile.model.QuizSubmission;
import com.pitchperfect.mobile.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/evaluation")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EvaluationController {

    private final EvaluationService evaluationService;

    @PostMapping("/submit/text")
    public ResponseEntity<EvaluationResult> submitText(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String trainingId,
            @RequestParam String quizId,
            @RequestParam String locale,
            @RequestParam String response) {

        QuizSubmission submission = QuizSubmission.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .trainingId(trainingId)
                .quizId(quizId)
                .inputType("text")
                .textResponse(response)
                .locale(locale)
                .submittedAt(Instant.now())
                .build();

        return ResponseEntity.accepted().body(evaluationService.evaluate(submission));
    }

    @PostMapping("/submit/media")
    public ResponseEntity<EvaluationResult> submitMedia(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String trainingId,
            @RequestParam String quizId,
            @RequestParam String inputType,
            @RequestParam String locale,
            @RequestParam String mediaGcsUrl) {

        QuizSubmission submission = QuizSubmission.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .trainingId(trainingId)
                .quizId(quizId)
                .inputType(inputType)
                .mediaGcsUrl(mediaGcsUrl)
                .locale(locale)
                .submittedAt(Instant.now())
                .build();

        return ResponseEntity.accepted().body(evaluationService.evaluate(submission));
    }
}
