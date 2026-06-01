import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FFFFFF";
const BORDER = "#F0F2F5";
const PRIMARY = "#0a7ea4";

/**
 * Shared chrome for every single-question setup screen. Renders:
 *
 *  ┌─────────────────────────────────────────┐
 *  │ ←   ▓▓▓▓▓▓▓░░░░░░░░░░░░  6/13         │   ← header (back + progress)
 *  ├─────────────────────────────────────────┤
 *  │                                         │
 *  │  Question headline?                     │   ← big title
 *  │  Optional context line                  │   ← subtitle
 *  │                                         │
 *  │  [children — input / picker]            │   ← per-screen content
 *  │                                         │
 *  ├─────────────────────────────────────────┤
 *  │  [ Continue → ]                         │   ← sticky CTA
 *  └─────────────────────────────────────────┘
 */
export function QuestionLayout({
  step,
  total,
  title,
  subtitle,
  onContinue,
  canContinue,
  continueLabel,
  children,
  scrollable,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  onContinue: () => void;
  canContinue: boolean;
  continueLabel?: string;
  children: ReactNode;
  /** Wrap children in a ScrollView when content might overflow (e.g. long lists). */
  scrollable?: boolean;
}) {
  const pct = Math.min(step / total, 1);

  // Animate the progress bar smoothly between question screens instead of
  // snapping. The native driver isn't usable for width animation, so we
  // animate a 0..1 driver and interpolate to a percent string.
  const progressAnim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, progressAnim]);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleContinue = () => {
    if (!canContinue) return;
    // Light tactile confirm on each forward step. Adds significant
    // perceived polish without being intrusive.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onContinue();
  };

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — back + progress */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={INK} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
        <Text style={styles.progressText}>
          {step}/{total}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.body}>{children}</View>
          </ScrollView>
        ) : (
          <View style={styles.content}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.body}>{children}</View>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, !canContinue && styles.btnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.9}
            disabled={!canContinue}
          >
            <Text style={styles.btnText}>{continueLabel ?? "Continue"}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Shared design tokens exported for use inside per-screen children.
// Keeps colours consistent without each screen redefining them.
export const TOKENS = {
  INK,
  INK_MUTED,
  INK_FAINT,
  BG,
  BORDER,
  PRIMARY,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: BORDER,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: INK,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    color: INK_MUTED,
    minWidth: 36,
    textAlign: "right",
  },

  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24 },
  head: { gap: 10, marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: { fontSize: 16, color: INK_MUTED, lineHeight: 22 },
  body: { flex: 1 },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 17,
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
});
