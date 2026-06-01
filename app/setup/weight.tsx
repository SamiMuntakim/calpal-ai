import { View, Text, StyleSheet, TextInput } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

export default function WeightScreen() {
  const { pending, update } = useOnboarding();
  const [value, setValue] = useState(
    pending.userStats?.currentWeight
      ? String(pending.userStats.currentWeight)
      : ""
  );

  const weightNum = parseFloat(value);
  const valid = !isNaN(weightNum) && weightNum >= 20 && weightNum <= 500;

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        currentWeight: weightNum,
        // Default starting weight to current — they can change this in settings
        startingWeight: pending.userStats?.startingWeight ?? weightNum,
      } as any,
    });
    router.push("/setup/goal-type" as any);
  };

  return (
    <QuestionLayout
      step={4}
      total={13}
      title="What's your current weight?"
      subtitle="The honest number. No judgment, only data."
      canContinue={valid}
      onContinue={handleContinue}
    >
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="75"
          placeholderTextColor={TOKENS.INK_FAINT}
          keyboardType="decimal-pad"
          autoFocus
          maxLength={5}
        />
        <Text style={styles.unit}>kg</Text>
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
});
