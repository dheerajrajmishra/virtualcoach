import { ELEVENLABS_CONFIG, charToViseme, type Viseme } from "../constants/avatarConfig";

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
 * Synthesize speech via ElevenLabs and return a `data:` audio URI plus a
 * viseme track aligned to that audio. Uses the `with-timestamps` endpoint
 * so we get character-level alignment in the same response.
 *
 * Why `data:` URI: expo-av will play base64 mp3 directly from a data URI
 * without us pulling in expo-file-system to write a temp file. For larger
 * payloads (>500KB) switch to writing to FileSystem.cacheDirectory.
 */
export async function synthesizeWithVisemes(
  text: string,
  options: { voiceId?: string; signal?: AbortSignal } = {},
): Promise<ElevenLabsResult> {
  const { apiKey, voiceId: defaultVoice, modelId, endpoint } = ELEVENLABS_CONFIG;

  if (!apiKey) {
    throw new ElevenLabsError(
      "ElevenLabs API key missing. Set EXPO_PUBLIC_ELEVENLABS_API_KEY in .env.",
    );
  }

  const voiceId = options.voiceId ?? defaultVoice;
  const url = `${endpoint}/${voiceId}/with-timestamps`;

  const res = await fetch(url, {
    method: "POST",
    signal: options.signal,
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ElevenLabsError(
      `ElevenLabs request failed (${res.status}): ${body || res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    audio_base64: string;
    alignment?: AlignmentBlock;
    normalized_alignment?: AlignmentBlock;
  };

  const audioUri = `data:audio/mpeg;base64,${data.audio_base64}`;

  const alignment = data.normalized_alignment ?? data.alignment;
  const visemes: VisemeFrame[] = [];
  if (alignment) {
    const {
      characters,
      character_start_times_seconds,
      character_end_times_seconds,
    } = alignment;
    for (let i = 0; i < characters.length; i++) {
      visemes.push({
        char: characters[i],
        start: character_start_times_seconds[i],
        end: character_end_times_seconds[i],
        viseme: charToViseme(characters[i]),
      });
    }
  }

  const duration = visemes.length > 0 ? visemes[visemes.length - 1].end : 0;
  return { audioUri, visemes, duration };
}

interface AlignmentBlock {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Pick the active viseme for a given audio currentTime (seconds). */
export function visemeAt(visemes: VisemeFrame[], time: number): Viseme {
  for (const frame of visemes) {
    if (time >= frame.start && time <= frame.end) return frame.viseme;
  }
  return "X";
}
