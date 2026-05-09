package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.Training;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingRepository extends JpaRepository<Training, String> {

    /** Returns only trainings that have been explicitly published by an admin. */
    List<Training> findByStatusAndPublishedAtIsNotNull(String status, Sort sort);
}
