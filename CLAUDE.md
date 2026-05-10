# VirtualCoach — Project Context for Claude

## What This Is
A full-stack AI-powered sales training platform. Content managers upload PowerPoint decks + Excel data sheets; the system ingests them, generates multi-language audio, and delivers an interactive mobile learning experience with AI quiz evaluation and FAQ chatbot.

---

## Architecture Overview

```
virtualcoach-sql/
├── cms/
│   ├── backend-java/       Spring Boot 3.3 (Java 21) — Port 8080
│   └── frontend-next/      Next.js (App Router) — Port 3000
├── mobile/
│   ├── backend-java/       Spring Boot 3.3 (Java 21) — Port 8081
│   └── frontend-rn-v2/     React Native (Expo ~54)
└── db/                     Idempotent SQL Server scripts (safe fallback for missing tables)
```

Both backends share **the same SQL Server database** (`virtualcoach` on `localhost:1433`, user `appuser`, password `test@1234`). Tables are auto-created by `ddl-auto: update` on startup — **restart both backends after adding new entities or columns**.

---

## Database — SQL Server

- **Host:** `localhost:1433` | **DB:** `virtualcoach` | **User:** `appuser`
- `ddl-auto: update` — Hibernate creates/alters tables on startup, never drops
- When adding new entity fields: restart backend, or run the `db/*.sql` script manually
- `db/` contains idempotent `IF NOT EXISTS` scripts as a safe fallback

### All Tables (owner backend)

| Table | Backend | Notes |
|---|---|---|
| `trainings` | CMS | Status: DRAFT → PROCESSING → READY |
| `slides` | CMS | Index: (trainingId, slideIndex) |
| `faqs` | CMS | Has `embedding` column (JSON double[]) for RAG |
| `quizzes` | CMS | Shared — mobile backend reads same rows |
| `assignments` | CMS | User → Training, has deadline |
| `ingestion_jobs` | CMS | Job queue, retry logic |
| `learner_progress` | Mobile | PK = `userId + "_" + trainingId` |
| `quiz_submissions` | Mobile | Text or audio/video responses |
| `evaluation_results` | Mobile | PK = submissionId |
| `unanswered_questions` | Mobile | Logged when AI returns NO_INFO_SIGNAL |

### Key Schema Notes
- All IDs are `VARCHAR(36)` UUIDs generated with `UUID.randomUUID()`
- JSON columns (maps, lists) use custom `@Convert` converters — `JsonMapConverter`, `JsonIntegerMapConverter`, `JsonDoubleListConverter`, `JsonStringListConverter` in both backends
- `learner_progress.id = userId + "_" + trainingId` — length fits because userId = `learner-uid` (11 chars)
- `faqs.embedding` stores a float vector as JSON — compared cosine-similarity in `RagService`
- **Both backends read the same `faqs` and `quizzes` tables**. Mobile backend has its own `FAQ` and `Quiz` entity classes pointing to these tables

---

## CMS Backend (Port 8080)

**Package:** `com.pitchperfect.cms`

### Ingestion Pipeline
1. Upload PPTX + Excel → `IngestionService.processTraining()`
2. Slides extracted from PPTX via Apache POI
3. FAQ/Quiz rows parsed from Excel — **IDs are always `UUID.randomUUID()`**, never from Excel cell values (fixing an old ID-collision bug)
4. Audio generated per locale via `AudioFactoryService` → ElevenLabs API
5. Embeddings generated for each FAQ via `EmbeddingService` → Azure OpenAI `text-embedding-3-small`
6. Embeddings are parallelised: `CompletableFuture` + fixed thread pool (max 5 concurrent)
7. Files stored in GCS bucket (`pitch-perfect-assets`) or local `./storage` depending on `app.storage.type`

### Key Services
- `IngestionService` — orchestrates full pipeline; calls `faqCacheService.evict(trainingId)` after reprocess
- `AudioFactoryService` — ElevenLabs TTS, per-locale voice IDs configured in yml
- `EmbeddingService` — Azure OpenAI embeddings, parallel with bounded pool
- `FaqCacheService` — `@Cacheable("faqs")` by trainingId; evicted on reprocess
- `RagService` — cosine similarity search over FAQ embeddings, falls back to LLM
- `@EnableCaching` on `CmsApplication`

### Key Endpoints
```
GET  /api/trainings?published=true        List published trainings
GET  /api/trainings/{id}/slides           All slides for a training
POST /api/trainings                       Upload + start ingestion
POST /api/trainings/{id}/rerun            Reprocess with new Excel data
POST /api/trainings/{id}/publish          Publish training
GET  /api/assignments?userId=             List assignments (filtered by userId)
POST /api/assignments                     Create assignment (header: X-User-Id)
```

