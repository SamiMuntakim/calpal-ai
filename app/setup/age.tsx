import { View, Text, StyleSheet, TextInput } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

export default function AgeScreen() {
  const { pending, update } = useOnboarding();
  const [value, setValue] = useState(
    pending.userStats?.age ? String(pending.userStats.age) : ""
  );

  const ageNum = parseInt(value, 10);
  const valid = !isNaN(ageNum) && ageNum >= 10 && ageNum <= 120;

  const handleContinue = () => {
    update({
      userStats: {
        ...(pending.userStats ?? ({} as any)),
        age: ageNum,
      } as any,
    });
    router.push("/setup/height" as any);
  };

  return (
    <QuestionLayout
      step={2}
      total={13}
      title="How old are you?"
      subtitle="Your metabolism slows about 1 to 2% per decade. We adjust for that."
      canContinue={valid}
      onContinue={handleContinue}
    >
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="25"
          placeholderTextColor={TOKENS.INK_FAINT}
          keyboardType="number-pad"
          autoFocus
          maxLength={3}
        />
        <Text style={styles.unit}>years</Text>
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
    minWidth: 120,
  },
  unit: { fontSize: 20, fontWeight: "600", color: TOKENS.INK_MUTED },
});
