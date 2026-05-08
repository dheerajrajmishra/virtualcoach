package com.pitchperfect.cms.service;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.pitchperfect.cms.model.FAQ;
import com.pitchperfect.cms.model.Quiz;
import com.pitchperfect.cms.model.Slide;
import com.pitchperfect.cms.model.Training;
import com.pitchperfect.cms.repository.FaqRepository;
import com.pitchperfect.cms.repository.QuizRepository;
import com.pitchperfect.cms.repository.SlideRepository;
import com.pitchperfect.cms.repository.TrainingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestionService {

    private final Storage gcsStorage;
    private final TrainingRepository trainingRepository;
    private final SlideRepository slideRepository;
    private final FaqRepository faqRepository;
    private final QuizRepository quizRepository;
    private final TranslationService translationService;
    private final AudioFactoryService audioFactoryService;

    @Value("${app.gcs.bucket-name}")
    private String bucketName;

    @Value("${app.gcs.slides-prefix}")
    private String slidesPrefix;

    @Value("${app.supported-locales}")
    private List<String> supportedLocales;

    public Training createTraining(String name, String category, String product, String createdBy) {
        Training training = Training.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .category(category)
                .product(product)
                .status("DRAFT")
                .supportedLocales(supportedLocales)
                .createdBy(createdBy)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        trainingRepository.save(training);
        log.info("Created training draft: {}", training.getId());
        return training;
    }

    @Async
    public void processUpload(String trainingId, MultipartFile deck,
                              MultipartFile transcriptExcel,
                              MultipartFile faqExcel,
                              MultipartFile quizExcel) {
        try {
            updateTrainingStatus(trainingId, "PROCESSING");

            String deckGcsUrl = uploadToGcs(deck, slidesPrefix + trainingId + "/deck." + getExtension(deck));
            updateDeckUrl(trainingId, deckGcsUrl);

            List<Slide> slides = parseTranscriptExcel(trainingId, transcriptExcel);
            slides = translationService.fillMissingTranslations(slides);
            slideRepository.saveAll(slides);

            List<FAQ> faqs = parseFaqExcel(trainingId, faqExcel);
            faqs = translationService.fillFaqTranslations(faqs);
            faqRepository.saveAll(faqs);

            List<Quiz> quizzes = parseQuizExcel(trainingId, quizExcel);
            quizzes = translationService.fillQuizTranslations(quizzes);
            quizRepository.saveAll(quizzes);

            audioFactoryService.generateAllAudio(trainingId, slides);

            updateTrainingStatus(trainingId, "READY");
            log.info("Ingestion complete for training: {}", trainingId);
        } catch (Exception e) {
            log.error("Ingestion failed for training {}: {}", trainingId, e.getMessage(), e);
            updateTrainingStatus(trainingId, "ERROR");
        }
    }

    private List<Slide> parseTranscriptExcel(String trainingId, MultipartFile file) throws IOException {
        List<Slide> slides = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> transcripts = new HashMap<>();
                transcripts.put("en", cellValue(row, 2));
                transcripts.put("hi", cellValue(row, 3));
                transcripts.put("ta", cellValue(row, 4));
                transcripts.put("te", cellValue(row, 5));

                Slide slide = Slide.builder()
                        .id(UUID.randomUUID().toString())
                        .trainingId(trainingId)
                        .slideIndex((int) row.getCell(0).getNumericCellValue())
                        .title(cellValue(row, 1))
                        .transcripts(transcripts)
                        .audioUrls(new HashMap<>())
                        .build();
                slides.add(slide);
            }
        }
        return slides;
    }

    private List<FAQ> parseFaqExcel(String trainingId, MultipartFile file) throws IOException {
        List<FAQ> faqs = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> questions = new HashMap<>();
                Map<String, String> answers = new HashMap<>();
                questions.put("en", cellValue(row, 2));
                answers.put("en", cellValue(row, 3));
                questions.put("hi", cellValue(row, 4));
                answers.put("hi", cellValue(row, 5));

                String tagsRaw = cellValue(row, 6);
                List<String> tags = tagsRaw.isEmpty() ? List.of() :
                        Arrays.asList(tagsRaw.split(","));

                FAQ faq = FAQ.builder()
                        .id(cellValue(row, 0))
                        .trainingId(trainingId)
                        .slideIndex((int) row.getCell(1).getNumericCellValue())
                        .questions(questions)
                        .answers(answers)
                        .tags(tags)
                        .languageScope(List.of(cellValue(row, 7).split(",")))
                        .build();
                faqs.add(faq);
            }
        }
        return faqs;
    }

    private List<Quiz> parseQuizExcel(String trainingId, MultipartFile file) throws IOException {
        List<Quiz> quizzes = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> questions = new HashMap<>();
                Map<String, String> expectedAnswers = new HashMap<>();
                Map<String, String> rubrics = new HashMap<>();
                questions.put("en", cellValue(row, 2));
                expectedAnswers.put("en", cellValue(row, 4));
                rubrics.put("en", cellValue(row, 5));

                Quiz quiz = Quiz.builder()
                        .id(cellValue(row, 0))
                        .trainingId(trainingId)
                        .slideIndex((int) row.getCell(1).getNumericCellValue())
                        .questions(questions)
                        .inputType(cellValue(row, 3))
                        .expectedAnswers(expectedAnswers)
                        .rubrics(rubrics)
                        .maxScore((int) row.getCell(6).getNumericCellValue())
                        .languageScope(List.of(cellValue(row, 7).split(",")))
                        .build();
                quizzes.add(quiz);
            }
        }
        return quizzes;
    }

    private String uploadToGcs(MultipartFile file, String path) throws IOException {
        BlobId blobId = BlobId.of(bucketName, path);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType())
                .build();
        gcsStorage.create(blobInfo, file.getBytes());
        return "gs://" + bucketName + "/" + path;
    }

    private void updateTrainingStatus(String trainingId, String status) {
        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setStatus(status);
            t.setUpdatedAt(Instant.now());
            trainingRepository.save(t);
        });
    }

    private void updateDeckUrl(String trainingId, String url) {
        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setDeckGcsUrl(url);
            t.setUpdatedAt(Instant.now());
            trainingRepository.save(t);
        });
    }

    private String cellValue(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((int) cell.getNumericCellValue());
            default -> "";
        };
    }

    private String getExtension(MultipartFile file) {
        String name = Objects.requireNonNull(file.getOriginalFilename());
        return name.substring(name.lastIndexOf('.') + 1);
    }
}
