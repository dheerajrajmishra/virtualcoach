package com.pitchperfect.cms.model;

import com.pitchperfect.cms.converter.JsonDoubleListConverter;
import com.pitchperfect.cms.converter.JsonMapConverter;
import com.pitchperfect.cms.converter.JsonStringListConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "faqs", indexes = {
        @Index(name = "idx_faqs_training_id", columnList = "training_id")
})
public class FAQ {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "training_id", length = 36)
    private String trainingId;

    @Column(name = "slide_index")
    private int slideIndex;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "questions", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> questions;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "answers", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> answers;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "tags", columnDefinition = "NVARCHAR(MAX)")
    private List<String> tags;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "language_scope", columnDefinition = "NVARCHAR(MAX)")
    private List<String> languageScope;

    @Convert(converter = JsonDoubleListConverter.class)
    @Column(name = "embedding", columnDefinition = "NVARCHAR(MAX)")
    private List<Double> embedding;
}
