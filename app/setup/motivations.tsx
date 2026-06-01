import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  { key: "energy", label: "More energy", emoji: "⚡" },
  { key: "clothes", label: "Fit my clothes again", emoji: "👖" },
  { key: "confidence", label: "Feel confident", emoji: "✨" },
  { key: "health", label: "Improve my health", emoji: "❤️" },
  { key: "athletic", label: "Athletic performance", emoji: "🏃" },
  { key: "photos", label: "Look good in photos", emoji: "📸" },
  { key: "sleep", label: "Sleep better", emoji: "😴" },
  { key: "role_model", label: "Be a role model", emoji: "👨‍👩‍👧" },
  { key: "longevity", label: "Live longer", emoji: "🌳" },
];

export default function MotivationsScreen() {
  const { pending, updateMeta } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(
    pending.meta?.motivations ?? []
  );

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleContinue = () => {
    updateMeta({ motivations: selected });
    router.push("/setup/name" as any);
  };

  return (
    <QuestionLayout
      step={11}
      total={13}
      title="Why does this matter to you?"
      subtitle="Pick what's true. We'll reference these when you need a push."
      canContinue={selected.length > 0}
      onContinue={handleContinue}
      continueLabel={selected.length > 0 ? `Continue (${selected.length})` : "Continue"}
      scrollable
    >
      <View style={styles.grid}>
        {OPTIONS.map((o) => {
          const on = selected.includes(o.key);
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.tile, on && styles.tileActive]}
              onPress={() => toggle(o.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.emoji}>{o.emoji}</Text>
              <Text style={[styles.label, on && { color: TOKENS.INK }]}>
                {o.label}
              </Text>
              {on && (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "47%",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  tileActive: { borderColor: TOKENS.INK, backgroundColor: "#fff" },
  emoji: { fontSize: 28 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: TOKENS.INK_MUTED,
    textAlign: "center",
  },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.INK,
    alignItems: "center",
    justifyContent: "center",
  },
});
