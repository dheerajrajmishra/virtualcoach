package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, String> {
    List<Quiz> findByTrainingIdAndSlideIndex(String trainingId, int slideIndex);
    List<Quiz> findByTrainingId(String trainingId);
}
