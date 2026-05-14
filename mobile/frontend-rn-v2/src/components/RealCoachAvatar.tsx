import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import Svg, { Ellipse } from "react-native-svg";
import {
  synthesizeWithVisemes,
  visemeAt,
  type ElevenLabsResult,
} from "../services/elevenLabsService";
import type { Viseme } from "../constants/avatarConfig";

/**
 * Imperative handle so the parent can drive playback exactly the same way it
 * drives `expo-speech.Speech.speak/stop`. Keeps integration simple inside
 * TrainingPlayerScreen.
 */
export interface RealCoachAvatarHandle {
  /** Generate audio for `text` (if needed) and play it. */
  speak: (text: string) => Promise<void>;
  /** Stop and unload the current sound. */
  stop: () => Promise<void>;
}

interface Props {
  /** Whether the avatar should appear "active" (animated glow). */
  speaking: boolean;
  /** Floating fab variant – smaller + circular. */
  floating?: boolean;
  /** Custom portrait. If absent we render a styled placeholder. */
  portraitSource?: any;
  /** Optional callback when playback finishes naturally. */
  onSpeakEnd?: () => void;
  /** Optional error callback (parent can fall back to animated mode). */
  onError?: (err: Error) => void;
  style?: ViewStyle;
  /** Tap handler (only takes effect when not actively speaking). */
  onPress?: () => void;
  /** Voice override per training/locale. */
  voiceId?: string;
}

const MOUTH_SHAPES: Record<Viseme, { rx: number; ry: number; cy: number; opacity: number }> = {
  // rx/ry are scaled to a 100x100 viewBox.
  X: { rx: 14, ry: 1.5, cy: 70, opacity: 0.7 },
  A: { rx: 11, ry: 2, cy: 70, opacity: 0.85 },
  B: { rx: 13, ry: 5, cy: 70, opacity: 0.95 },
  C: { rx: 15, ry: 8, cy: 71, opacity: 1 },
  D: { rx: 17, ry: 12, cy: 72, opacity: 1 },
  E: { rx: 9, ry: 9, cy: 71, opacity: 1 },
  F: { rx: 8, ry: 9, cy: 71, opacity: 1 },
  G: { rx: 14, ry: 3, cy: 70, opacity: 0.9 },
  H: { rx: 14, ry: 6, cy: 71, opacity: 0.95 },
};

/**
 * Photoreal-style coach avatar driven by ElevenLabs lip sync.
 *
 * - On `speak(text)` we synthesize via ElevenLabs (audio + per-char timing),
 *   then play through expo-av. While playing, the SVG mouth shape morphs
 *   based on the active viseme at the current audio position.
 * - On `stop()` we tear down the sound and reset the mouth.
 * - If the API call fails (no key, quota, network), we surface via onError
 *   so the parent can flip the user back to ANIMATED mode.
 */
export const RealCoachAvatar = forwardRef<RealCoachAvatarHandle, Props>(function RealCoachAvatar(
  { speaking, floating = false, portraitSource, onSpeakEnd, onError, style, onPress: _onPress, voiceId },
  ref,
) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const resultRef = useRef<ElevenLabsResult | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(false);
  const [viseme, setViseme] = useState<Viseme>("X");

  useImperativeHandle(ref, () => ({
    async speak(text: string) {
      try {
        await stopInternal();
        setLoading(true);
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const result = await synthesizeWithVisemes(text, { voiceId });
        resultRef.current = result;

        const { sound } = await Audio.Sound.createAsync(
          { uri: result.audioUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 60 },
          (st: AVPlaybackStatus) => {
            if (!st.isLoaded) return;
            // Drive the mouth from the audio's positionMillis.
            const t = (st.positionMillis ?? 0) / 1000;
            const v = visemeAt(result.visemes, t);
            setViseme(v);
            if (st.didJustFinish) {
              setViseme("X");
              onSpeakEnd?.();
            }
          },
        );
        soundRef.current = sound;
        setLoading(false);
      } catch (e: any) {
        setLoading(false);
        setViseme("X");
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    },
    async stop() {
      await stopInternal();
    },
  }));

  async function stopInternal() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const snd = soundRef.current;
    soundRef.current = null;
    resultRef.current = null;
    setViseme("X");
    if (snd) {
      try {
        await snd.stopAsync();
      } catch {
        /* ignore */
      }
      try {
        await snd.unloadAsync();
      } catch {
        /* ignore */
      }
    }
  }

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopInternal().catch(() => {});
    };
  }, []);

  const shape = MOUTH_SHAPES[viseme];
  const dim = floating ? 56 : 96;

  return (
    <View style={[styles.wrap, floating && styles.floating, { width: dim, height: dim }, style]}>
      {/* Soft glow when speaking */}
      <View
        style={[
          styles.glow,
          { width: dim + 18, height: dim + 18, borderRadius: (dim + 18) / 2 },
          speaking && styles.glowActive,
        ]}
      />

      {/* Portrait base */}
      <View
        style={[
          styles.portrait,
          { width: dim, height: dim, borderRadius: dim / 2 },
          speaking && styles.portraitActive,
        ]}
      >
        {portraitSource ? (
          <Image source={portraitSource} style={styles.portraitImg} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderFace}>
            <Text style={styles.placeholderEmoji}>🧑‍💼</Text>
          </View>
        )}

        {/* Mouth overlay – the lip-sync layer */}
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <Ellipse
            cx="50"
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            fill={`rgba(120, 20, 30, ${shape.opacity})`}
          />
        </Svg>
      </View>

      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      )}

      {!floating && <Text style={styles.label}>AI Coach · Real</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  floating: {},
  glow: {
    position: "absolute",
    backgroundColor: "#6366f1",
    opacity: 0,
  },
  glowActive: { opacity: 0.35 },
  portrait: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  portraitActive: {
    borderColor: "#a5b4fc",
  },
  portraitImg: { width: "100%", height: "100%" },
  placeholderFace: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#374151",
  },
  placeholderEmoji: { fontSize: 36 },
  loadingPill: {
    position: "absolute",
    bottom: -10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  label: {
    marginTop: 8,
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
