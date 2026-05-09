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
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.List;

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
    private final EmbeddingService embeddingService;
    private final StatusService statusService;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.local-path:./storage}")
    private String localStoragePath;

    @Value("${app.gcs.bucket-name}")
    private String bucketName;

    @Value("${app.gcs.slides-prefix}")
    private String slidesPrefix;

    @Value("${app.supported-locales}")
    private List<String> supportedLocales;

    private static final String SHEET_TRANSCRIPTS = "Transcripts";
    private static final String SHEET_FAQS = "FAQs";
    private static final String SHEET_QUIZZES = "Quizzes";

    public record FileData(byte[] bytes, String filename, String contentType) {
        public static FileData from(MultipartFile file) throws IOException {
            if (file == null || file.isEmpty())
                return null;
            return new FileData(file.getBytes(), file.getOriginalFilename(), file.getContentType());
        }
    }

    public Training createTraining(String name, String category, String product,
            String createdBy, List<String> selectedLocales) {
        List<String> locales = (selectedLocales == null || selectedLocales.isEmpty())
                ? supportedLocales
                : selectedLocales.stream()
                        .filter(l -> l != null && !l.isBlank())
                        .distinct()
                        .toList();

        if (!locales.contains("en")) {
            locales = new ArrayList<>(locales);
            locales.add(0, "en");
        }

        Training training = Training.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .category(category)
                .product(product)
                .status("DRAFT")
                .processingStep("PENDING")
                .supportedLocales(locales)
                .createdBy(createdBy)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        trainingRepository.save(training);
        log.info("Created training draft: {} with locales: {}", training.getId(), locales);
        return training;
    }

    @Async
    public void processUpload(String trainingId, FileData deck, FileData dataExcel) {
        try {
            statusService.setStep(trainingId, "PROCESSING", "UPLOADING_DECK");
            Map<Integer, String> slideImageUrls = new LinkedHashMap<>();
            if (deck != null) {
                String deckUrl = uploadFile(deck, slidesPrefix + trainingId + "/deck." + getFileExtension(deck));
                updateDeckUrl(trainingId, deckUrl);
                String ext = getFileExtension(deck).toLowerCase();
                if (ext.equals("pptx")) {
                    slideImageUrls = extractSlideImages(trainingId, deck.bytes());
                }
            }
            runContent(trainingId, dataExcel, slideImageUrls);
        } catch (Exception e) {
            log.error("Ingestion failed for training {}: {}", trainingId, e.getMessage(), e);
            statusService.setError(trainingId, e.getMessage());
        }
    }

    @Async
    public void reprocessTraining(String trainingId, FileData dataExcel) {
        try {
            statusService.setStep(trainingId, "PROCESSING", "CLEARING_DATA");
            slideRepository.deleteByTrainingId(trainingId);
            faqRepository.deleteByTrainingId(trainingId);
            quizRepository.deleteByTrainingId(trainingId);
            runContent(trainingId, dataExcel, new LinkedHashMap<>());
        } catch (Exception e) {
            log.error("Reprocess failed for training {}: {}", trainingId, e.getMessage(), e);
            statusService.setError(trainingId, e.getMessage());
        }
    }

    private void runContent(String trainingId, FileData dataExcel, Map<Integer, String> imageUrlsByIndex)
            throws Exception {
        List<String> trainingLocales = trainingRepository.findById(trainingId)
                .map(Training::getSupportedLocales)
                .orElse(supportedLocales);

        if (dataExcel != null) {
            String excelUrl = uploadFile(dataExcel, slidesPrefix + trainingId + "/data.xlsx");
            updateDataExcelUrl(trainingId, excelUrl);

            statusService.setStep(trainingId, "PROCESSING", "PARSING_CONTENT");
            List<Slide> slides = parseTranscriptSheet(trainingId, dataExcel, imageUrlsByIndex);
            List<FAQ> faqs = parseFaqSheet(trainingId, dataExcel);
            List<Quiz> quizzes = parseQuizSheet(trainingId, dataExcel);

            statusService.setStep(trainingId, "PROCESSING", "TRANSLATING");
            slides = translationService.fillMissingTranslations(slides, trainingLocales);
            faqs = translationService.fillFaqTranslations(faqs, trainingLocales);
            quizzes = translationService.fillQuizTranslations(quizzes, trainingLocales);

            // Generate semantic embeddings so RagService can do cosine-similarity retrieval
            statusService.setStep(trainingId, "PROCESSING", "EMBEDDING_FAQS");
            faqs = embeddingService.generateEmbeddings(faqs);

            slideRepository.saveAll(slides);
            faqRepository.saveAll(faqs);
            quizRepository.saveAll(quizzes);
            log.info("Saved all translated content to database for training: {}", trainingId);
        }

        statusService.setStep(trainingId, "PROCESSING", "GENERATING_AUDIO");
        log.info("Starting audio generation for training: {}", trainingId);
        
        List<Slide> savedSlides = slideRepository.findByTrainingIdOrderBySlideIndex(trainingId);
        audioFactoryService.generateAllAudio(trainingId, savedSlides);

        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setTotalSlides((int) slideRepository.countByTrainingId(trainingId));
            trainingRepository.save(t);
        });

        statusService.setStep(trainingId, "READY", "COMPLETE");
        log.info("Ingestion complete for training: {}", trainingId);
    }

    // ── Slide image extraction from PPTX ──────────────────────────────────────

    private Map<Integer, String> extractSlideImages(String trainingId, byte[] deckBytes) {
        Map<Integer, String> imageUrls = new LinkedHashMap<>();
        try (XMLSlideShow pptx = new XMLSlideShow(new ByteArrayInputStream(deckBytes))) {
            Dimension pgSize = pptx.getPageSize();
            List<XSLFSlide> pptSlides = pptx.getSlides();
            log.info("Extracting {} slide images for training {}", pptSlides.size(), trainingId);
            for (int i = 0; i < pptSlides.size(); i++) {
                int slideNum = i + 1;
                BufferedImage img = new BufferedImage(
                        (int) pgSize.getWidth(), (int) pgSize.getHeight(), BufferedImage.TYPE_INT_ARGB);
                Graphics2D g2d = img.createGraphics();
                g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g2d.setColor(Color.WHITE);
                g2d.fillRect(0, 0, img.getWidth(), img.getHeight());
                pptSlides.get(i).draw(g2d);
                g2d.dispose();

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(img, "png", baos);
                String imagePath = slidesPrefix + trainingId + "/slide_" + slideNum + ".png";
                String imageUrl = uploadFile(
                        new FileData(baos.toByteArray(), "slide_" + slideNum + ".png", "image/png"),
                        imagePath);
                imageUrls.put(slideNum, imageUrl);
                log.debug("Saved slide {} image to {}", slideNum, imageUrl);
            }
        } catch (Exception e) {
            log.warn("Could not extract slide images for training {} — slides will have no image: {}",
                    trainingId, e.getMessage());
        }
        return imageUrls;
    }

    // ── Sheet parsers ──────────────────────────────────────────────────────────

    private List<Slide> parseTranscriptSheet(String trainingId, FileData file,
            Map<Integer, String> imageUrlsByIndex) throws IOException {
        List<Slide> slides = new ArrayList<>();
        if (file == null)
            return slides;
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file.bytes()))) {
            Sheet sheet = getSheet(wb, SHEET_TRANSCRIPTS);
            if (sheet == null) {
                log.warn("Sheet '{}' not found, skipping transcripts", SHEET_TRANSCRIPTS);
                return slides;
            }
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                int slideIdx = extractInt(row, 0);
                Map<String, String> transcripts = new HashMap<>();
                transcripts.put("en", extractString(row, 2));
                transcripts.put("hi", extractString(row, 3));
                transcripts.put("ta", extractString(row, 4));
                transcripts.put("te", extractString(row, 5));

                slides.add(Slide.builder()
                        .id(UUID.randomUUID().toString())
                        .trainingId(trainingId)
                        .slideIndex(slideIdx)
                        .title(extractString(row, 1))
                        .imageGcsUrl(imageUrlsByIndex.get(slideIdx))
                        .transcripts(transcripts)
                        .audioUrls(new HashMap<>())
                        .build());
            }
        }
        return slides;
    }

    private List<FAQ> parseFaqSheet(String trainingId, FileData file) throws IOException {
        List<FAQ> faqs = new ArrayList<>();
        if (file == null)
            return faqs;
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file.bytes()))) {
            Sheet sheet = getSheet(wb, SHEET_FAQS);
            if (sheet == null) {
                log.warn("Sheet '{}' not found, skipping FAQs", SHEET_FAQS);
                return faqs;
            }
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                Map<String, String> questions = new HashMap<>();
                Map<String, String> answers = new HashMap<>();
                questions.put("en", extractString(row, 2));
                answers.put("en", extractString(row, 3));
                questions.put("hi", extractString(row, 4));
                answers.put("hi", extractString(row, 5));

                faqs.add(FAQ.builder()
                        .id(extractString(row, 0))
                        .trainingId(trainingId)
                        .slideIndex(extractInt(row, 1))
                        .questions(questions)
                        .answers(answers)
                        .tags(splitCsv(extractString(row, 6)))
                        .languageScope(splitCsv(extractString(row, 7)))
                        .build());
            }
        }
        return faqs;
    }

    private List<Quiz> parseQuizSheet(String trainingId, FileData file) throws IOException {
        List<Quiz> quizzes = new ArrayList<>();
        if (file == null)
            return quizzes;
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file.bytes()))) {
            Sheet sheet = getSheet(wb, SHEET_QUIZZES);
            if (sheet == null) {
                log.warn("Sheet '{}' not found, skipping quizzes", SHEET_QUIZZES);
                return quizzes;
            }
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                Map<String, String> questions = new HashMap<>();
                Map<String, String> expectedAnswers = new HashMap<>();
                Map<String, String> rubrics = new HashMap<>();
                questions.put("en", extractString(row, 2));
                expectedAnswers.put("en", extractString(row, 4));
                rubrics.put("en", extractString(row, 5));

                quizzes.add(Quiz.builder()
                        .id(extractString(row, 0))
                        .trainingId(trainingId)
                        .slideIndex(extractInt(row, 1))
                        .questions(questions)
                        .inputType(extractString(row, 3))
                        .expectedAnswers(expectedAnswers)
                        .rubrics(rubrics)
                        .maxScore(extractInt(row, 6))
                        .languageScope(splitCsv(extractString(row, 7)))
                        .build());
            }
        }
        return quizzes;
    }

    // ── Storage ────────────────────────────────────────────────────────────────

    private String uploadFile(FileData file, String path) throws IOException {
        if (file == null)
            return null;
        if ("local".equalsIgnoreCase(storageType)) {
            Path targetPath = Paths.get(localStoragePath, path);
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, file.bytes());
            log.info("Saved file locally: {}", targetPath.toAbsolutePath());
            return "/storage/" + path;
        } else {
            BlobId blobId = BlobId.of(bucketName, path);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId).setContentType(file.contentType()).build();
            gcsStorage.create(blobInfo, file.bytes());
            return "https://storage.googleapis.com/" + bucketName + "/" + path;
        }
    }


    private void updateDeckUrl(String trainingId, String url) {
        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setDeckGcsUrl(url);
            t.setUpdatedAt(Instant.now());
            trainingRepository.save(t);
        });
    }

    private void updateDataExcelUrl(String trainingId, String url) {
        trainingRepository.findById(trainingId).ifPresent(t -> {
            t.setDataExcelUrl(url);
            t.setUpdatedAt(Instant.now());
            trainingRepository.save(t);
        });
    }

    // ── Cell helpers ───────────────────────────────────────────────────────────

    private Sheet getSheet(Workbook wb, String name) {
        Sheet sheet = wb.getSheet(name);
        if (sheet == null && wb.getNumberOfSheets() > 0) {
            for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                if (wb.getSheetName(i).equalsIgnoreCase(name)) {
                    return wb.getSheetAt(i);
                }
            }
        }
        return sheet;
    }

    private String extractString(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null)
            return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((int) cell.getNumericCellValue());
            default -> "";
        };
    }

    private int extractInt(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null)
            return 0;
        if (cell.getCellType() == CellType.NUMERIC)
            return (int) cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Integer.parseInt(cell.getStringCellValue().trim());
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank())
            return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(value.split(",")));
    }

    private String getFileExtension(FileData file) {
        if (file == null || file.filename() == null)
            return "bin";
        String name = file.filename();
        int dot = name.lastIndexOf('.');
        return dot == -1 ? "bin" : name.substring(dot + 1);
    }
}
