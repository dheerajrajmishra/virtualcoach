package com.pitchperfect.cms.service;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.texttospeech.v1.*;
import com.google.protobuf.ByteString;
import com.pitchperfect.cms.model.Slide;
import com.pitchperfect.cms.repository.SlideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioFactoryService {

    private final Storage gcsStorage;
    private final SlideRepository slideRepository;

    @Value("${app.gcs.bucket-name}")
    private String bucketName;

    @Value("${app.gcs.audio-prefix}")
    private String audioPrefix;

    private static final Map<String, String> LOCALE_TO_VOICE = Map.of(
            "en", "en-IN-Wavenet-D",
            "hi", "hi-IN-Wavenet-D",
            "ta", "ta-IN-Wavenet-D",
            "te", "te-IN-Standard-A",
            "mr", "mr-IN-Wavenet-A",
            "bn", "bn-IN-Wavenet-B"
    );

    @Async
    public void generateAllAudio(String trainingId, List<Slide> slides) {
        try (TextToSpeechClient ttsClient = TextToSpeechClient.create()) {
            for (Slide slide : slides) {
                for (Map.Entry<String, String> entry : slide.getTranscripts().entrySet()) {
                    String locale = entry.getKey();
                    String text = entry.getValue();
                    if (text == null || text.isBlank()) continue;

                    String audioUrl = synthesizeAndUpload(ttsClient, trainingId, slide, locale, text);
                    slide.getAudioUrls().put(locale, audioUrl);
                }
                slideRepository.save(slide);
                log.info("Audio generated for slide {}/{}", trainingId, slide.getSlideIndex());
            }
        } catch (Exception e) {
            log.error("Audio factory failed for training {}: {}", trainingId, e.getMessage(), e);
        }
    }

    private String synthesizeAndUpload(TextToSpeechClient client, String trainingId,
                                       Slide slide, String locale, String text) throws Exception {
        SynthesisInput input = SynthesisInput.newBuilder().setText(text).build();

        String voiceName = LOCALE_TO_VOICE.getOrDefault(locale, "en-IN-Wavenet-D");
        String langCode = locale + "-IN";

        VoiceSelectionParams voice = VoiceSelectionParams.newBuilder()
                .setLanguageCode(langCode)
                .setName(voiceName)
                .build();

        AudioConfig audioConfig = AudioConfig.newBuilder()
                .setAudioEncoding(AudioEncoding.MP3)
                .setSpeakingRate(0.9)
                .build();

        SynthesizeSpeechResponse response = client.synthesizeSpeech(input, voice, audioConfig);
        ByteString audioContents = response.getAudioContent();

        String path = audioPrefix + trainingId + "/" + slide.getSlideIndex() + "_" + locale + ".mp3";
        BlobId blobId = BlobId.of(bucketName, path);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType("audio/mpeg")
                .setCacheControl("public, max-age=86400")
                .build();

        gcsStorage.create(blobInfo, audioContents.toByteArray());
        return "gs://" + bucketName + "/" + path;
    }
}
