package com.pitchperfect.cms.model;

import com.pitchperfect.cms.converter.JsonMapConverter;
import com.pitchperfect.cms.converter.JsonStringListConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "trainings")
public class Training {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "name")
    private String name;

    @Column(name = "category")
    private String category;

    @Column(name = "product")
    private String product;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "deck_gcs_url", length = 1000)
    private String deckGcsUrl;

    @Column(name = "total_slides")
    private int totalSlides;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "supported_locales", columnDefinition = "NVARCHAR(MAX)")
    private List<String> supportedLocales;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "audio_status", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> audioStatus;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
