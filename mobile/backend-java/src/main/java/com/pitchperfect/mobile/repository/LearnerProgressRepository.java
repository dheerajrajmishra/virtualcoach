package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.LearnerProgress;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerProgressRepository extends JpaRepository<LearnerProgress, String> {
}
