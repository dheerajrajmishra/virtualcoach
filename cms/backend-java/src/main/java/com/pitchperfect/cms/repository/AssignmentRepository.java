package com.pitchperfect.cms.repository;

import com.pitchperfect.cms.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    List<Assignment> findByProduct(String product);
    List<Assignment> findByUserId(String userId);
    List<Assignment> findByProductAndUserId(String product, String userId);
}
