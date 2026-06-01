import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  { key: "motivation", label: "I lose motivation" },
  { key: "time", label: "I don't have time to track" },
  { key: "cost", label: "Healthy food is expensive" },
  { key: "social", label: "Social situations / eating out" },
  { key: "cravings", label: "Late-night cravings" },
  { key: "restrictive", label: "I hate restrictive diets" },
  { key: "plateau", label: "I plateau and give up" },
  { key: "first_time", label: "This is my first real attempt" },
];

export default function ObstaclesScreen() {
  const { pending, updateMeta } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(
    pending.meta?.obstacles ?? []
  );

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleContinue = () => {
    updateMeta({ obstacles: selected });
    router.push("/setup/motivations" as any);
  };

  return (
    <QuestionLayout
      step={10}
      total={13}
      title="What's stopped you before?"
      subtitle="Pick all that apply. We design around your real blockers, not idealised ones."
      canContinue={selected.length > 0}
      onContinue={handleContinue}
      continueLabel={selected.length > 0 ? `Continue (${selected.length})` : "Continue"}
      scrollable
    >
      <View style={{ gap: 8 }}>
        {OPTIONS.map((o) => {
          const on = selected.includes(o.key);
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.row, on && styles.rowActive]}
              onPress={() => toggle(o.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.label, on && { color: TOKENS.INK }]}>
                {o.label}
              </Text>
              <View style={[styles.check, on && styles.checkActive]}>
                {on && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
  },
  rowActive: { borderColor: TOKENS.INK, backgroundColor: "#fff" },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: TOKENS.INK_MUTED },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: { backgroundColor: TOKENS.INK, borderColor: TOKENS.INK },
});