### N+1 Fix (Important)
`TrainingController.listTrainings` uses a **batch JPQL query** instead of per-training `COUNT`:
```java
slideRepository.countsByTrainingIds(ids)  // single query, GROUP BY trainingId
```
Do not revert to per-training `countByTrainingId` inside a loop.

---

## Mobile Backend (Port 8081)

**Package:** `com.pitchperfect.mobile`

### Key Services
- `ProgressService` — learner progress CRUD; percent = `(slideIndex+1)/totalSlides*100`; `startedAt`/`completedAt` only set once (null-guarded)
- `RagService` — same pattern as CMS RagService; logs `UnansweredQuestion` to DB when AI responds with `NO_INFO_SIGNAL` or throws
- `FaqCacheService` — `@Cacheable("faqs")` shared by `RagService` and hints endpoint
- `EvaluationService` — Azure OpenAI GPT-4o for rubric-based quiz scoring
- `ElevenLabsSpeechService` — transcription endpoint
- `@EnableCaching` + `@EnableAsync` on `MobileApplication`

### Key Endpoints
```
GET  /api/learner/progress/{trainingId}?assignmentId=    Init or get progress
PATCH /api/learner/progress/{trainingId}/slide           Update slide (body: {slideIndex, totalSlides})
POST /api/learner/progress/{trainingId}/complete         Mark complete (sets 100%)
GET  /api/learner/all-progress                           All progress records for user
GET  /api/learner/quiz/{trainingId}/slide/{idx}?locale=  Quiz for slide (204 if none)
POST /api/learner/ask                                    FAQ RAG (body: {trainingId, question, locale, slideIndex})
GET  /api/learner/faq-hints/{trainingId}?locale=         FAQ question hints (cached)
POST /api/learner/transcribe                             Audio → text
POST /api/evaluation/submit/text                         Submit quiz answer (query params)
GET  /api/admin/unanswered-questions?trainingId=         Admin: unanswered FAQs
PATCH /api/admin/unanswered-questions/{id}/reviewed      Mark reviewed
GET  /api/admin/evaluations?trainingId=                  Quiz evaluation results
```

### Authentication
All endpoints use `X-User-Id` header (hardcoded `learner-uid` for MVP). No JWT/OAuth yet.

---

## CMS Frontend (Next.js App Router)

**Tech:** Next.js (App Router), React 19, TanStack React Query v5, Zustand v5, Axios, Tailwind CSS v4, Lucide React

### Key Pages
| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Training list + upload |
| `/dashboard` | `app/dashboard/page.tsx` | Admin dashboard (5 tabs) |
| `/assignments` | `app/assignments/page.tsx` | Assignment management |
| `/preview/[id]` | `app/preview/[id]/page.tsx` | Training preview |
| `/processing` | `app/processing/page.tsx` | Upload progress |

### Dashboard Tabs
Overview · Trainings · Missed FAQs · Assignments · Quiz Answers

### API Layer (`src/api/trainingApi.ts`)
- `cmsApi` — Axios instance → `http://localhost:8080`
- `mobileApi` — Axios instance → `http://localhost:8081`
- React Query hooks: `useTrainings`, `useAssignments`, `useUnansweredQuestions`, `useMarkReviewed`, `useEvaluationResults`, `useEvalSummary`

### State Management
- `useTrainingStore` (Zustand) — training creation form draft state

---

## Mobile Frontend (React Native / Expo)

**Tech:** Expo ~54, React Native 0.81.5, React 19, TypeScript

### Screens
- `TrainingListScreen` — shows assignments from CMS + progress from mobile backend
- `TrainingPlayerScreen` — slide player, audio playback, AI chat, quiz modal

### Data Flow (TrainingListScreen)
```
Promise.all([fetchMyAssignments, fetchTrainings, fetchAllProgress])
  → merge by trainingId into AssignedTraining[]
  → sort: IN_PROGRESS → NOT_STARTED → COMPLETED
  → filter tabs: All | Not Started | In Progress | Completed
```
If `fetchMyAssignments` returns `[]` (no assignments in CMS), falls back to showing all published trainings.

### Progress Flow (TrainingPlayerScreen)
1. `handleOpen` → `initProgress(trainingId, assignmentId)` → creates DB record if new
2. `useEffect([currentIndex, slides.length, loadingSlides])` → calls `updateProgress` on every slide change
3. `markTrainingComplete` → sets 100% + COMPLETED status via POST endpoint

### Entry Point & Navigation
`App.tsx` manages `Selection | null` state (`{ training, assignmentId }`). No navigation library — simple conditional render.

### API (`src/api.ts`)
- `CMS_HOST` = `:8080` (web) or `192.168.1.8:8080` (device)
- `MOBILE_HOST` = `:8081` (web) or `192.168.1.8:8081` (device)
- `HEADERS = { 'X-User-Id': 'learner-uid', 'Content-Type': 'application/json' }`
- `resolveMediaUrl()` handles `/storage/...`, `gs://...`, and `https://...` URLs

