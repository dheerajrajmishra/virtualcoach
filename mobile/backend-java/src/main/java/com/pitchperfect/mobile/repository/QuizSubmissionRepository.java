package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.QuizSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizSubmissionRepository extends JpaRepository<QuizSubmission, String> {
}
