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
@Table(name = "quiz_submissions")
public class QuizSubmission {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "training_id", length = 36)
    private String trainingId;

    @Column(name = "quiz_id", length = 36)
    private String quizId;

    @Column(name = "input_type", length = 20)
    private String inputType;

    @Column(name = "text_response", columnDefinition = "NVARCHAR(MAX)")
    private String textResponse;

    @Column(name = "media_gcs_url", length = 1000)
    private String mediaGcsUrl;

    @Column(name = "locale", length = 10)
    private String locale;

    @Column(name = "submitted_at")
    private Instant submittedAt;
}
