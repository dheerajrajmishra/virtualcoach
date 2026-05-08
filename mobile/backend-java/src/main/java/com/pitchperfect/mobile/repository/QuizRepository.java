package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepository extends JpaRepository<Quiz, String> {
}
