import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  { key: "balanced", label: "Balanced", emoji: "🍽" },
  { key: "high_protein", label: "High protein", emoji: "🥩" },
  { key: "vegetarian", label: "Vegetarian", emoji: "🥗" },
  { key: "vegan", label: "Vegan", emoji: "🌱" },
  { key: "low_carb", label: "Low carb / Keto", emoji: "🥓" },
  { key: "mediterranean", label: "Mediterranean", emoji: "🫒" },
] as const;

export default function DietScreen() {
  const { pending, updateMeta } = useOnboarding();
  const [value, setValue] = useState(pending.meta?.diet ?? "");

  const handleContinue = () => {
    if (!value) return;
    updateMeta({ diet: value as any });
    router.push("/setup/obstacles" as any);
  };

  return (
    <QuestionLayout
      step={9}
      total={13}
      title="How do you eat?"
      subtitle="We'll tailor your macro split to match. Protein-heavy, carb-light, plant-based, your call."
      canContinue={!!value}
      onContinue={handleContinue}
      scrollable
    >
      <View style={styles.grid}>
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.tile, selected && styles.tileActive]}
              onPress={() => setValue(o.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.emoji}>{o.emoji}</Text>
              <Text style={[styles.label, selected && { color: TOKENS.INK }]}>
                {o.label}
              </Text>
              {selected && (
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
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  tileActive: { borderColor: TOKENS.INK, backgroundColor: "#fff" },
  emoji: { fontSize: 32 },
  label: { fontSize: 14, fontWeight: "700", color: TOKENS.INK_MUTED, textAlign: "center" },
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
