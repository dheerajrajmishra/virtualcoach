package com.pitchperfect.cms.controller;

import com.pitchperfect.cms.model.Training;
import com.pitchperfect.cms.repository.TrainingRepository;
import com.pitchperfect.cms.service.IngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/trainings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TrainingController {

    private final IngestionService ingestionService;
    private final TrainingRepository trainingRepository;

    @PostMapping
    public ResponseEntity<Training> createTraining(
            @RequestParam String name,
            @RequestParam String category,
            @RequestParam String product,
            @RequestHeader("X-User-Id") String userId,
            @RequestPart MultipartFile deck,
            @RequestPart MultipartFile transcripts,
            @RequestPart MultipartFile faqs,
            @RequestPart MultipartFile quizzes) {

        Training training = ingestionService.createTraining(name, category, product, userId);
        ingestionService.processUpload(training.getId(), deck, transcripts, faqs, quizzes);
        return ResponseEntity.accepted().body(training);
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getStatus(@PathVariable String id) {
        return trainingRepository.findById(id)
                .map(t -> ResponseEntity.ok(Map.of("trainingId", id, "status", t.getStatus())))
                .orElse(ResponseEntity.notFound().build());
    }
}
