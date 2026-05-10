package com.pitchperfect.cms.service;

import com.pitchperfect.cms.model.FAQ;
import com.pitchperfect.cms.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
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

    @CacheEvict(value = "faqs", key = "#trainingId")
    public void evict(String trainingId) {
        // evicts the cached FAQ list so the next ask() call reloads fresh embeddings
    }
}
