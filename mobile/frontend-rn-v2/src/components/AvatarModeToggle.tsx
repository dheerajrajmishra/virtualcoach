import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { AVATAR_MODES, type AvatarMode } from "../constants/avatarConfig";

interface Props {
  mode: AvatarMode;
  onChange: (m: AvatarMode) => void;
  /** Disable while the avatar is mid-utterance to prevent corrupt swaps. */
  disabled?: boolean;
  /** Compact variant: smaller pills, no label – good for header rows. */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Segmented control for picking the avatar mode.
 *
 *   [ 🎭 Animated ] [ 👤 Real ]
 *
 * The Real option triggers ElevenLabs + lip-sync; Animated keeps the
 * existing 2-frame coach + expo-speech.
 */
export const AvatarModeToggle: React.FC<Props> = ({
  mode,
  onChange,
  disabled = false,
  compact = false,
  style,
}) => {
  const isReal = mode === AVATAR_MODES.REAL;

  return (
    <View style={[styles.wrap, style]}>
      {!compact && <Text style={styles.label}>AVATAR</Text>}
      <View style={[styles.track, disabled && styles.disabled]}>
        <Pill
          active={!isReal}
          disabled={disabled}
          label={`${compact ? "" : "🎭 "}Animated`}
          onPress={() => onChange(AVATAR_MODES.ANIMATED)}
          compact={compact}
        />
        <Pill
          active={isReal}
          disabled={disabled}
          label={`${compact ? "" : "👤 "}Real`}
          onPress={() => onChange(AVATAR_MODES.REAL)}
          compact={compact}
        />
      </View>
    </View>
  );
};

interface PillProps {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  compact: boolean;
}

const Pill: React.FC<PillProps> = ({ active, disabled, label, onPress, compact }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.pill,
      compact && styles.pillCompact,
      active && styles.pillActive,
    ]}
  >
    <Text style={[styles.pillText, compact && styles.pillTextCompact, active && styles.pillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start", gap: 4 },
  label: {
    color: "#c7d2fe",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  disabled: { opacity: 0.55 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillCompact: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e0e7ff",
    letterSpacing: 0.5,
  },
  pillTextCompact: { fontSize: 10 },
  pillTextActive: { color: "#4f46e5" },
});
