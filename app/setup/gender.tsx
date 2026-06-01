import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  { key: "male", label: "Male", icon: "male" as const },
  { key: "female", label: "Female", icon: "female" as const },
  { key: "other", label: "Other", icon: "person" as const },
];

export default function GenderScreen() {
  const { pending, update } = useOnboarding();
  const [value, setValue] = useState(
    pending.userStats?.gender?.toLowerCase() ?? ""
  );

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        gender: value,
      } as any,
    });
    router.push("/setup/age" as any);
  };

  return (
    <QuestionLayout
      step={1}
      total={13}
      title="What's your biological sex?"
      subtitle="Used to calibrate your calorie needs. Never shared."
      canContinue={!!value}
      onContinue={handleContinue}
    >
      <View style={styles.cards}>
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.card, selected && styles.cardActive]}
              onPress={() => setValue(o.key)}
              activeOpacity={0.85}
            >
              <View
                style={[styles.iconWrap, selected && styles.iconWrapActive]}
              >
                <Ionicons
                  name={o.icon}
                  size={22}
                  color={selected ? "#fff" : TOKENS.INK}
                />
              </View>
              <Text style={[styles.label, selected && styles.labelActive]}>
                {o.label}
              </Text>
              {selected && (
                <View style={styles.checkPill}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
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
  cards: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
  },
  cardActive: { borderColor: TOKENS.INK, backgroundColor: "#fff" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: TOKENS.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: TOKENS.INK, borderColor: TOKENS.INK },
  label: { flex: 1, fontSize: 17, fontWeight: "700", color: TOKENS.INK_MUTED },
  labelActive: { color: TOKENS.INK },
  checkPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TOKENS.INK,
    alignItems: "center",
    justifyContent: "center",
  },
});
