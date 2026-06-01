import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  {
    key: "lose",
    label: "Lose fat",
    sub: "Reduce body weight while preserving muscle",
    icon: "trending-down" as const,
    colour: "#22C55E",
    tint: "#E8F8EE",
  },
  {
    key: "maintain",
    label: "Maintain",
    sub: "Stay around your current weight",
    icon: "remove" as const,
    colour: "#0a7ea4",
    tint: "#E6F3F8",
  },
  {
    key: "gain",
    label: "Build muscle",
    sub: "Gain weight, prioritise protein and recovery",
    icon: "trending-up" as const,
    colour: "#F59E0B",
    tint: "#FFF6E6",
  },
];

export default function GoalTypeScreen() {
  const { pending, update } = useOnboarding();
  const [value, setValue] = useState(pending.userStats?.weeklyGoal ?? "");

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        weeklyGoal: value,
      } as any,
    });
    // If they picked maintain, skip pace + goal-weight (it's their current weight)
    if (value === "maintain") {
      update({
        userStats: {
          ...(pending.userStats ?? ({} as any)),
          weeklyGoal: value,
          goalWeight: pending.userStats?.currentWeight ?? 0,
        } as any,
      });
      router.push("/setup/activity" as any);
    } else {
      router.push("/setup/goal-weight" as any);
    }
  };

  return (
    <QuestionLayout
      step={5}
      total={13}
      title="What's the goal?"
      subtitle="Pick the one that matches what you actually want."
      canContinue={!!value}
      onContinue={handleContinue}
    >
      <View style={styles.cards}>
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[
                styles.card,
                selected && {
                  borderColor: o.colour,
                  backgroundColor: "#fff",
                },
              ]}
              onPress={() => setValue(o.key)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: selected ? o.colour : o.tint },
                ]}
              >
                <Ionicons
                  name={o.icon}
                  size={20}
                  color={selected ? "#fff" : o.colour}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, selected && { color: TOKENS.INK }]}>
                  {o.label}
                </Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
              {selected && (
                <View style={[styles.checkPill, { backgroundColor: o.colour }]}>
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 16, fontWeight: "700", color: TOKENS.INK_MUTED },
  sub: { fontSize: 13, color: TOKENS.INK_MUTED, marginTop: 2 },
  checkPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
