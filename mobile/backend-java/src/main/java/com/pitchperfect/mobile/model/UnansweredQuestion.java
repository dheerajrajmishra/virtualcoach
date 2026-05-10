package com.pitchperfect.mobile.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "unanswered_questions", indexes = {
        @Index(name = "idx_uq_training_id", columnList = "training_id"),
        @Index(name = "idx_uq_reviewed",    columnList = "reviewed"),
        @Index(name = "idx_uq_asked_at",    columnList = "asked_at")
})
public class UnansweredQuestion {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "training_id", length = 36, nullable = false)
    private String trainingId;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "slide_index")
    private int slideIndex;

    @Column(name = "locale", length = 10)
    private String locale;

    @Column(name = "question", columnDefinition = "NVARCHAR(MAX)", nullable = false)
    private String question;

    @Column(name = "ai_response", columnDefinition = "NVARCHAR(MAX)")
    private String aiResponse;

    @Column(name = "asked_at", nullable = false)
    private Instant askedAt;

    @Column(name = "reviewed", nullable = false)
    private boolean reviewed;
}
