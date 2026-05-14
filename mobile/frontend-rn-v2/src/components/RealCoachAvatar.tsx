import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import {
  synthesizeWithVisemes,
  visemeAt,
  type ElevenLabsResult,
} from "../services/elevenLabsService";

export interface RealCoachAvatarHandle {
  speak: (text: string) => Promise<void>;
  stop: () => Promise<void>;
}

interface Props {
  speaking: boolean;
  floating?: boolean;
  portraitSource?: any;
  onSpeakEnd?: () => void;
  onError?: (err: Error) => void;
  style?: ViewStyle;
  onPress?: () => void;
  locale?: string;
}

export const RealCoachAvatar = forwardRef<RealCoachAvatarHandle, Props>(function RealCoachAvatar(
  { speaking, floating = false, portraitSource, onSpeakEnd, onError, style, locale },
  ref,
) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const resultRef = useRef<ElevenLabsResult | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    async speak(text: string) {
      try {
        await stopInternal();
        setLoading(true);
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const result = await synthesizeWithVisemes(text, { locale });
        resultRef.current = result;

        const frames = result.visemes;

        const { sound } = await Audio.Sound.createAsync(
          { uri: result.audioUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 60 },
          (st: AVPlaybackStatus) => {
            if (!st.isLoaded) return;
            if (frames.length > 0) {
              const t = (st.positionMillis ?? 0) / 1000;
              setIsOpen(visemeAt(frames, t) !== "X");
            }
            if (st.didJustFinish) {
              setIsOpen(false);
              onSpeakEnd?.();
            }
          },
        );
        soundRef.current = sound;
        setLoading(false);

        if (frames.length === 0) {
          // No alignment data — fall back to animated open/close rhythm.
          tickRef.current = setInterval(() => {
            setIsOpen((prev) => !prev);
          }, 150 + Math.random() * 100);
        }
      } catch (e: any) {
        setLoading(false);
        setIsOpen(false);
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
    setIsOpen(false);
    if (snd) {
      try { await snd.stopAsync(); } catch { /* ignore */ }
      try { await snd.unloadAsync(); } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    return () => { stopInternal().catch(() => {}); };
  }, []);

  const dim = floating ? 56 : 96;
  const portrait = portraitSource
    ?? (isOpen
      ? require("../../assets/coach_open.png")
      : require("../../assets/coach_closed.png"));

  return (
    <View style={[styles.wrap, floating && styles.floating, style]}>
      <View style={{ width: dim, height: dim, alignItems: "center", justifyContent: "center" }}>
        {/* Soft glow when speaking */}
        <View
          style={[
            styles.glow,
            { width: dim + 18, height: dim + 18, borderRadius: (dim + 18) / 2 },
            speaking && styles.glowActive,
          ]}
        />

        <View
          style={[
            styles.portrait,
            { width: dim, height: dim, borderRadius: dim / 2 },
            speaking && styles.portraitActive,
          ]}
        >
          <Image source={portrait} style={styles.portraitImg} resizeMode="cover" />
        </View>

        {loading && (
          <View style={styles.loadingPill}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        )}
      </View>

      {!floating && <Text style={styles.label}>AI Coach · Real</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", alignSelf: "center", marginVertical: 8 },
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
  portraitActive: { borderColor: "#a5b4fc" },
  portraitImg: { width: "100%", height: "100%" },
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
