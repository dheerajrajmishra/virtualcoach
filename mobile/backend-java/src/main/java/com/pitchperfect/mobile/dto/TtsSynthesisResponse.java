package com.pitchperfect.mobile.dto;

import lombok.Data;

import java.util.List;

@Data
public class TtsSynthesisResponse {
    private String audioBase64;
    private List<String> characters;
    private List<Double> characterStartTimes;
    private List<Double> characterEndTimes;
    private double duration;
}
