package com.pitchperfect.cms.controller;

import com.pitchperfect.cms.model.Assignment;
import com.pitchperfect.cms.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssignmentController {

    private final AssignmentRepository assignmentRepository;

    @PostMapping
    public ResponseEntity<Assignment> createAssignment(
            @RequestBody Map<String, Object> body,
            @RequestHeader("X-User-Id") String assignedBy) {

        Assignment assignment = Assignment.builder()
                .id(UUID.randomUUID().toString())
                .userId((String) body.get("userId"))
                .trainingId((String) body.get("trainingId"))
                .product((String) body.get("product"))
                .status("ASSIGNED")
                .deadline(Instant.parse((String) body.get("deadline")))
                .assignedAt(Instant.now())
                .assignedBy(assignedBy)
                .build();

        assignmentRepository.save(assignment);
        return ResponseEntity.ok(assignment);
    }

    @GetMapping
    public ResponseEntity<List<Assignment>> listAssignments(
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String userId) {

        List<Assignment> results;
        if (product != null && userId != null) {
            results = assignmentRepository.findByProductAndUserId(product, userId);
        } else if (product != null) {
            results = assignmentRepository.findByProduct(product);
        } else if (userId != null) {
            results = assignmentRepository.findByUserId(userId);
        } else {
            results = assignmentRepository.findAll();
        }
        return ResponseEntity.ok(results);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {

        assignmentRepository.findById(id).ifPresent(a -> {
            a.setStatus(body.get("status"));
            assignmentRepository.save(a);
        });
        return ResponseEntity.noContent().build();
    }
}
