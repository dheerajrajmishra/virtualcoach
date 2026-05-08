package com.pitchperfect.cms.service;

import com.pitchperfect.cms.repository.TrainingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatusService {

    private final TrainingRepository trainingRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void setStep(String trainingId, String status, String step) {
        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setStatus(status);
            t.setProcessingStep(step);
            t.setProcessingError(null);
            t.setUpdatedAt(Instant.now());
            trainingRepository.saveAndFlush(t);
            log.info("STATUS UPDATE: {} -> {}/{}", trainingId, status, step);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void setError(String trainingId, String errorMsg) {
        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setStatus("ERROR");
            t.setProcessingStep("FAILED");
            t.setProcessingError(
                    errorMsg != null ? errorMsg.substring(0, Math.min(errorMsg.length(), 1999)) : "Unknown error");
            t.setUpdatedAt(Instant.now());
            trainingRepository.saveAndFlush(t);
            log.error("Error updated for {}: {}", trainingId, errorMsg);
        });
    }
}
