import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ViewStyle } from "react-native";
import * as Speech from "expo-speech";
import { AVATAR_MODES } from "../constants/avatarConfig";
import { useAvatarMode } from "../hooks/useAvatarMode";
import { AnimatedCoachAvatar } from "./AnimatedCoachAvatar";
import { RealCoachAvatar, RealCoachAvatarHandle } from "./RealCoachAvatar";

export interface CoachAvatarRendererHandle {
  /**
   * Speak text using whichever engine the current mode dictates:
   *   - REAL  → ElevenLabs + lip sync
   *   - ANIMATED → expo-speech (native TTS)
   */
  speak: (text: string, language?: string) => Promise<void>;
  /** Stop any in-flight speech. */
  stop: () => Promise<void>;
}

interface Props {
  speaking: boolean;
  floating?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  /** Portrait shown in REAL mode (defaults to a placeholder face). */
  portraitSource?: any;
  /** Locale for server-side voice selection in REAL mode (e.g. "en", "hi"). */
  locale?: string;
  /** Called by RealCoachAvatar when ElevenLabs is unavailable. */
  onRealFallback?: () => void;
  onSpeakEnd?: () => void;
}

/**
 * Mode-aware coach avatar. Drop-in replacement for the inline `CoachAvatar`
 * that previously lived in TrainingPlayerScreen.tsx — but it also exposes
 * an imperative `speak/stop` API so the parent can replace `Speech.speak`
 * with `rendererRef.current?.speak(text)` and get the right engine for
 * the active mode for free.
 */
export const CoachAvatarRenderer = forwardRef<CoachAvatarRendererHandle, Props>(
  function CoachAvatarRenderer(
    { speaking, floating, onPress, style, portraitSource, locale, onRealFallback, onSpeakEnd },
    ref,
  ) {
    const { mode, setMode } = useAvatarMode();
    const realRef = useRef<RealCoachAvatarHandle | null>(null);

    useImperativeHandle(ref, () => ({
      async speak(text: string, language?: string) {
        if (mode === AVATAR_MODES.REAL) {
          await realRef.current?.speak(text);
        } else {
          Speech.stop();
          Speech.speak(text, {
            language: language ?? "en-US",
            onDone: () => onSpeakEnd?.(),
            onError: () => onSpeakEnd?.(),
            onStopped: () => onSpeakEnd?.(),
          });
        }
      },
      async stop() {
        if (mode === AVATAR_MODES.REAL) {
          await realRef.current?.stop();
        } else {
          Speech.stop();
        }
      },
    }));

    if (mode === AVATAR_MODES.REAL) {
      return (
        <RealCoachAvatar
          ref={realRef}
          speaking={speaking}
          floating={floating}
          onPress={onPress}
          style={style}
          portraitSource={portraitSource}
          locale={locale}
          onSpeakEnd={onSpeakEnd}
          onError={(err) => {
            console.warn("[CoachAvatarRenderer] Real mode failed – falling back to animated:", err);
            setMode(AVATAR_MODES.ANIMATED);
            onRealFallback?.();
          }}
        />
      );
    }

    return (
      <AnimatedCoachAvatar
        speaking={speaking}
        floating={floating}
        onPress={onPress}
        style={style}
      />
    );
  },
);
