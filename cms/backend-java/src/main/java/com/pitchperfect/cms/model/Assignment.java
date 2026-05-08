package com.pitchperfect.cms.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "assignments")
public class Assignment {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "training_id", length = 36)
    private String trainingId;

    @Column(name = "product", length = 255)
    private String product;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "deadline")
    private Instant deadline;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "assigned_by", length = 255)
    private String assignedBy;
}
