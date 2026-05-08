package com.pitchperfect.mobile.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.HashMap;
import java.util.Map;

@Converter
public class JsonIntegerMapConverter implements AttributeConverter<Map<String, Integer>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(Map<String, Integer> attribute) {
        if (attribute == null) return "{}";
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            return "{}";
        }
    }

    @Override
    public Map<String, Integer> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new HashMap<>();
        try {
            return MAPPER.readValue(dbData, new TypeReference<>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
