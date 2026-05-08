package com.pitchperfect.mobile.model;

import com.pitchperfect.mobile.converter.JsonMapConverter;
import com.pitchperfect.mobile.converter.JsonStringListConverter;
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
@Table(name = "quizzes")
public class Quiz {

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

    @Column(name = "input_type", length = 20)
    private String inputType;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "expected_answers", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> expectedAnswers;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "rubrics", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> rubrics;

    @Column(name = "max_score")
    private int maxScore;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "language_scope", columnDefinition = "NVARCHAR(MAX)")
    private List<String> languageScope;
}
