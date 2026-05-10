package com.pitchperfect.mobile.controller;

import com.pitchperfect.mobile.model.EvaluationResult;
import com.pitchperfect.mobile.model.UnansweredQuestion;
import com.pitchperfect.mobile.repository.EvaluationResultRepository;
import com.pitchperfect.mobile.repository.UnansweredQuestionRepository;
import com.pitchperfect.mobile.repository.LearnerProgressRepository;
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
    private final EvaluationResultRepository evaluationResultRepository;
    private final LearnerProgressRepository learnerProgressRepository;

    private static final Sort NEWEST_FIRST     = Sort.by(Sort.Direction.DESC, "askedAt");
    private static final Sort EVAL_NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "evaluatedAt");

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

    @GetMapping("/evaluations")
    public ResponseEntity<List<EvaluationResult>> listEvaluations(
            @RequestParam(required = false) String trainingId) {

        List<EvaluationResult> results = trainingId != null
                ? evaluationResultRepository.findByTrainingId(trainingId, EVAL_NEWEST_FIRST)
                : evaluationResultRepository.findAllByOrderByEvaluatedAtDesc();
        return ResponseEntity.ok(results);
    }

    /** All learner progress records. Optionally filter by trainingId. */
    @GetMapping("/progress")
    public ResponseEntity<List<com.pitchperfect.mobile.model.LearnerProgress>> listProgress(
            @RequestParam(required = false) String trainingId) {
        
        // Note: ProgressService doesn't have a findByTrainingId yet, 
        // we can use the repository directly here for admin purposes.
        List<com.pitchperfect.mobile.model.LearnerProgress> results = trainingId != null
                ? learnerProgressRepository.findAll().stream()
                    .filter(p -> p.getTrainingId().equals(trainingId))
                    .collect(Collectors.toList())
                : learnerProgressRepository.findAll();
        return ResponseEntity.ok(results);
    }

    /** Per-training average score summary. */
    @GetMapping("/evaluations/summary")
    public ResponseEntity<List<Map<String, Object>>> evalSummary() {
        List<Map<String, Object>> rows = evaluationResultRepository.avgScoreByTraining()
                .stream()
                .map(r -> Map.<String, Object>of(
                        "trainingId",    r[0],
                        "avgScore",      Math.round((double) r[1]),
                        "submissions",   r[2]))
                .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }
}
