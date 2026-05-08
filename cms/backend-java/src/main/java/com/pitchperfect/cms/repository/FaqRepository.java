package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.FAQ;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRepository extends JpaRepository<FAQ, String> {
    List<FAQ> findByTrainingId(String trainingId);
    void deleteByTrainingId(String trainingId);
}
