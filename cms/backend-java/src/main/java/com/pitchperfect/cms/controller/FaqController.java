package com.pitchperfect.cms.controller;

import com.pitchperfect.cms.service.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Exposes the RAG-backed FAQ endpoint for the mobile learner app.
 *
 * POST /api/trainings/{id}/ask
 *   Body:  { "question": "...", "locale": "hi", "slideIndex": 2 }
 *   Returns: { "answer": "...", "sources": [...], "usedRag": true }
 */
@RestController
@RequestMapping("/api/trainings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FaqController {

    private final RagService ragService;

    public record AskRequest(String question, String locale, Integer slideIndex) {}

    @PostMapping("/{id}/ask")
    public ResponseEntity<RagService.AskResponse> ask(
            @PathVariable String id,
            @RequestBody AskRequest body,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        if (body.question() == null || body.question().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String locale = (body.locale() != null && !body.locale().isBlank()) ? body.locale() : "en";
        try {
            return ResponseEntity.ok(ragService.ask(id, body.question(), locale, body.slideIndex()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
