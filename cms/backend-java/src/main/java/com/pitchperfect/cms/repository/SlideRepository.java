package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.Slide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SlideRepository extends JpaRepository<Slide, String> {
    List<Slide> findByTrainingIdOrderBySlideIndex(String trainingId);
    long countByTrainingId(String trainingId);
    void deleteByTrainingId(String trainingId);
    Optional<Slide> findByTrainingIdAndSlideIndex(String trainingId, int slideIndex);

    @Query("SELECT s.trainingId, COUNT(s) FROM Slide s WHERE s.trainingId IN :ids GROUP BY s.trainingId")
    List<Object[]> countsByTrainingIds(@Param("ids") List<String> ids);
}
