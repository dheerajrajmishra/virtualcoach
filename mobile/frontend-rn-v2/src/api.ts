import { Platform } from 'react-native';

const CMS_HOST = Platform.OS === 'web'
  ? 'http://localhost:8080'
  : 'http://192.168.1.3:8080';

const BASE = `${CMS_HOST}/api`;

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
  const res = await fetch(`${BASE}/trainings`, { headers: HEADERS });
  if (!res.ok) throw new Error('Failed to load trainings');
  return res.json();
}

export async function fetchSlides(trainingId: string): Promise<Slide[]> {
  const res = await fetch(`${BASE}/trainings/${trainingId}/slides`, { headers: HEADERS });
  if (!res.ok) throw new Error('Failed to load slides');
  return res.json();
}
