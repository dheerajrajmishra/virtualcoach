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
@Table(name = "evaluation_results")
public class EvaluationResult {

    @Id
    @Column(name = "submission_id", length = 36)
    private String submissionId;

    @Column(name = "quiz_id", length = 36)
    private String quizId;

    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "training_id", length = 36)
    private String trainingId;

    @Column(name = "score")
    private int score;

    @Column(name = "max_score")
    private int maxScore;

    @Column(name = "score_percent")
    private double scorePercent;

    @Column(name = "feedback", columnDefinition = "NVARCHAR(MAX)")
    private String feedback;

    @Column(name = "strengths", columnDefinition = "NVARCHAR(MAX)")
    private String strengths;

    @Column(name = "improvements", columnDefinition = "NVARCHAR(MAX)")
    private String improvements;

    @Column(name = "evaluated_at")
    private Instant evaluatedAt;
}
