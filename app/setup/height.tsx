import { View, Text, StyleSheet, TextInput } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

export default function HeightScreen() {
  const { pending, update } = useOnboarding();
  const [value, setValue] = useState(
    pending.userStats?.height ? String(pending.userStats.height) : ""
  );

  const heightNum = parseFloat(value);
  const valid = !isNaN(heightNum) && heightNum >= 50 && heightNum <= 280;

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        height: heightNum,
      } as any,
    });
    router.push("/setup/weight" as any);
  };

  return (
    <QuestionLayout
      step={3}
      total={13}
      title="How tall are you?"
      subtitle="A bigger frame burns more calories at rest. We factor it in."
      canContinue={valid}
      onContinue={handleContinue}
    >
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="175"
          placeholderTextColor={TOKENS.INK_FAINT}
          keyboardType="decimal-pad"
          autoFocus
          maxLength={3}
        />
        <Text style={styles.unit}>cm</Text>
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
