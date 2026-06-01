import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  { key: "sedentary", label: "Sedentary", sub: "Mostly at a desk" },
  { key: "lightly_active", label: "Lightly active", sub: "1–3 days/week" },
  { key: "moderately_active", label: "Active", sub: "3–5 days/week" },
  { key: "very_active", label: "Very active", sub: "6–7 days/week" },
  { key: "extremely_active", label: "Athlete", sub: "2× per day or physical job" },
];

export default function ActivityScreen() {
  const { pending, update } = useOnboarding();
  const [value, setValue] = useState(pending.userStats?.activityLevel ?? "");

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        activityLevel: value,
      } as any,
    });
    router.push("/setup/diet" as any);
  };

  return (
    <QuestionLayout
      step={8}
      total={13}
      title="How active are you?"
      subtitle="Be honest. We use this to calibrate your daily burn."
      canContinue={!!value}
      onContinue={handleContinue}
      scrollable
    >
      <View style={{ gap: 8 }}>
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.row, selected && styles.rowActive]}
              onPress={() => setValue(o.key)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, selected && { color: TOKENS.INK }]}>
                  {o.label}
                </Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selected && styles.radioActive,
                ]}
              >
                {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
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
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
  },
  rowActive: { borderColor: TOKENS.INK, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "700", color: TOKENS.INK_MUTED },
  sub: { fontSize: 13, color: TOKENS.INK_MUTED, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: TOKENS.INK, backgroundColor: TOKENS.INK },
});
