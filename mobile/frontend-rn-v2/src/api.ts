import { Platform } from 'react-native';

const CMS_HOST = Platform.OS === 'web'
  ? 'http://localhost:8080'
  : 'http://192.168.1.8:8080';

const MOBILE_HOST = Platform.OS === 'web'
  ? 'http://localhost:8081'
  : 'http://192.168.1.8:8081';

const BASE = `${CMS_HOST}/api`;
const MOBILE_BASE = `${MOBILE_HOST}/api`;

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

export interface AskRequest  { question: string; locale: string; slideIndex?: number }
export interface FaqSource   { question: string; answer: string; slideIndex: number }
export interface AskResponse { answer: string; sources: FaqSource[]; usedRag: boolean }

export async function askFaq(trainingId: string, req: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${MOBILE_BASE}/learner/ask`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      trainingId,
      ...req
    }),
  });
  if (!res.ok) throw new Error('FAQ service unavailable');
  return res.json();
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
  const res = await fetch(
    `${MOBILE_BASE}/evaluation/submit/text?trainingId=${encodeURIComponent(trainingId)}&quizId=${encodeURIComponent(quizId)}&locale=${encodeURIComponent(locale)}&response=${encodeURIComponent(response)}`,
    { method: 'POST', headers: { 'X-User-Id': 'learner-uid' } },
  );
  if (!res.ok) throw new Error('Evaluation failed');
  return res.json();
}

export async function transcribeAudio(uri: string, locale: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', {
    uri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);

  const res = await fetch(`${MOBILE_BASE}/learner/transcribe?locale=${locale}`, {
    method: 'POST',
    headers: { 'X-User-Id': 'learner-uid' },
    body: formData,
  });

  if (!res.ok) throw new Error('Transcription failed');
  const data = await res.json();
  return data.text || '';
}
