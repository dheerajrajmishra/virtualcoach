# VirtualCoach — Functional & Technical Documentation

> **Version:** 1.0 · **Branch:** `feat/sql` · **Date:** May 2026  
> **Organisation:** Samsung GenAI Lab · genailab.gem3@samsung.com

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Functional Description](#2-functional-description)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Design](#5-database-design)
6. [CMS Backend — API Reference](#6-cms-backend--api-reference)
7. [Mobile Backend — API Reference](#7-mobile-backend--api-reference)
8. [CMS Frontend](#8-cms-frontend)
9. [Mobile Frontend](#9-mobile-frontend)
10. [AI & External Services](#10-ai--external-services)
11. [Ingestion Pipeline](#11-ingestion-pipeline)
12. [RAG FAQ System](#12-rag-faq-system)
13. [Quiz Evaluation System](#13-quiz-evaluation-system)
14. [Multilingual Audio System](#14-multilingual-audio-system)
15. [File Storage](#15-file-storage)
16. [Configuration Reference](#16-configuration-reference)
17. [Running the Project](#17-running-the-project)
18. [Key Design Decisions & Constraints](#18-key-design-decisions--constraints)

---

## 1. Project Overview

**VirtualCoach** is a full-stack AI-powered sales training platform built for multilingual field teams. Content managers upload PowerPoint decks and Excel data sheets via a CMS web application; the system automatically ingests the content, generates native-language audio narration in six Indian and global languages, embeds FAQ knowledge for semantic search, and delivers an interactive mobile learning experience.

Learners consume training through a React Native mobile app — navigating slides with AI-generated audio, asking questions to an AI chatbot, and completing AI-evaluated quizzes. Managers monitor completion rates, quiz scores, and unanswered questions through the CMS analytics dashboard.

### Core Value Proposition

| Problem | Solution |
|---|---|
| Field teams get English-only slides, no native audio | Auto-generated TTS in 6 languages per slide |
| No way to measure if reps understood the material | GPT-4o rubric-based quiz evaluation on free-text and voice answers |
| Unanswered product questions during training | RAG-powered FAQ chatbot grounded in training content |
| Managers have no visibility into learner progress | Real-time dashboard with completion rates, scores, and FAQ gaps |
| Re-recording audio when product content changes | Re-upload Excel → pipeline re-runs automatically |

---

## 2. Functional Description

### 2.1 CMS Portal (Content Manager)

#### Upload Training
Content managers create a new training by:
1. Providing a training name, category, and product
2. Uploading a **PowerPoint deck** (`.pptx`) — slides become the training content
3. Uploading an **Excel data sheet** (`.xlsx`) — contains FAQ question/answer pairs and quiz questions with rubrics
4. Selecting which of the 6 supported locales to generate audio for
5. Clicking **Start Ingestion Pipeline** to trigger automated processing

#### Processing Pipeline Monitor
A live view of every training's pipeline status across five stages: Ingesting → Parsing → Translating → Voice Gen → Live. Failed stages are highlighted in red with the error message visible.

#### Trainings Management
A paginated table of all training modules with:
- Status badges: PUBLISHED / READY / PROCESSING / ERROR / DRAFT
- Locale availability chips (EN / HI / TA / TE / MR / BN)
- Slide count and learner completion stats
- Inline **Assign User** button
- Preview link to view slides as a learner would

#### Dashboard Analytics (5 tabs)

| Tab | Content |
|---|---|
| **Overview** | Total trainings, published count, assignments, FAQ gap count, actionable insights |
| **Trainings** | Full table with status, locale flags, publish dates, error details |
| **Missed FAQs** | Questions the AI couldn't answer — sorted by frequency, with training/slide/locale context |
| **Assignments** | All learner assignments with deadlines, status, and product filters |
| **Quiz Answers** | Score distributions per training, per-learner score table, AI-evaluated results |

#### Assignment Management
Managers assign any published training to any learner (`learner-uid` for MVP) with a deadline. A summary card row shows totals: Total / Assigned / In Progress / Completed / Overdue.

---

### 2.2 Mobile App (Learner)

#### My Trainings (Home Screen)
Displays all assigned trainings sorted by urgency:
1. **In Progress** — resume where learner left off
2. **Not Started** — sorted by nearest deadline
3. **Completed** — review mode available

Each card shows: training name, category, product, progress bar, slide count, available locales, due date with urgency badge (e.g., "3d left"), and a Resume / Start / Review button.

Tab filters: All · Not Started · In Progress · Completed

#### Training Player
The main learning screen with four integrated panels:

- **Slide Viewer** — full-resolution slide image extracted from the PPTX
- **Audio Player** — AI-generated narration in the learner's chosen locale; language switcher to change locale on the fly
- **AI Chat Assistant** — ask any question about the training content; answered by the RAG FAQ system
- **Quiz Button** — available on slides that have an associated quiz question

Progress is tracked per-slide and synced to the backend on every slide change.

#### AI Quiz
For slides with associated quiz questions:
- Question displayed in the learner's locale
- Learner types a free-text answer or records a voice response
- Response submitted to GPT-4o for rubric-based evaluation
- Score out of `maxScore`, per-dimension rubric breakdown, and written feedback displayed immediately

#### FAQ Chatbot
An always-available chat interface within the player. Learner asks a question in any language; the system:
1. Embeds the question with Azure `text-embedding-3-small`
2. Runs cosine similarity against all FAQ embeddings for that training
3. Feeds top-K results as context to GPT-4o
4. Returns a grounded, natural-language answer
5. If no relevant FAQ is found, logs the question to the `unanswered_questions` table for admin review

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                               │
│                                                                     │
│   ┌─────────────────────────┐    ┌──────────────────────────────┐  │
│   │   CMS Web Portal        │    │   Mobile App (Expo RN)       │  │
│   │   Next.js 16 · :3000    │    │   React Native · :8083       │  │
│   └────────────┬────────────┘    └──────────────┬───────────────┘  │
└────────────────│──────────────────────────────────│─────────────────┘
                 │ HTTP/REST                         │ HTTP/REST
                 ▼                                   ▼
┌───────────────────────────┐    ┌───────────────────────────────────┐
│   CMS Backend             │    │   Mobile Backend                  │
│   Spring Boot 3.3 · :8080 │    │   Spring Boot 3.3 · :8081         │
│   com.pitchperfect.cms    │    │   com.pitchperfect.mobile         │
│                           │    │                                   │
│  IngestionService         │    │  ProgressService                  │
│  AudioFactoryService      │◄──►│  RagService                       │
│  EmbeddingService         │    │  EvaluationService                │
│  RagService               │    │  ElevenLabsSpeechService          │
│  FaqCacheService          │    │  FaqCacheService                  │
└───────────┬───────────────┘    └──────────────┬────────────────────┘
            │                                    │
            └──────────────┬─────────────────────┘
                           │ JDBC / Hibernate
                           ▼
              ┌────────────────────────┐
              │   SQL Server           │
              │   localhost:1433       │
              │   db: virtualcoach     │
              └────────────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │ Azure OpenAI │ │ElevenLabs│ │  GCS / Local │
    │ GPT-4o       │ │   TTS    │ │  File Storage│
    │ Embeddings   │ │          │ │              │
    └──────────────┘ └──────────┘ └──────────────┘
```

### Key Architectural Decisions

- **Shared database** — both backends read/write the same SQL Server instance. `faqs` and `quizzes` tables are owned by the CMS backend but read by the mobile backend via their own JPA entity classes pointing to the same tables.
- **No JWT/OAuth** — MVP uses `X-User-Id` header with hardcoded `learner-uid` / `admin-user`. Production will add proper auth.
- **`ddl-auto: update`** — Hibernate creates/alters tables on startup; never drops. After adding entity fields, restart both backends or run the `db/` SQL scripts manually.
- **In-memory Spring Cache** — both backends use `@EnableCaching` with the default `ConcurrentMapCache`. FAQ cache key = `trainingId`. No Redis.
- **Async ingestion** — `@EnableAsync` on `MobileApplication` and `CmsApplication`. Embedding generation uses `CompletableFuture` with a bounded thread pool (max 5 concurrent).

---

## 4. Technology Stack

### Backend (Both Services)

| Component | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.3 |
| ORM | Hibernate (Spring Data JPA) |
| Database | Microsoft SQL Server |
| Build | Maven |
| PPTX parsing | Apache POI |
| JSON converters | Custom `@Convert` classes (`JsonMapConverter`, `JsonDoubleListConverter`, etc.) |
| Caching | Spring Cache (`@Cacheable`, `@CacheEvict`) — in-memory |
| Async | `@Async`, `CompletableFuture`, fixed thread pool |

### CMS Frontend

| Component | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack React Query v5 |
| HTTP client | Axios |
| State | Zustand v5 |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| File upload | react-dropzone |
| Dev server | Next.js webpack mode (`--webpack` flag — Turbopack disabled due to Windows/Tailwind v4 PostCSS crash) |

### Mobile Frontend

| Component | Technology |
|---|---|
| Framework | Expo ~54 |
| Language | TypeScript |
| Runtime | React Native 0.81.5 / React 19 |
| Navigation | None — simple conditional render in `App.tsx` |
| Audio | Expo AV |
| Dev server | Port 8083 |

### External AI / Cloud Services

| Service | Provider | Purpose |
|---|---|---|
| `gpt-4o` | Azure OpenAI | Quiz evaluation, RAG answer generation |
| `text-embedding-3-small` | Azure OpenAI | FAQ embedding for semantic search |
| `eleven_multilingual_v2` | ElevenLabs | TTS audio generation per locale |
| Speech-to-Text | Azure Speech (`centralindia`) | Voice quiz answer transcription |
| Object Storage | Google Cloud Storage | Slide images, audio files |

---

## 5. Database Design

**Connection:** `jdbc:sqlserver://localhost:1433;databaseName=virtualcoach`  
**User:** `appuser` · **Password:** `test@1234`

### 5.1 Table Reference

| Table | Owner Backend | Primary Key | Notes |
|---|---|---|---|
| `trainings` | CMS | `id` VARCHAR(36) | Status: DRAFT→PROCESSING→READY |
| `slides` | CMS | `id` VARCHAR(36) | Index on `(training_id, slide_index)` |
| `faqs` | CMS | `id` VARCHAR(36) | Has `embedding` JSON column |
| `quizzes` | CMS | `id` VARCHAR(36) | Read by mobile backend too |
| `assignments` | CMS | `id` VARCHAR(36) | User → Training with deadline |
| `ingestion_jobs` | CMS | `id` VARCHAR(36) | Job queue with retry logic |
| `learner_progress` | Mobile | `id` VARCHAR(255) | PK = `userId + "_" + trainingId` |
| `quiz_submissions` | Mobile | `id` VARCHAR(36) | Text or audio/video responses |
| `evaluation_results` | Mobile | `submission_id` VARCHAR(36) | FK to quiz_submissions |
| `unanswered_questions` | Mobile | `id` VARCHAR(36) | Logged when AI returns NO_INFO_SIGNAL |

### 5.2 Entity Schemas

#### `trainings`
```
id                VARCHAR(36)    PK
name              VARCHAR(255)
category          VARCHAR(255)
product           VARCHAR(255)
status            VARCHAR(50)    DRAFT | PROCESSING | READY
deck_gcs_url      VARCHAR(1000)
data_excel_url    VARCHAR(1000)
total_slides      INT
supported_locales TEXT (JSON)    e.g. ["en","hi","ta"]
audio_status      TEXT (JSON)    e.g. {"en":"DONE","hi":"PROCESSING"}
processing_step   VARCHAR(255)
processing_error  TEXT
created_by        VARCHAR(255)
created_at        DATETIME2
updated_at        DATETIME2
published_at      DATETIME2
```

#### `slides`
```
id            VARCHAR(36)   PK
training_id   VARCHAR(36)   FK → trainings.id
slide_index   INT
title         VARCHAR(500)
image_gcs_url VARCHAR(1000)
transcripts   TEXT (JSON)   {"en":"...", "hi":"..."}
audio_urls    TEXT (JSON)   {"en":"gs://...", "hi":"gs://..."}
```
Indexes: `training_id`, `(training_id, slide_index)`

#### `faqs`
```
id              VARCHAR(36)   PK
training_id     VARCHAR(36)   FK → trainings.id
slide_index     INT
questions       TEXT (JSON)   {"en":"...", "hi":"..."}
answers         TEXT (JSON)   {"en":"...", "hi":"..."}
tags            TEXT (JSON)   ["pricing", "warranty"]
language_scope  TEXT (JSON)   ["en","hi"]
embedding       TEXT (JSON)   [0.023, -0.41, ...]  (float vector, ~1536 dims)
```
Index: `training_id`

#### `quizzes`
```
id               VARCHAR(36)  PK
training_id      VARCHAR(36)  FK → trainings.id
slide_index      INT
questions        TEXT (JSON)  {"en":"...", "hi":"..."}
input_type       VARCHAR(50)  text | audio | video
expected_answers TEXT (JSON)  {"en":"...", "hi":"..."}
rubrics          TEXT (JSON)  {"en":"Score 1-5 for..."}
max_score        INT
language_scope   TEXT (JSON)
```

#### `assignments`
```
id          VARCHAR(36)   PK
user_id     VARCHAR(255)
training_id VARCHAR(36)   FK → trainings.id
product     VARCHAR(255)
status      VARCHAR(50)   ASSIGNED | IN_PROGRESS | COMPLETED | OVERDUE
deadline    DATETIME2
assigned_at DATETIME2
assigned_by VARCHAR(255)
```

#### `ingestion_jobs`
```
id           VARCHAR(36)   PK
training_id  VARCHAR(36)
job_type     VARCHAR(50)   PROCESS | REPROCESS
deck_path    VARCHAR(1000)
data_path    VARCHAR(1000)
status       VARCHAR(50)   PENDING | PROCESSING | DONE | FAILED
attempts     INT           max 3
error_message TEXT
created_at   DATETIME2
started_at   DATETIME2
completed_at DATETIME2
```
Indexes: `status`, `training_id`

#### `learner_progress`
```
id                 VARCHAR(255)  PK = userId + "_" + trainingId
user_id            VARCHAR(255)
training_id        VARCHAR(36)
assignment_id      VARCHAR(36)   nullable
current_slide_index INT
total_slides        INT
completion_percent  FLOAT         default 0.0
quiz_scores        TEXT (JSON)   {"slideIdx": score}
quiz_statuses      TEXT (JSON)   {"slideIdx": "PASSED"}
status             VARCHAR(50)   NOT_STARTED | IN_PROGRESS | COMPLETED
started_at         DATETIME2
last_accessed_at   DATETIME2
completed_at       DATETIME2
preferred_locale   VARCHAR(10)   default 'en'
```
Indexes: `user_id`, `training_id`, `status`

#### `quiz_submissions`
```
id             VARCHAR(36)   PK
user_id        VARCHAR(255)
training_id    VARCHAR(36)
quiz_id        VARCHAR(36)
input_type     VARCHAR(50)   text | audio | video
text_response  TEXT (MAX)
media_gcs_url  VARCHAR(1000)
locale         VARCHAR(10)
submitted_at   DATETIME2
```

#### `evaluation_results`
```
submission_id  VARCHAR(36)   PK = quiz_submission.id
quiz_id        VARCHAR(36)
user_id        VARCHAR(255)
training_id    VARCHAR(36)
score          INT
max_score      INT
score_percent  FLOAT
feedback       TEXT (MAX)
strengths      TEXT (MAX)
improvements   TEXT (MAX)
evaluated_at   DATETIME2
```

#### `unanswered_questions`
```
id          VARCHAR(36)   PK
training_id VARCHAR(36)
user_id     VARCHAR(36)   nullable
slide_index INT
locale      VARCHAR(10)
question    TEXT (MAX)
ai_response TEXT (MAX)
asked_at    DATETIME2
reviewed    BIT           default 0
```
Indexes: `training_id`, `reviewed`, `asked_at`

### 5.3 JSON Column Converters

All JSON columns use custom JPA `@AttributeConverter` classes in both backends:

| Converter | Java Type | Usage |
|---|---|---|
| `JsonMapConverter` | `Map<String, String>` | Transcripts, audio URLs, questions, answers |
| `JsonIntegerMapConverter` | `Map<String, Integer>` | Quiz scores |
| `JsonDoubleListConverter` | `List<Double>` | FAQ embeddings |
| `JsonStringListConverter` | `List<String>` | Locales, tags |

---

## 6. CMS Backend — API Reference

**Base URL:** `http://localhost:8080`  
**Package:** `com.pitchperfect.cms`  
**Auth header:** `X-User-Id: admin-user`  
**CORS:** `@CrossOrigin(origins = "*")` on all controllers

### 6.1 Training Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/trainings` | Create training — multipart: `deck` (PPTX), `data` (Excel), `name`, `category`, `product`, `locales[]` |
| `GET` | `/api/trainings` | List all trainings. Query: `?published=true` |
| `GET` | `/api/trainings/{id}` | Get training by ID |
| `GET` | `/api/trainings/{id}/slides` | Get all slides for a training |
| `GET` | `/api/trainings/{id}/status` | Get processing status (step, error, audioStatus map) |
| `POST` | `/api/trainings/{id}/rerun` | Reprocess training with new Excel data. Multipart: `data` (Excel) |
| `POST` | `/api/trainings/{id}/publish` | Publish a READY training |
| `PATCH` | `/api/trainings/{id}/slides/{slideId}/transcript` | Update slide transcript. Body: `{locale, transcript}` |
| `POST` | `/api/trainings/{id}/slides/{slideId}/audio` | Regenerate audio for a specific locale. Query: `?locale=hi` |

### 6.2 Assignment Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/assignments` | Create assignment. Header: `X-User-Id`. Body: `{trainingId, userId, product, deadline}` |
| `GET` | `/api/assignments` | List assignments. Query: `?userId=`, `?product=` |
| `PATCH` | `/api/assignments/{id}/status` | Update assignment status. Body: `{status}` |

### 6.3 FAQ Endpoint

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/trainings/{id}/ask` | RAG FAQ query. Body: `{question, locale, slideIndex}` |

### 6.4 Response Examples

**Training object:**
```json
{
  "id": "a3f2c1d0-...",
  "name": "Product Launch Q3",
  "category": "Sales Process",
  "product": "Product A",
  "status": "READY",
  "totalSlides": 24,
  "supportedLocales": ["en", "hi", "ta"],
  "audioStatus": {"en": "DONE", "hi": "DONE", "ta": "DONE"},
  "publishedAt": "2026-05-11T09:00:00Z",
  "createdAt": "2026-05-10T14:30:00Z"
}
```

**Slide object:**
```json
{
  "id": "b7e1...",
  "trainingId": "a3f2...",
  "slideIndex": 3,
  "title": "Pricing Overview",
  "imageGcsUrl": "gs://pitch-perfect-assets/slides/a3f2.../3.png",
  "transcripts": {"en": "Our new SKU is priced at...", "hi": "हमारा नया SKU..."},
  "audioUrls": {"en": "gs://pitch-perfect-assets/audio/a3f2.../en/3.mp3"}
}
```

---

## 7. Mobile Backend — API Reference

**Base URL:** `http://localhost:8081`  
**Package:** `com.pitchperfect.mobile`  
**Auth header:** `X-User-Id: learner-uid`  
**CORS:** `@CrossOrigin(origins = "*")` on all controllers

### 7.1 Learner Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/learner/progress/{trainingId}` | Init or get progress record. Query: `?assignmentId=` (optional) |
| `PATCH` | `/api/learner/progress/{trainingId}/slide` | Update current slide. Body: `{slideIndex, totalSlides}` |
| `POST` | `/api/learner/progress/{trainingId}/complete` | Mark training complete (sets 100%, status=COMPLETED) |
| `POST` | `/api/learner/progress/{trainingId}/reset` | Reset progress to beginning |
| `GET` | `/api/learner/all-progress` | All progress records for the authenticated user |
| `GET` | `/api/learner/quiz/{trainingId}/slide/{slideIndex}` | Get quiz for a slide. Query: `?locale=en`. Returns 204 if no quiz. |
| `POST` | `/api/learner/ask` | FAQ RAG chatbot. Body: `{trainingId, question, locale, slideIndex}` |
| `GET` | `/api/learner/faq-hints/{trainingId}` | Suggested FAQ questions (cached). Query: `?locale=en` |
| `POST` | `/api/learner/transcribe` | Audio → text. Multipart: `audio` file. Query: `?locale=en` |

### 7.2 Evaluation Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/evaluation/submit/text` | Submit text quiz answer. Query params: `userId`, `trainingId`, `quizId`, `locale`. Body: plain text answer |
| `POST` | `/api/evaluation/submit/media` | Submit audio/video answer. Multipart: `media` file. Query: `userId`, `trainingId`, `quizId`, `locale` |

### 7.3 Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/unanswered-questions` | List unanswered questions. Query: `?trainingId=` |
| `GET` | `/api/admin/unanswered-questions/summary/{trainingId}` | Question frequency summary |
| `PATCH` | `/api/admin/unanswered-questions/{id}/reviewed` | Mark question as reviewed |
| `GET` | `/api/admin/evaluations` | List evaluation results. Query: `?trainingId=` |
| `GET` | `/api/admin/evaluations/summary` | Avg score per training |
| `GET` | `/api/admin/progress` | List learner progress. Query: `?trainingId=` |

### 7.4 Progress Logic

```
initProgress(trainingId, assignmentId):
  if record exists → return existing
  else → create new with status=NOT_STARTED, completionPercent=0

updateProgress(trainingId, slideIndex, totalSlides):
  completionPercent = (slideIndex + 1) / totalSlides * 100
  if startedAt == null → set startedAt = now()   ← null-guarded, set once only
  status = IN_PROGRESS
  lastAccessedAt = now()

markComplete(trainingId):
  completionPercent = 100.0
  status = COMPLETED
  if completedAt == null → set completedAt = now()  ← null-guarded
```

---

## 8. CMS Frontend

**Port:** 3000  
**Directory:** `cms/frontend-next/`

### 8.1 Page Structure

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Upload Training form |
| `/dashboard` | `app/dashboard/page.tsx` | Admin dashboard (5 tabs) |
| `/assignments` | `app/assignments/page.tsx` | Assignment management |
| `/trainings` | `app/trainings/page.tsx` | Training inventory table |
| `/processing` | `app/processing/page.tsx` | Ingestion pipeline monitor |
| `/preview/[id]` | `app/preview/[id]/page.tsx` | Training slide preview |

### 8.2 API Layer (`src/api/trainingApi.ts`)

```
cmsApi   → Axios instance → http://localhost:8080  (via Next.js rewrite /api → :8080)
mobileApi → Axios instance → http://localhost:8081
```

**React Query hooks:**

| Hook | Endpoint | Description |
|---|---|---|
| `useTrainings` | `GET /api/trainings` | Training list with status |
| `useTraining` | `GET /api/trainings/{id}` | Single training |
| `useTrainingSlides` | `GET /api/trainings/{id}/slides` | Slides for preview |
| `useTrainingStatus` | `GET /api/trainings/{id}/status` | Polling during ingestion |
| `useCreateTraining` | `POST /api/trainings` | Upload + start pipeline |
| `useRerunTraining` | `POST /api/trainings/{id}/rerun` | Reprocess with new data |
| `usePublishTraining` | `POST /api/trainings/{id}/publish` | Publish training |
| `useCreateAssignment` | `POST /api/assignments` | Assign training to user |
| `useAssignments` | `GET /api/assignments` | Assignment list |
| `useUnansweredQuestions` | `GET /api/admin/unanswered-questions` | Missed FAQ list |
| `useMarkReviewed` | `PATCH /api/admin/unanswered-questions/{id}/reviewed` | Mark reviewed |
| `useEvaluationResults` | `GET /api/admin/evaluations` | Quiz results |
| `useEvalSummary` | `GET /api/admin/evaluations/summary` | Per-training avg score |
| `useLearnerProgress` | `GET /api/admin/progress` | Learner progress |

### 8.3 N+1 Query Prevention

`TrainingController.listTrainings` uses a single batch JPQL query to count slides:
```java
slideRepository.countsByTrainingIds(ids)  // GROUP BY training_id — one query for all
```
**Do not revert** to calling `countByTrainingId` inside a loop.

### 8.4 Next.js Config (Rewrites)

```typescript
// next.config.ts
rewrites: [
  { source: '/api/:path*',     destination: 'http://localhost:8080/api/:path*' },
  { source: '/storage/:path*', destination: 'http://localhost:8080/storage/:path*' },
]
```

### 8.5 Design System

Tailwind CSS v4 with custom theme variables:

```css
--color-primary-{50-900}: indigo scale
--color-brand:       #0f172a  (Slate 900)
--color-brand-light: #1e293b  (Slate 800)
--color-brand-accent:#334155  (Slate 700)
```

Utility classes: `.btn-primary`, `.btn-secondary`, `.card`, `.glass-card`, `.input`, `.label`, `.text-gradient`

---

## 9. Mobile Frontend

**Port:** 8083 (Expo)  
**Directory:** `mobile/frontend-rn-v2/`

### 9.1 Screen Structure

```
App.tsx
  ├── Selection == null → TrainingListScreen
  └── Selection != null → TrainingPlayerScreen
```

`Selection = { training: Training, assignmentId: string | null }`

No navigation library — `App.tsx` manages a single `selection` state.

### 9.2 TrainingListScreen — Data Flow

```
Promise.all([
  fetchMyAssignments(userId),   → GET /api/assignments?userId=learner-uid  (CMS :8080)
  fetchTrainings(),              → GET /api/trainings?published=true        (CMS :8080)
  fetchAllProgress()             → GET /api/learner/all-progress            (Mobile :8081)
])
→ Merge by trainingId into AssignedTraining[]
→ Sort: IN_PROGRESS → NOT_STARTED (by deadline) → COMPLETED
→ Filter by active tab
```

Fallback: if `fetchMyAssignments` returns `[]`, shows all published trainings.

### 9.3 TrainingPlayerScreen — Lifecycle

```
handleOpen(training, assignmentId):
  → initProgress(trainingId, assignmentId)     POST /api/learner/progress/{id}

useEffect([currentIndex, slides.length, loadingSlides]):
  if !loadingSlides && slides.length > 0:
    → updateProgress(trainingId, currentIndex, totalSlides)

markTrainingComplete():
  → POST /api/learner/progress/{id}/complete
```

### 9.4 API Client (`src/api.ts`)

```typescript
// Host configuration (platform-aware)
CMS_HOST    = Platform.OS === 'web' ? 'localhost:8080'     : '192.168.1.8:8080'
MOBILE_HOST = Platform.OS === 'web' ? 'localhost:8081'     : '192.168.1.8:8081'

HEADERS = { 'X-User-Id': 'learner-uid', 'Content-Type': 'application/json' }

resolveMediaUrl(url):
  '/storage/...' → http://CMS_HOST/storage/...
  'gs://...'     → https://storage.googleapis.com/...
  'https://...'  → as-is
```

**For physical device testing:** update `192.168.1.8` to your machine's LAN IP.

---

## 10. AI & External Services

### 10.1 Azure OpenAI

**Endpoint:** `https://pitchperfectllmengine2.openai.azure.com`

| Model | Deployment | Used For |
|---|---|---|
| `gpt-4o` | `gpt-4o` | Quiz evaluation, RAG answer generation |
| `text-embedding-3-small` | `text-embedding-3-small` | FAQ embedding (1536 dimensions) |

### 10.2 ElevenLabs TTS

**Model:** `eleven_multilingual_v2`

| Locale | Language | Voice Name | Voice ID |
|---|---|---|---|
| `en` | English | Adam | `pNInz6obpgDQGcFmaJgB` |
| `hi` | Hindi | Anika | `RABOvaPec1ymXz02oDQi` |
| `ta` | Tamil | Rachel | `21m00Tcm4TlvDq8ikWAM` |
| `te` | Telugu | Domi | `AZnzlk1XvdvUeBnXmlld` |
| `mr` | Marathi | Bella | `EXAVITQu4vr4xnSDxMaL` |
| `bn` | Bengali | Elli | `FDQcYNtvPtQjNlTyU3du` |

**Stability settings:**
- English: `stability=0.50`, `similarityBoost=0.75`, `style=0.0`
- Indian languages (HI/TA/TE/MR/BN): `stability=0.30–0.50`, `similarityBoost=0.75`, `style=0.15`

### 10.3 Azure Speech (STT)

**Region:** `centralindia`  
**Used by:** `ElevenLabsSpeechService` in mobile backend  
**Purpose:** Transcribe learner voice quiz responses to text before sending to GPT-4o

### 10.4 Google Cloud Storage

**Bucket:** `pitch-perfect-assets`

| Path Prefix | Content |
|---|---|
| `slides/{trainingId}/{slideIndex}.png` | Slide images extracted from PPTX |
| `audio/{trainingId}/{locale}/{slideIndex}.mp3` | TTS audio per locale per slide |
| `decks/{trainingId}/deck.pptx` | Original uploaded PPTX |
| `data/{trainingId}/data.xlsx` | Original uploaded Excel |

### 10.5 Gemini (Fallback)

**Model:** `gemini-1.5-flash`  
**Used by:** Mobile backend `RagService` as fallback when Azure OpenAI is unavailable  
**Config:** `GEMINI_API_KEY` environment variable

> **UI rule:** Never expose ElevenLabs, Azure, Gemini, or Google brand names in any user-facing screen. Use "Audio Engine", "AI Model", "Speech Service".

---

## 11. Ingestion Pipeline

**Triggered by:** `POST /api/trainings` or `POST /api/trainings/{id}/rerun`  
**Orchestrator:** `IngestionService.processTraining()`

```
Step 1: INGESTING
  ├── Extract slides from PPTX via Apache POI
  ├── Save slide images to GCS / local storage
  └── Create Slide entities in DB

Step 2: PARSING
  ├── Parse Excel sheet rows:
  │   ├── FAQ rows → create FAQ entities (UUID.randomUUID() IDs — never from cell values)
  │   └── Quiz rows → create Quiz entities (UUID.randomUUID() IDs)
  └── Save to DB

Step 3: TRANSLATING
  └── (locale mapping / transcript preparation per slide)

Step 4: VOICE GEN
  ├── For each supported locale × each slide:
  │   └── AudioFactoryService.generate(transcript, locale) → ElevenLabs API → MP3
  ├── Upload audio files to GCS / local storage
  └── Update Slide.audioUrls map

Step 5: EMBEDDING (parallel)
  ├── For each FAQ:
  │   └── EmbeddingService.embed(faq.answer) → Azure OpenAI → float[]
  ├── Max 5 concurrent (CompletableFuture + bounded thread pool)
  └── Store in FAQ.embedding (JSON)

Step 6: READY
  ├── Training.status = READY
  ├── faqCacheService.evict(trainingId)
  └── Training ready to publish
```

### Retry Logic

`ingestion_jobs` table tracks attempts (max 3). Failed jobs can be re-triggered via `/rerun`.

### ID Safety Rule

FAQ and Quiz IDs are **always** `UUID.randomUUID()` — never read from Excel cell values. This prevents a prior bug where the same Excel template used across multiple trainings caused ID collisions and data overwrites.

---

## 12. RAG FAQ System

Implemented identically in both backends (`com.pitchperfect.cms.service.RagService` and `com.pitchperfect.mobile.service.RagService`).

### Query Flow

```
1. Receive question + trainingId + locale
2. Embed question → Azure text-embedding-3-small → queryVector (float[1536])
3. Load all FAQs for trainingId (from FaqCacheService @Cacheable)
4. For each FAQ:
     cosineSimilarity = dot(queryVector, faq.embedding) /
                        (norm(queryVector) * norm(faq.embedding))
5. Sort by similarity, take top-K (max-context-faqs = 20)
6. Build prompt:
     System: "Answer based only on the provided FAQ context..."
     User:   "Context: [top-K FAQ answers]\n\nQuestion: [question]"
7. Call Azure GPT-4o → get answer
8. If answer contains NO_INFO_SIGNAL or throws exception:
     → Log UnansweredQuestion to DB
     → Return fallback message
```

### Caching

- `FaqCacheService.getFaqs(trainingId)` is `@Cacheable("faqs")`
- Cache is evicted by `@CacheEvict` in `IngestionService.reprocessTraining()`
- Both backends have **independent** `FaqCacheService` instances (separate JVMs)

---

## 13. Quiz Evaluation System

**Service:** `EvaluationService` (mobile backend)  
**Model:** Azure GPT-4o

### Evaluation Flow

```
1. Learner submits text answer (or audio → transcribed via Azure Speech first)
2. Load quiz by quizId → get questions, rubrics, expectedAnswers, maxScore
3. Build GPT-4o prompt:
   System: "You are a quiz evaluator. Score the answer using the rubric..."
   User:   "Question: [quiz.question[locale]]
            Expected answer: [quiz.expectedAnswer[locale]]
            Rubric: [quiz.rubric[locale]]
            Max score: [quiz.maxScore]
            Learner's answer: [textResponse]"
4. GPT-4o returns JSON:
   {
     "score": 4,
     "scorePercent": 80.0,
     "feedback": "Good answer. You covered...",
     "strengths": "Accurate on pricing...",
     "improvements": "Could mention the warranty..."
   }
5. Save EvaluationResult to DB
6. Update LearnerProgress.quizScores[slideIndex] = score
7. Return evaluation to learner
```

### Score Thresholds (CMS Dashboard)
- **Excellent:** ≥ 90%
- **Pass:** ≥ 60% (configurable)
- **Below 60%:** needs coaching

---

## 14. Multilingual Audio System

**Service:** `AudioFactoryService` (CMS backend)  
**API:** ElevenLabs REST API

### Generation Flow

```
For each training × locale in supportedLocales:
  For each slide in training:
    1. Get slide.transcripts[locale]
    2. POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
       Body: { text, model_id: "eleven_multilingual_v2",
               voice_settings: { stability, similarity_boost, style } }
    3. Receive MP3 binary
    4. Upload to GCS: audio/{trainingId}/{locale}/{slideIndex}.mp3
    5. Update Slide.audioUrls[locale] = "gs://..."
```

### Voice Parameter Tuning

Indian language voices use higher style exaggeration (`0.15` vs `0.0` for English) and slightly lower stability (`0.30–0.50`) to produce more natural-sounding speech in languages with complex prosody.

---

## 15. File Storage

**Two modes** configured via `app.storage.type` in `application.yml`:

### Local Mode (`app.storage.type: local`)
- Files stored in `./storage/` relative to CMS backend working directory
- Served via Spring MVC static mapping: `/storage/**` → `./storage/`
- Mobile resolves URLs: `/storage/...` → `http://CMS_HOST/storage/...`

### GCS Mode (`app.storage.type: gcs`)
- Files stored in bucket `pitch-perfect-assets`
- Accessed via `gs://pitch-perfect-assets/...` URLs
- Mobile resolves: `gs://...` → `https://storage.googleapis.com/pitch-perfect-assets/...`

`resolveMediaUrl()` in the mobile frontend handles both patterns transparently.

---

## 16. Configuration Reference

### CMS Backend (`cms/backend-java/src/main/resources/application.yml`)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=virtualcoach;...
    username: appuser
    password: test@1234
  jpa:
    hibernate.ddl-auto: update
  servlet.multipart:
    max-file-size: 100MB
    max-request-size: 200MB

app:
  storage:
    type: local         # or gcs
  supported-locales:
    - en
    - hi
    - ta
    - te
    - mr
    - bn

azure:
  openai:
    endpoint: https://pitchperfectllmengine2.openai.azure.com
    api-key: ${AZURE_OPENAI_API_KEY}
    chat-deployment: gpt-4o
    embedding-deployment: text-embedding-3-small

elevenlabs:
  api-key: ${ELEVENLABS_API_KEY}
  model-id: eleven_multilingual_v2
  voices:
    en: pNInz6obpgDQGcFmaJgB
    hi: RABOvaPec1ymXz02oDQi
    ta: 21m00Tcm4TlvDq8ikWAM
    te: AZnzlk1XvdvUeBnXmlld
    mr: EXAVITQu4vr4xnSDxMaL
    bn: FDQcYNtvPtQjNlTyU3du
```

### Mobile Backend (`mobile/backend-java/src/main/resources/application.yml`)

```yaml
server:
  port: 8081

# (same datasource config as CMS)

app:
  rag:
    max-context-faqs: 20

azure:
  speech:
    key: ${AZURE_SPEECH_KEY}
    region: centralindia
  openai:
    # same as CMS
```

---

## 17. Running the Project

### Prerequisites
- Java 21, Maven
- Node.js 24+
- SQL Server running on `localhost:1433` with `virtualcoach` database and `appuser` account
- Environment variables: `AZURE_OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `GEMINI_API_KEY` (fallback)

### First-Time Database Setup

Run all scripts in `db/` against the `virtualcoach` database:
```sql
db/create_ingestion_jobs.sql
db/create_unanswered_questions.sql
db/create_learner_progress.sql
```

Tables not covered by scripts are created automatically by `ddl-auto: update` on first backend startup.

### Start All (Recommended)

```powershell
# From D:\DJPOC\VirtualCoach
.\start-all.ps1
```

### Individual Services

```powershell
# CMS Backend (8080) — kill existing, then start
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue |
  Where-Object { $_.OwningProcess -gt 4 } |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
cd cms/backend-java; mvn spring-boot:run

# Mobile Backend (8081)
cd mobile/backend-java; mvn spring-boot:run

# CMS Frontend (3000)
cd cms/frontend-next; npm run dev          # uses --webpack (not Turbopack)

# Mobile App (8083)
cd mobile/frontend-rn-v2; npx expo start --port 8083
```

### Service URLs

| Service | URL |
|---|---|
| CMS Portal | http://localhost:3000 |
| CMS Backend API | http://localhost:8080 |
| Mobile Backend API | http://localhost:8081 |
| Mobile App (Expo web) | http://localhost:8083 |

### Adding New Entity Fields

1. Add field to Java entity class
2. Restart **both** backends (`ddl-auto: update` will ALTER the table)
3. Or run the equivalent `db/*.sql` script manually if auto-update fails

---

## 18. Key Design Decisions & Constraints

### UUID IDs — Not From Excel
All FAQ and Quiz entity IDs are generated with `UUID.randomUUID()` — never read from the Excel data sheet. This was a deliberate fix for an earlier bug: when the same Excel template was reused across different trainings, the static IDs in column A caused the new training's FAQ/Quiz rows to overwrite the previous training's rows in the database.

### Batch Slide Count Query
`TrainingController.listTrainings()` fetches slide counts using a single GROUP BY JPQL query:
```java
slideRepository.countsByTrainingIds(ids)
```
Never revert to calling `countByTrainingId(id)` inside a loop — this causes N+1 queries.

### Progress ID Format
`learner_progress.id = userId + "_" + trainingId`  
Example: `"learner-uid_a3f2c1d0-..."`. Changing this format breaks existing records.

### `startedAt` and `completedAt` Are Set Once
Both timestamps are null-guarded — set only if currently null. This prevents `startedAt` from being reset when a learner swipes back to slide 0.

### Independent FAQ Caches
Both backends run in separate JVMs, each with their own `FaqCacheService`. The CMS backend evicts its cache on reprocess; the mobile backend's cache is only evicted if you restart it or call an evict endpoint. This is intentional for MVP performance — the tradeoff is that a reprocess in CMS doesn't immediately reflect in the mobile backend's cached FAQs.

### No Turbopack for CMS Frontend
The Next.js dev script uses `--webpack` flag. Turbopack panics on Windows when `@tailwindcss/postcss` v4 processes `globals.css` — the PostCSS worker process is killed by the OS (error 10054). The `--webpack` flag is the correct way to opt out in Next.js 16.

### Brand Name Restriction
The names **ElevenLabs**, **Azure**, **Gemini**, and **Google** must not appear in any user-facing UI string. Use "Audio Engine", "AI Model", "Speech Service" in labels, toasts, and progress messages.

### Supported Locales Are Canonical
The locale list `[en, hi, ta, te, mr, bn]` is defined in `application.yml` and referenced throughout the ingestion pipeline, audio generation, and RAG system. Adding a new locale requires: (1) a new ElevenLabs voice ID, (2) adding the code to `app.supported-locales`, and (3) restarting the CMS backend.

---

*Document generated from live codebase — `feat/sql` branch, May 2026.*
