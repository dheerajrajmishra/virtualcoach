import { charToViseme, type Viseme } from "../constants/avatarConfig";
import { MOBILE_BASE } from "../api";

/** Per-character timing aligned to the audio timeline. */
export interface VisemeFrame {
  start: number; // seconds
  end: number; // seconds
  char: string;
  viseme: Viseme;
}

export interface ElevenLabsResult {
  /**
   * Base64 `data:` URI that expo-av's `Audio.Sound.createAsync({ uri })`
   * can play directly – no temp file needed.
   */
  audioUri: string;
  visemes: VisemeFrame[];
  /** Audio duration in seconds, best effort. */
  duration: number;
}

export class ElevenLabsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

/**
 * Synthesize speech via the mobile backend (which proxies to ElevenLabs).
 * The API key never leaves the server — the frontend only sends text + locale.
 */
export async function synthesizeWithVisemes(
  text: string,
  options: { voiceId?: string; locale?: string; signal?: AbortSignal } = {},
): Promise<ElevenLabsResult> {
  const locale = options.locale ?? "en";

  const res = await fetch(`${MOBILE_BASE}/learner/synthesize`, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": "learner-uid",
    },
    body: JSON.stringify({ text, locale }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ElevenLabsError(
      `Speech synthesis failed (${res.status}): ${body || res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    audioBase64: string;
    characters: string[];
    characterStartTimes: number[];
    characterEndTimes: number[];
    duration: number;
  };

  const audioUri = `data:audio/mpeg;base64,${data.audioBase64}`;

  const visemes: VisemeFrame[] = [];
  const { characters = [], characterStartTimes = [], characterEndTimes = [] } = data;
  for (let i = 0; i < characters.length; i++) {
    visemes.push({
      char: characters[i],
      start: characterStartTimes[i],
      end: characterEndTimes[i],
      viseme: charToViseme(characters[i]),
    });
  }

  return { audioUri, visemes, duration: data.duration };
}

/** Pick the active viseme for a given audio currentTime (seconds). */
export function visemeAt(visemes: VisemeFrame[], time: number): Viseme {
  for (const frame of visemes) {
    if (time >= frame.start && time <= frame.end) return frame.viseme;
  }
  return "X";
}
