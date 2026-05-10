package com.pitchperfect.cms.service;

import com.pitchperfect.cms.model.IngestionJob;
import com.pitchperfect.cms.repository.IngestionJobRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Database-backed ingestion queue.
 *
 * Lifecycle of a job:
 *   PENDING → (poller claims it) → PROCESSING → DONE
 *                                             └→ PENDING  (retry if attempts < maxAttempts)
 *                                             └→ FAILED   (attempts exhausted)
 *
 * Crash recovery: on startup, any job stuck in PROCESSING is reset to PENDING
 * so the poller picks it up again from the staged files on disk.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobQueueService {

    private static final int MAX_ATTEMPTS = 3;

    private final IngestionJobRepository jobRepository;
    private final IngestionService       ingestionService;
    private final StatusService          statusService;

    @Value("${app.storage.local-path:./storage}")
    private String localStoragePath;

    // ── Enqueue ───────────────────────────────────────────────────────────────

    /**
     * Saves files to a stable staging directory, then inserts a PENDING job.
     * Returns immediately — processing happens asynchronously via the poller.
     */
    public IngestionJob enqueue(String trainingId,
                                String jobType,
                                IngestionService.FileData deck,
                                IngestionService.FileData dataExcel) throws IOException {
        String jobId  = UUID.randomUUID().toString();
        Path   jobDir = Paths.get(localStoragePath, "jobs", jobId);
        Files.createDirectories(jobDir);

        String deckPath = null;
        if (deck != null) {
            Path p = jobDir.resolve("deck." + extension(deck.filename()));
            Files.write(p, deck.bytes());
            deckPath = p.toAbsolutePath().toString();
        }

        String dataPath = null;
        if (dataExcel != null) {
            Path p = jobDir.resolve("data.xlsx");
            Files.write(p, dataExcel.bytes());
            dataPath = p.toAbsolutePath().toString();
        }

        IngestionJob job = IngestionJob.builder()
                .id(jobId)
                .trainingId(trainingId)
                .jobType(jobType)
                .deckPath(deckPath)
                .dataPath(dataPath)
                .status("PENDING")
                .attempts(0)
                .maxAttempts(MAX_ATTEMPTS)
                .createdAt(Instant.now())
                .build();

        jobRepository.save(job);
        log.info("Queued {} job {} for training {}", jobType, jobId, trainingId);
        return job;
    }

    // ── Crash recovery ────────────────────────────────────────────────────────

    /**
     * On startup, any job left in PROCESSING was mid-flight when the server
     * crashed.  Reset it to PENDING so the poller retries from the staged files.
     * If the job has already exhausted its retry budget, mark it FAILED.
     */
    @PostConstruct
    @Transactional
    public void recoverCrashedJobs() {
        List<IngestionJob> stuck = jobRepository.findByStatus("PROCESSING");
        if (stuck.isEmpty()) return;

        log.warn("Found {} stuck PROCESSING job(s) — recovering after crash", stuck.size());
        for (IngestionJob job : stuck) {
            if (job.getAttempts() >= job.getMaxAttempts()) {
                job.setStatus("FAILED");
                job.setErrorMessage("Max retry attempts reached after server restart.");
                statusService.setError(job.getTrainingId(),
                        "Processing failed: server restarted after too many attempts.");
                log.error("Job {} exhausted retries during crash recovery — marked FAILED", job.getId());
            } else {
                job.setStatus("PENDING");
                log.warn("Requeuing crashed job {} for training {} (attempt {}/{})",
                        job.getId(), job.getTrainingId(), job.getAttempts(), job.getMaxAttempts());
            }
            jobRepository.save(job);
        }
    }

    // ── Poller ────────────────────────────────────────────────────────────────

    /**
     * Polls every 5 s for the oldest PENDING job and processes it synchronously.
     * fixedDelay (not fixedRate) guarantees at most one active job at a time —
     * the next poll only starts after the current one finishes.
     */
    @Scheduled(fixedDelayString = "${app.ingestion.poll-interval-ms:5000}")
    public void pollAndProcess() {
        jobRepository.findFirstByStatusOrderByCreatedAtAsc("PENDING")
                .ifPresent(this::processJob);
    }

    // ── Job execution ─────────────────────────────────────────────────────────

    private void processJob(IngestionJob job) {
        // Claim the job before any work begins
        job.setStatus("PROCESSING");
        job.setStartedAt(Instant.now());
        job.setAttempts(job.getAttempts() + 1);
        jobRepository.save(job);

        log.info("Processing job {} ({}) for training {} — attempt {}/{}",
                job.getId(), job.getJobType(), job.getTrainingId(),
                job.getAttempts(), job.getMaxAttempts());

        try {
            IngestionService.FileData deck = loadFile(job.getDeckPath());
            IngestionService.FileData data = loadFile(job.getDataPath());

            if ("REPROCESS".equals(job.getJobType())) {
                ingestionService.reprocessTraining(job.getTrainingId(), data);
            } else {
                ingestionService.processUpload(job.getTrainingId(), deck, data);
            }

            job.setStatus("DONE");
            job.setCompletedAt(Instant.now());
            job.setErrorMessage(null);
            jobRepository.save(job);
            log.info("Job {} completed for training {}", job.getId(), job.getTrainingId());
            cleanupStagedFiles(job);

        } catch (Exception e) {
            log.error("Job {} failed (attempt {}/{}): {}",
                    job.getId(), job.getAttempts(), job.getMaxAttempts(), e.getMessage(), e);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(Instant.now());

            if (job.getAttempts() >= job.getMaxAttempts()) {
                job.setStatus("FAILED");
                statusService.setError(job.getTrainingId(), e.getMessage());
                cleanupStagedFiles(job);
            } else {
                // Back to PENDING — poller will retry after next poll interval
                job.setStatus("PENDING");
                log.warn("Job {} will be retried (next attempt {}/{})",
                        job.getId(), job.getAttempts() + 1, job.getMaxAttempts());
            }
            jobRepository.save(job);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private IngestionService.FileData loadFile(String path) throws IOException {
        if (path == null) return null;
        Path p = Paths.get(path);
        if (!Files.exists(p)) {
            throw new IOException("Staged file missing (server may have moved): " + path);
        }
        byte[] bytes = Files.readAllBytes(p);
        String name  = p.getFileName().toString();
        String ct    = name.endsWith(".xlsx")
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : name.endsWith(".pptx")
                ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                : "application/octet-stream";
        return new IngestionService.FileData(bytes, name, ct);
    }

    private void cleanupStagedFiles(IngestionJob job) {
        try {
            Path jobDir = Paths.get(localStoragePath, "jobs", job.getId());
            if (!Files.exists(jobDir)) return;
            Files.walk(jobDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
            log.debug("Cleaned up staged files for job {}", job.getId());
        } catch (Exception e) {
            log.warn("Could not clean up staged files for job {}: {}", job.getId(), e.getMessage());
        }
    }

    private static String extension(String filename) {
        if (filename == null) return "bin";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "bin";
    }
}
