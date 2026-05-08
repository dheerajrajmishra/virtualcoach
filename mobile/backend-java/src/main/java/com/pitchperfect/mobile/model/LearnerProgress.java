package com.pitchperfect.mobile.model;

import com.pitchperfect.mobile.converter.JsonIntegerMapConverter;
import com.pitchperfect.mobile.converter.JsonMapConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "learner_progress")
public class LearnerProgress {

    @Id
    @Column(name = "id", length = 255)
    private String id;

    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "training_id", length = 36)
    private String trainingId;

    @Column(name = "assignment_id", length = 36)
    private String assignmentId;

    @Column(name = "current_slide_index")
    private int currentSlideIndex;

    @Column(name = "total_slides")
    private int totalSlides;

    @Column(name = "completion_percent")
    private double completionPercent;

    @Convert(converter = JsonIntegerMapConverter.class)
    @Column(name = "quiz_scores", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, Integer> quizScores;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "quiz_statuses", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> quizStatuses;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "preferred_locale", length = 10)
    private String preferredLocale;
}
