package com.pitchperfect.mobile.service;

import com.pitchperfect.mobile.model.LearnerProgress;
import com.pitchperfect.mobile.repository.LearnerProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final LearnerProgressRepository learnerProgressRepository;

    public LearnerProgress getOrCreate(String userId, String trainingId, String assignmentId) {
        String progressId = userId + "_" + trainingId;
        return learnerProgressRepository.findById(progressId).orElseGet(() -> {
            LearnerProgress progress = LearnerProgress.builder()
                    .id(progressId)
                    .userId(userId)
                    .trainingId(trainingId)
                    .assignmentId(assignmentId)
                    .currentSlideIndex(0)
                    .completionPercent(0.0)
                    .quizScores(new HashMap<>())
                    .quizStatuses(new HashMap<>())
                    .status("NOT_STARTED")
                    .preferredLocale("en")
                    .build();
            return learnerProgressRepository.save(progress);
        });
    }

    public List<LearnerProgress> getAllProgress(String userId) {
        return learnerProgressRepository.findByUserId(userId);
    }

    public LearnerProgress resetProgress(String userId, String trainingId) {
        String progressId = userId + "_" + trainingId;
        LearnerProgress progress = learnerProgressRepository.findById(progressId)
                .orElseGet(() -> getOrCreate(userId, trainingId, ""));
        progress.setCurrentSlideIndex(0);
        progress.setCompletionPercent(0.0);
        progress.setStatus("NOT_STARTED");
        progress.setStartedAt(null);
        progress.setCompletedAt(null);
        progress.setLastAccessedAt(Instant.now());
        return learnerProgressRepository.save(progress);
    }

    public LearnerProgress markComplete(String userId, String trainingId) {
        String progressId = userId + "_" + trainingId;
        LearnerProgress progress = learnerProgressRepository.findById(progressId)
                .orElseGet(() -> getOrCreate(userId, trainingId, ""));
        progress.setStatus("COMPLETED");
        progress.setCompletionPercent(100.0);
        progress.setLastAccessedAt(Instant.now());
        if (progress.getCompletedAt() == null) {
            progress.setCompletedAt(Instant.now());
        }
        return learnerProgressRepository.save(progress);
    }

    public LearnerProgress updateSlide(String userId, String trainingId, int slideIndex, int totalSlides) {
        String progressId = userId + "_" + trainingId;
        String status = slideIndex >= totalSlides ? "COMPLETED" : "IN_PROGRESS";
        double percent = "COMPLETED".equals(status) ? 100.0
                       : totalSlides > 0 ? (double) slideIndex / totalSlides * 100 : 0;

        LearnerProgress progress = learnerProgressRepository.findById(progressId)
                .orElseGet(() -> getOrCreate(userId, trainingId, ""));

        progress.setCurrentSlideIndex(slideIndex);
        progress.setTotalSlides(totalSlides);
        progress.setCompletionPercent(percent);
        progress.setStatus(status);
        progress.setLastAccessedAt(Instant.now());

        if ("COMPLETED".equals(status) && progress.getCompletedAt() == null) {
            progress.setCompletedAt(Instant.now());
        }
        if (slideIndex == 1 && progress.getStartedAt() == null) {
            progress.setStartedAt(Instant.now());
        }

        return learnerProgressRepository.save(progress);
    }
}
