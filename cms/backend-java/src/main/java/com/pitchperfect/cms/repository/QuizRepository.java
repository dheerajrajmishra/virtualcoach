package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, String> {
    List<Quiz> findByTrainingId(String trainingId);
}
