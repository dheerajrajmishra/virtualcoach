package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.Training;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingRepository extends JpaRepository<Training, String> {
}
