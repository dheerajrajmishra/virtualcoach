/**
 * Avatar mode configuration & viseme mapping for the RN training player.
 *
 * Modes:
 *  - ANIMATED: existing 2-frame coach PNGs + expo-speech (native TTS).
 *  - REAL: photoreal portrait + ElevenLabs audio with character-level lip sync.
 */

export const AVATAR_MODES = {
  REAL: "real",
  ANIMATED: "animated",
} as const;

export type AvatarMode = (typeof AVATAR_MODES)[keyof typeof AVATAR_MODES];

/**
 * ElevenLabs config.
 *
 * IMPORTANT: react-native does NOT have Vite's import.meta.env. We read these
 * from `process.env.EXPO_PUBLIC_*` (Expo's public env convention) so the
 * values are inlined at build time. Set them in `.env` at the project root:
 *
 *   EXPO_PUBLIC_ELEVENLABS_API_KEY=your_key
 *   EXPO_PUBLIC_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
 *
 * For production you should proxy through your Spring backend so the key
 * never ships in the mobile binary.
 */
export const ELEVENLABS_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY as string | undefined,
  voiceId:
    (process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID as string | undefined) ??
    "21m00Tcm4TlvDq8ikWAM", // Rachel
  modelId: "eleven_turbo_v2_5",
  endpoint: "https://api.elevenlabs.io/v1/text-to-speech",
};

/** Coarse viseme set — mouth shape codes (Preston Blair-ish). */
export type Viseme = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";

/**
 * Character → viseme mapping. ElevenLabs returns per-character timestamps
 * via the `with-timestamps` endpoint; we project each character to one of
 * these 9 mouth shapes for lip sync. Good-enough for browser/mobile lip
 * sync without a full Rhubarb-style phonemizer.
 */
export const VISEME_MAP: Record<string, Viseme> = {
  a: "D", e: "C", i: "C", o: "F", u: "E",
  m: "A", b: "A", p: "A",
  f: "G", v: "G",
  l: "H", t: "B", d: "B", n: "B", s: "B", z: "B", r: "B",
  k: "B", g: "B", j: "B", y: "B",
  w: "F", h: "X",
  " ": "X", ".": "X", ",": "X", "!": "X", "?": "X", "\n": "X",
};

export function charToViseme(ch: string): Viseme {
  return VISEME_MAP[ch.toLowerCase()] ?? "B";
}
