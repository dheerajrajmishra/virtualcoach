package com.pitchperfect.cms.controller;

import com.pitchperfect.cms.model.Slide;
import com.pitchperfect.cms.model.Training;
import com.pitchperfect.cms.repository.TrainingRepository;
import com.pitchperfect.cms.service.AudioFactoryService;
import com.pitchperfect.cms.service.IngestionService;
import com.pitchperfect.cms.service.JobQueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trainings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TrainingController {

    private final IngestionService ingestionService;
    private final JobQueueService jobQueueService;
    private final AudioFactoryService audioFactoryService;
    private final TrainingRepository trainingRepository;
    private final com.pitchperfect.cms.repository.SlideRepository slideRepository;

    @PostMapping
    public ResponseEntity<Training> createTraining(
            @RequestParam String name,
            @RequestParam String category,
            @RequestParam String product,
            @RequestParam(required = false) String locales,
            @RequestHeader("X-User-Id") String userId,
            @RequestPart MultipartFile deck,
            @RequestPart MultipartFile data) throws java.io.IOException {

        List<String> selectedLocales = (locales != null && !locales.isBlank())
                ? java.util.Arrays.asList(locales.split(","))
                : null;

        Training training = ingestionService.createTraining(name, category, product, userId, selectedLocales);
        jobQueueService.enqueue(training.getId(), "PROCESS",
                IngestionService.FileData.from(deck),
                IngestionService.FileData.from(data));
        return ResponseEntity.accepted().body(training);
    }

    @GetMapping
    public ResponseEntity<List<Training>> listTrainings(
            @RequestParam(required = false, defaultValue = "false") boolean published) {

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<Training> trainings = published
                ? trainingRepository.findByStatusAndPublishedAtIsNotNull("READY", sort)
                : trainingRepository.findAll(sort);

        List<String> ids = trainings.stream().map(Training::getId).toList();
        if (!ids.isEmpty()) {
            Map<String, Long> counts = new java.util.HashMap<>();
            slideRepository.countsByTrainingIds(ids)
                    .forEach(row -> counts.put((String) row[0], (Long) row[1]));
            trainings.forEach(t -> {
                if (t.getTotalSlides() == 0) {
                    t.setTotalSlides(counts.getOrDefault(t.getId(), 0L).intValue());
                }
            });
        }
        return ResponseEntity.ok(trainings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Training> getTraining(@PathVariable String id) {
        return trainingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/slides")
    public ResponseEntity<List<com.pitchperfect.cms.model.Slide>> getSlides(@PathVariable String id) {
        if (!trainingRepository.existsById(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(
            slideRepository.findByTrainingIdOrderBySlideIndex(id)
        );
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getStatus(@PathVariable String id) {
        return trainingRepository.findById(id)
                .map(t -> {
                    Map<String, String> resp = new java.util.HashMap<>();
                    resp.put("trainingId", id);
                    resp.put("status", t.getStatus());
                    resp.put("processingStep", t.getProcessingStep() != null ? t.getProcessingStep() : "");
                    if (t.getProcessingError() != null) resp.put("processingError", t.getProcessingError());
                    return ResponseEntity.ok(resp);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/rerun")
    public ResponseEntity<Training> rerunTraining(
            @PathVariable String id,
            @RequestPart MultipartFile data) throws java.io.IOException {

        return trainingRepository.findById(id)
                .map(training -> {
                    try {
                        jobQueueService.enqueue(id, "REPROCESS", null, IngestionService.FileData.from(data));
                        return ResponseEntity.accepted().body(training);
                    } catch (java.io.IOException e) {
                        throw new RuntimeException(e);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/slides/{slideId}/transcript")
    public ResponseEntity<Slide> updateTranscript(
            @PathVariable String id,
            @PathVariable String slideId,
            @RequestBody Map<String, String> body) {

        return slideRepository.findById(slideId)
                .filter(s -> s.getTrainingId().equals(id))
                .map(slide -> {
                    String locale = body.get("locale");
                    String text = body.get("transcript");
                    if (locale == null || text == null) return ResponseEntity.badRequest().<Slide>build();
                    Map<String, String> transcripts = new HashMap<>(
                            slide.getTranscripts() != null ? slide.getTranscripts() : new HashMap<>());
                    transcripts.put(locale, text);
                    slide.setTranscripts(transcripts);
                    return ResponseEntity.ok(slideRepository.save(slide));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/slides/{slideId}/audio")
    public ResponseEntity<Object> regenerateAudio(
            @PathVariable String id,
            @PathVariable String slideId,
            @RequestParam String locale) {

        return slideRepository.findById(slideId)
                .filter(s -> s.getTrainingId().equals(id))
                .<ResponseEntity<Object>>map(slide -> {
                    try {
                        audioFactoryService.regenerateLocaleAudio(id, slide, locale);
                        return ResponseEntity.ok(slideRepository.findById(slideId).orElse(slide));
                    } catch (Exception e) {
                        return ResponseEntity.internalServerError()
                                .body(Map.of("error", e.getMessage()));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<Training> publishTraining(@PathVariable String id) {
        return trainingRepository.findById(id)
                .map(t -> {
                    t.setPublishedAt(Instant.now());
                    t.setUpdatedAt(Instant.now());
                    return ResponseEntity.ok(trainingRepository.save(t));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
