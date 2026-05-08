package com.pitchperfect.mobile.repository;

import com.pitchperfect.mobile.model.FAQ;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRepository extends JpaRepository<FAQ, String> {
    List<FAQ> findByTrainingIdAndSlideIndex(String trainingId, int slideIndex);
}
