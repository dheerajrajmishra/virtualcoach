package com.pitchperfect.cms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class AsyncConfig {

    /** 8 threads for Azure OpenAI translation calls — I/O bound, safe to run many in parallel. */
    @Bean("translationExecutor")
    public Executor translationExecutor() {
        ThreadPoolTaskExecutor e = new ThreadPoolTaskExecutor();
        e.setCorePoolSize(8);
        e.setMaxPoolSize(8);
        e.setQueueCapacity(500);
        e.setThreadNamePrefix("translate-");
        e.setWaitForTasksToCompleteOnShutdown(true);
        e.setAwaitTerminationSeconds(120);
        e.initialize();
        return e;
    }

    /**
     * 3 threads for ElevenLabs TTS — limits concurrent API calls to stay within
     * ElevenLabs concurrency limits while still running slides in parallel.
     */
    @Bean("audioExecutor")
    public Executor audioExecutor() {
        ThreadPoolTaskExecutor e = new ThreadPoolTaskExecutor();
        e.setCorePoolSize(3);
        e.setMaxPoolSize(3);
        e.setQueueCapacity(500);
        e.setThreadNamePrefix("audio-");
        e.setWaitForTasksToCompleteOnShutdown(true);
        e.setAwaitTerminationSeconds(300);
        e.initialize();
        return e;
    }

    /** Replaces Spring's default unbounded SimpleAsyncTaskExecutor for @Async methods. */
    @Bean("taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor e = new ThreadPoolTaskExecutor();
        e.setCorePoolSize(4);
        e.setMaxPoolSize(10);
        e.setQueueCapacity(50);
        e.setThreadNamePrefix("async-");
        e.initialize();
        return e;
    }
}
