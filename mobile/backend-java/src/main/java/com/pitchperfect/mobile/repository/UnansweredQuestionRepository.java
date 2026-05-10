package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.UnansweredQuestion;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UnansweredQuestionRepository extends JpaRepository<UnansweredQuestion, String> {

    List<UnansweredQuestion> findByTrainingId(String trainingId, Sort sort);

    List<UnansweredQuestion> findByReviewed(boolean reviewed, Sort sort);

    @Query("SELECT u.question, COUNT(u) AS cnt FROM UnansweredQuestion u " +
           "WHERE u.trainingId = :trainingId AND u.reviewed = false " +
           "GROUP BY u.question ORDER BY cnt DESC")
    List<Object[]> countByQuestionForTraining(String trainingId);
}
