package com.pitchperfect.cms.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ingestion_jobs", indexes = {
        @Index(name = "idx_ingestion_jobs_status", columnList = "status"),
        @Index(name = "idx_ingestion_jobs_training_id", columnList = "training_id")
})
public class IngestionJob {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "training_id", length = 36, nullable = false)
    private String trainingId;

    /** PROCESS (new upload) or REPROCESS (re-run with new Excel). */
    @Column(name = "job_type", length = 20, nullable = false)
    private String jobType;

    /** Absolute path to the staged deck file (null for REPROCESS jobs). */
    @Column(name = "deck_path", length = 1000)
    private String deckPath;

    /** Absolute path to the staged Excel data file. */
    @Column(name = "data_path", length = 1000)
    private String dataPath;

    /** PENDING → PROCESSING → DONE | FAILED */
    @Builder.Default
    @Column(name = "status", length = 20, nullable = false)
    private String status = "PENDING";

    @Builder.Default
    @Column(name = "attempts")
    private int attempts = 0;

    @Builder.Default
    @Column(name = "max_attempts")
    private int maxAttempts = 3;

    @Column(name = "error_message", columnDefinition = "NVARCHAR(MAX)")
    private String errorMessage;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
