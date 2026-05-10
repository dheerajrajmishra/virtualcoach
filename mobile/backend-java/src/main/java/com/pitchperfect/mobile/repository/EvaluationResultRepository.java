package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.EvaluationResult;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EvaluationResultRepository extends JpaRepository<EvaluationResult, String> {

    List<EvaluationResult> findByTrainingId(String trainingId, Sort sort);

    List<EvaluationResult> findAllByOrderByEvaluatedAtDesc();

    @Query("SELECT e.trainingId, AVG(e.scorePercent), COUNT(e) FROM EvaluationResult e GROUP BY e.trainingId")
    List<Object[]> avgScoreByTraining();
}
