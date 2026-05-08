package com.pitchperfect.mobile.service;

import com.pitchperfect.mobile.model.LearnerProgress;
import com.pitchperfect.mobile.repository.LearnerProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;

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

    public LearnerProgress updateSlide(String userId, String trainingId, int slideIndex, int totalSlides) {
        String progressId = userId + "_" + trainingId;
        double percent = (double) slideIndex / totalSlides * 100;
        String status = slideIndex >= totalSlides - 1 ? "COMPLETED" : "IN_PROGRESS";

        LearnerProgress progress = learnerProgressRepository.findById(progressId)
                .orElseGet(() -> getOrCreate(userId, trainingId, ""));

        progress.setCurrentSlideIndex(slideIndex);
        progress.setTotalSlides(totalSlides);
        progress.setCompletionPercent(percent);
        progress.setStatus(status);
        progress.setLastAccessedAt(Instant.now());

        if ("COMPLETED".equals(status)) {
            progress.setCompletedAt(Instant.now());
        }
        if (slideIndex == 0) {
            progress.setStartedAt(Instant.now());
        }

        return learnerProgressRepository.save(progress);
    }
}
