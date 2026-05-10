package com.pitchperfect.mobile.controller;

import com.pitchperfect.mobile.model.UnansweredQuestion;
import com.pitchperfect.mobile.repository.UnansweredQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final UnansweredQuestionRepository unansweredQuestionRepository;

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "askedAt");

    /** All unreviewed questions, newest first. Optionally filter by trainingId. */
    @GetMapping("/unanswered-questions")
    public ResponseEntity<List<UnansweredQuestion>> listUnanswered(
            @RequestParam(required = false) String trainingId) {

        List<UnansweredQuestion> results = trainingId != null
                ? unansweredQuestionRepository.findByTrainingId(trainingId, NEWEST_FIRST)
                        .stream().filter(q -> !q.isReviewed()).collect(Collectors.toList())
                : unansweredQuestionRepository.findByReviewed(false, NEWEST_FIRST);

        return ResponseEntity.ok(results);
    }

    /** Frequency summary: which questions are asked most often for a training. */
    @GetMapping("/unanswered-questions/summary/{trainingId}")
    public ResponseEntity<List<Map<String, Object>>> summary(@PathVariable String trainingId) {
        List<Map<String, Object>> rows = unansweredQuestionRepository
                .countByQuestionForTraining(trainingId)
                .stream()
                .map(r -> Map.<String, Object>of("question", r[0], "count", r[1]))
                .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    /** Mark a question as reviewed (added to FAQ or dismissed). */
    @PatchMapping("/unanswered-questions/{id}/reviewed")
    public ResponseEntity<UnansweredQuestion> markReviewed(@PathVariable String id) {
        return unansweredQuestionRepository.findById(id)
                .map(q -> {
                    q.setReviewed(true);
                    return ResponseEntity.ok(unansweredQuestionRepository.save(q));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