---

## External Services

| Service | Used By | Purpose | Config |
|---|---|---|---|
| **Azure OpenAI** (`gpt-4o`) | Both backends | Quiz evaluation, RAG answers | `pitchperfectllmengine2.openai.azure.com` |
| **Azure OpenAI** (`text-embedding-3-small`) | CMS backend | FAQ embeddings | same endpoint |
| **Azure Speech** | Mobile backend | Audio transcription | region: `centralindia` |
| **ElevenLabs** | CMS backend | TTS audio generation | `eleven_multilingual_v2` |
| **Google Cloud Storage** | Both backends | Audio + slide image storage | bucket: `pitch-perfect-assets` |
| **Gemini** (`gemini-1.5-flash`) | Mobile backend (fallback) | RAG fallback | env: `GEMINI_API_KEY` |

### Locale → ElevenLabs Voice Mapping
| Locale | Voice Name | Voice ID |
|---|---|---|
| `en` | Adam | `pNInz6obpgDQGcFmaJgB` |
| `hi` | Anika | `RABOvaPec1ymXz02oDQi` |
| `ta` | Rachel | `21m00Tcm4TlvDq8ikWAM` |
| `te` | Domi | `AZnzlk1XvdvUeBnXmlld` |
| `mr` | Bella | `EXAVITQu4vr4xnSDxMaL` |
| `bn` | Elli | `FDQcYNtvPtQjNlTyU3du` |

---

## Important Patterns & Constraints

### Do Not Break
- **UUID for FAQ/Quiz IDs** — always `UUID.randomUUID()`, never from Excel cell values (prior bug: same Excel template across trainings caused ID collisions and data overwrite)
- **Batch slide count query** — `slideRepository.countsByTrainingIds(ids)` — never revert to per-training loop
- **FaqCacheService** — both backends have their own; `@CacheEvict` is called in `reprocessTraining`
- **Progress ID format** — `userId + "_" + trainingId`; changing this breaks existing records

### Service Name Visibility
Do not expose `ElevenLabs`, `Gemini`, `Azure` brand names in any UI (CMS progress modal, mobile screens). Use generic terms like "Audio Engine", "AI Model", "Speech Service".

### Caching
Both backends use Spring Cache (`@EnableCaching`). FAQ cache key = `trainingId`. Cache is in-memory (default ConcurrentMap). No Redis currently.

### File Storage Modes
CMS backend supports two storage modes via `app.storage.type`:
- `local` — files in `./storage/` folder, served via `/storage/**` mapping
- `gcs` — files in GCS bucket `pitch-perfect-assets`
Mobile backend always reads via `resolveMediaUrl()` which handles both URL formats.

### Supported Locales
`en`, `hi`, `ta`, `te`, `mr`, `bn` — defined in CMS application.yml as `app.supported-locales`

---

## Common Bugs & Fixes Already Applied

| Bug | Fix |
|---|---|
| FAQ/Quiz data for new training overwrites old training's data | Use `UUID.randomUUID()` for IDs, not Excel column 0 |
| N+1 queries on training list | Batch `countsByTrainingIds` JPQL query |
| FAQ cache missing on mobile | Added `FaqCacheService` + `@EnableCaching` to mobile backend |
| `learner_progress` table missing | Run `db/create_learner_progress.sql` then restart mobile backend |
| Progress percent 0% on first slide | Fixed: `(slideIndex+1)/totalSlides*100` |
| `startedAt` reset on swipe-back to slide 0 | Fixed: null-guarded `if (startedAt == null)` |
| `App.tsx` not passing `assignmentId` to player | Fixed: `Selection = { training, assignmentId }` |
| `updateProgress` fired before slides loaded | Fixed: effect guards on `!loadingSlides` |

---

## Running the Project

```bash
# CMS Backend
cd cms/backend-java && mvn spring-boot:run      # http://localhost:8080

# Mobile Backend
cd mobile/backend-java && mvn spring-boot:run   # http://localhost:8081

# CMS Frontend
cd cms/frontend-next && npm run dev             # http://localhost:3000

# Mobile App
cd mobile/frontend-rn-v2 && npx expo start     # Expo DevTools
```

### First-Time DB Setup
Run all scripts in `db/` against the `virtualcoach` SQL Server database:
```sql
-- Run each of these:
db/create_ingestion_jobs.sql
db/create_unanswered_questions.sql
db/create_learner_progress.sql
```

### Device Testing (Physical Phone)
Update `mobile/frontend-rn-v2/src/api.ts` — replace `192.168.1.8` with your machine's LAN IP.

---

## Git Branch Convention
- `main` — stable baseline
- `feat/sql` — current active development branch (current as of May 2026)
