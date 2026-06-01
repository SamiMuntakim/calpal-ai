import { View, Text, StyleSheet, TextInput } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

export default function GoalWeightScreen() {
  const { pending, update } = useOnboarding();
  const current = pending.userStats?.currentWeight;
  const goalType = pending.userStats?.weeklyGoal;
  const [value, setValue] = useState(
    pending.userStats?.goalWeight ? String(pending.userStats.goalWeight) : ""
  );

  const goalNum = parseFloat(value);
  const valid = !isNaN(goalNum) && goalNum >= 20 && goalNum <= 500;

  // Validate direction matches goal type
  const directionOK =
    !current ||
    !valid ||
    (goalType === "lose" ? goalNum < current : goalNum > current);

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        goalWeight: goalNum,
      } as any,
    });
    router.push("/setup/goal-pace" as any);
  };

  const placeholder =
    current && goalType === "lose"
      ? String(Math.max(20, Math.round(current * 0.9)))
      : current && goalType === "gain"
      ? String(Math.round(current * 1.05))
      : "70";

  return (
    <QuestionLayout
      step={6}
      total={13}
      title="What's your target weight?"
      subtitle={
        current
          ? `You're at ${current} kg today. Where do you want to land?`
          : "The number on the scale you're aiming for."
      }
      canContinue={valid && directionOK}
      onContinue={handleContinue}
    >
      <View style={{ gap: 16 }}>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={TOKENS.INK_FAINT}
            keyboardType="decimal-pad"
            autoFocus
            maxLength={5}
          />
          <Text style={styles.unit}>kg</Text>
        </View>
        {valid && !directionOK && (
          <Text style={styles.warning}>
            {goalType === "lose"
              ? "Target should be lower than your current weight."
              : "Target should be higher than your current weight."}
          </Text>
        )}
      </View>
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 12 },
  input: {
    fontSize: 64,
    fontWeight: "800",
    color: TOKENS.INK,
    letterSpacing: -2,
    textAlign: "center",
    minWidth: 160,
  },
  unit: { fontSize: 20, fontWeight: "600", color: TOKENS.INK_MUTED },
  warning: {
    backgroundColor: "#FFF8E8",
    color: "#92400E",
    fontSize: 13,
    padding: 12,
    borderRadius: 10,
    textAlign: "center",
  },
});
