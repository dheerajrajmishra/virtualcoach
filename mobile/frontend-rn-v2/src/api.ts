import { Platform } from 'react-native';

const CMS_HOST = Platform.OS === 'web'
  ? 'http://localhost:8080'
  : 'http://10.192.223.145:8080';

const MOBILE_HOST = Platform.OS === 'web'
  ? 'http://localhost:8081'
  : 'http://10.192.223.145:8081';

export const BASE = `${CMS_HOST}/api`;
export const MOBILE_BASE = `${MOBILE_HOST}/api`;

const HEADERS = { 'X-User-Id': 'learner-uid', 'Content-Type': 'application/json' };

/**
 * Converts any URL format the backend returns into a full HTTP URL the mobile
 * app can load:
 *   /storage/slides/...  → http://<host>/storage/slides/...  (local storage mode)
 *   gs://bucket/path     → https://storage.googleapis.com/bucket/path  (GCS mode)
 *   https://...          → unchanged
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/storage/')) return `${CMS_HOST}${url}`;
  if (url.startsWith('gs://')) return 'https://storage.googleapis.com/' + url.slice(5);
  if (url.startsWith('http')) return url;
  return null;
}

export interface Training {
  id: string;
  name: string;
  category: string;
  product: string;
  status: 'DRAFT' | 'PROCESSING' | 'READY';
  totalSlides: number;
  supportedLocales: string[];
  createdAt: string;
  publishedAt: string | null;
}

export interface Slide {
  id: string;
  trainingId: string;
  slideIndex: number;
  title: string;
  imageGcsUrl: string | null;
  transcripts: Record<string, string>;
  audioUrls: Record<string, string>;
}

export async function fetchTrainings(): Promise<Training[]> {
  const res = await fetch(`${BASE}/trainings?published=true`, { headers: HEADERS });
  if (!res.ok) throw new Error('Failed to load trainings');
  return res.json();
}

export async function fetchSlides(trainingId: string): Promise<Slide[]> {
  const res = await fetch(`${BASE}/trainings/${trainingId}/slides`, { headers: HEADERS });
  if (!res.ok) throw new Error('Failed to load slides');
  return res.json();
}

export interface AskRequest { question: string; locale: string; slideIndex?: number }
export interface FaqSource { question: string; answer: string; slideIndex: number }
export interface AskResponse { answer: string; sources: FaqSource[]; usedRag: boolean }

export async function askFaq(trainingId: string, req: AskRequest): Promise<AskResponse> {
  try {
    const res = await fetch(`${MOBILE_BASE}/learner/ask`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        trainingId,
        ...req
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    return res.json();
  } catch (err: any) {
    throw new Error(`askFaq: ${err.message}`);
  }
}

export interface QuizQuestion {
  id: string;
  slideIndex: number;
  question: string;
  inputType: 'text' | 'audio' | 'video';
  maxScore: number;
}

export interface EvalResult {
  score: number;
  maxScore: number;
  scorePercent: number;
  feedback: string;
  strengths: string;
  improvements: string;
}

export async function fetchQuiz(trainingId: string, slideIndex: number, locale: string): Promise<QuizQuestion | null> {
  const res = await fetch(
    `${MOBILE_BASE}/learner/quiz/${trainingId}/slide/${slideIndex}?locale=${locale}`,
    { headers: HEADERS },
  );
  if (res.status === 204) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function submitQuizText(
  trainingId: string,
  quizId: string,
  locale: string,
  response: string,
): Promise<EvalResult> {
  try {
    const res = await fetch(
      `${MOBILE_BASE}/evaluation/submit/text?trainingId=${encodeURIComponent(trainingId)}&quizId=${encodeURIComponent(quizId)}&locale=${encodeURIComponent(locale)}&response=${encodeURIComponent(response)}`,
      { method: 'POST', headers: { 'X-User-Id': 'learner-uid' } },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    return res.json();
  } catch (err: any) {
    throw new Error(`submitQuizText: ${err.message}`);
  }
}

export interface LearnerProgress {
  id: string
  userId: string
  trainingId: string
  assignmentId: string | null
  currentSlideIndex: number
  totalSlides: number
  completionPercent: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  startedAt: string | null
  lastAccessedAt: string | null
  completedAt: string | null
  preferredLocale: string
}

export interface AssignmentItem {
  id: string
  userId: string
  trainingId: string
  product: string
  status: string
  deadline: string
  assignedAt: string
  assignedBy: string
}

export async function fetchMyAssignments(userId: string): Promise<AssignmentItem[]> {
  try {
    const res = await fetch(`${BASE}/assignments?userId=${encodeURIComponent(userId)}`, { headers: HEADERS });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export async function fetchAllProgress(): Promise<LearnerProgress[]> {
  try {
    const res = await fetch(`${MOBILE_BASE}/learner/all-progress`, { headers: HEADERS });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export async function initProgress(trainingId: string, assignmentId: string): Promise<LearnerProgress | null> {
  try {
    const res = await fetch(
      `${MOBILE_BASE}/learner/progress/${trainingId}?assignmentId=${encodeURIComponent(assignmentId)}`,
      { headers: HEADERS },
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function updateProgress(trainingId: string, slideIndex: number, totalSlides: number): Promise<void> {
  try {
    await fetch(`${MOBILE_BASE}/learner/progress/${trainingId}/slide`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ slideIndex, totalSlides }),
    });
  } catch { /* non-fatal */ }
}

export async function resetProgress(trainingId: string): Promise<LearnerProgress | null> {
  try {
    const res = await fetch(`${MOBILE_BASE}/learner/progress/${trainingId}/reset`, {
      method: 'POST',
      headers: HEADERS,
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function markTrainingComplete(trainingId: string): Promise<LearnerProgress | null> {
  try {
    const res = await fetch(`${MOBILE_BASE}/learner/progress/${trainingId}/complete`, {
      method: 'POST',
      headers: HEADERS,
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchFaqHints(trainingId: string, locale: string): Promise<string[]> {
  try {
    const res = await fetch(`${MOBILE_BASE}/learner/faq-hints/${trainingId}?locale=${locale}`, { headers: HEADERS });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function transcribeAudio(uri: string, locale: string): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('audio', blob, 'recording.m4a');
  } else {
    formData.append('audio', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
  }

  try {
    const res = await fetch(`${MOBILE_BASE}/learner/transcribe?locale=${locale}`, {
      method: 'POST',
      headers: { 'X-User-Id': 'learner-uid' },
      body: formData,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    const data = await res.json();
    return data.text || '';
  } catch (err: any) {
    throw new Error(`transcribeAudio: ${err.message}`);
  }
}
