import { useEffect, useState, useCallback } from "react";
import { AVATAR_MODES, type AvatarMode } from "../constants/avatarConfig";

/**
 * Lightweight module-level store for the avatar mode preference.
 *
 * We deliberately avoid AsyncStorage (not in the dependency tree on this
 * branch) and stick to in-memory state with a subscribe/publish pattern.
 * That gives us a single source of truth shared across every component
 * that mounts the hook, without adding a new dep.
 *
 * If you later want persistence across app restarts:
 *   1. `npm i @react-native-async-storage/async-storage`
 *   2. Hydrate `currentMode` in an `useEffect` inside `useAvatarMode`.
 *   3. Save inside `setModeGlobal` below.
 */

let currentMode: AvatarMode = AVATAR_MODES.ANIMATED;
const listeners = new Set<(m: AvatarMode) => void>();

function setModeGlobal(next: AvatarMode) {
  if (next === currentMode) return;
  currentMode = next;
  listeners.forEach((fn) => fn(next));
}

export function useAvatarMode(): {
  mode: AvatarMode;
  setMode: (m: AvatarMode) => void;
  toggle: () => void;
  isReal: boolean;
} {
  const [mode, setMode] = useState<AvatarMode>(currentMode);

  useEffect(() => {
    const handler = (next: AvatarMode) => setMode(next);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const update = useCallback((next: AvatarMode) => setModeGlobal(next), []);
  const toggle = useCallback(() => {
    setModeGlobal(currentMode === AVATAR_MODES.REAL ? AVATAR_MODES.ANIMATED : AVATAR_MODES.REAL);
  }, []);

  return {
    mode,
    setMode: update,
    toggle,
    isReal: mode === AVATAR_MODES.REAL,
  };
}
