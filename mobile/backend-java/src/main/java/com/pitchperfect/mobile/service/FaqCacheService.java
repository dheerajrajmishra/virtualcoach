package com.pitchperfect.mobile.service;

import com.pitchperfect.mobile.model.FAQ;
import com.pitchperfect.mobile.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FaqCacheService {

    private final FaqRepository faqRepository;

    @Cacheable(value = "faqs", key = "#trainingId")
    public List<FAQ> findByTrainingId(String trainingId) {
        return faqRepository.findByTrainingId(trainingId);
    }
}
