package com.pitchperfect.cms.model;

import com.pitchperfect.cms.converter.JsonMapConverter;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "slides", indexes = {
        @Index(name = "idx_slides_training_id",             columnList = "training_id"),
        @Index(name = "idx_slides_training_slide_index",    columnList = "training_id, slide_index")
})
public class Slide {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "training_id", length = 36)
    private String trainingId;

    @Column(name = "slide_index")
    private int slideIndex;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "image_gcs_url", length = 1000)
    private String imageGcsUrl;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "transcripts", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> transcripts;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "audio_urls", columnDefinition = "NVARCHAR(MAX)")
    private Map<String, String> audioUrls;
}
