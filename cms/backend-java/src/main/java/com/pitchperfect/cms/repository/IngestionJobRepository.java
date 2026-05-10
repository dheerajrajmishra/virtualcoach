package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.IngestionJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IngestionJobRepository extends JpaRepository<IngestionJob, String> {
    Optional<IngestionJob> findFirstByStatusOrderByCreatedAtAsc(String status);
    List<IngestionJob> findByStatus(String status);
    List<IngestionJob> findByTrainingIdOrderByCreatedAtDesc(String trainingId);
}
