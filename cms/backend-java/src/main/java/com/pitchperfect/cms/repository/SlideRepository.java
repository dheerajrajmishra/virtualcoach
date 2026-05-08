package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.Slide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SlideRepository extends JpaRepository<Slide, String> {
    List<Slide> findByTrainingIdOrderBySlideIndex(String trainingId);
}
