import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, ViewStyle } from "react-native";

/**
 * The original two-frame coach (coach_open.png / coach_closed.png) with a
 * subtle pulsing glow. This is the "Animated" mode – it stays in place when
 * the user prefers the existing experience. Pair with `expo-speech.Speech`
 * for narration in the parent.
 *
 * The implementation mirrors the inline `CoachAvatar` previously embedded
 * in TrainingPlayerScreen.tsx so swapping is behaviorally a no-op.
 */
interface Props {
  speaking: boolean;
  floating?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const AnimatedCoachAvatar: React.FC<Props> = ({
  speaking,
  floating = false,
  onPress,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (speaking) {
      // Random rhythm to simulate speech (matches old behavior).
      interval = setInterval(() => {
        setIsOpen((p) => !p);
      }, 150 + Math.random() * 100);

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      setIsOpen(false);
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
    return () => {
      if (interval) clearInterval(interval);
      glowAnim.stopAnimation();
    };
  }, [speaking]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] });
  const WrapComp = onPress ? TouchableOpacity : View;

  return (
    <WrapComp
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      style={[s.avatarWrap, floating && s.avatarWrapFloating, style]}
    >
      <Animated.View style={[s.avatarGlow, { opacity: glowOpacity }, floating && s.avatarGlowFloating]} />
      <View style={[s.avatarRing, speaking && s.avatarRingActive, floating && s.avatarRingFloating]}>
        <Image
          source={
            isOpen
              ? require("../../assets/coach_open.png")
              : require("../../assets/coach_closed.png")
          }
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      {!floating && <Text style={[s.avatarLabel, speaking && s.avatarLabelActive]}>AI Coach</Text>}
    </WrapComp>
  );
};

// Style names mirror the keys used by the original inline CoachAvatar so the
// visual remains identical.
const s = StyleSheet.create({
  avatarWrap: { alignItems: "center", justifyContent: "center", marginVertical: 8 },
  avatarWrapFloating: { marginVertical: 0, width: 56, height: 56 },
  avatarGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#6366f1",
  },
  avatarGlowFloating: { width: 74, height: 74, borderRadius: 37 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "#1f2937",
  },
  avatarRingActive: { borderColor: "#a5b4fc" },
  avatarRingFloating: { width: 56, height: 56, borderRadius: 28 },
  avatarLabel: {
    marginTop: 8,
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  avatarLabelActive: { color: "#a5b4fc" },
});
