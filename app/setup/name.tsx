import { View, Text, StyleSheet, TextInput } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

export default function NameScreen() {
  const { pending, update } = useOnboarding();
  const [name, setName] = useState(pending.name ?? "");

  const trimmed = name.trim();

  const handleContinue = () => {
    if (!trimmed) return;
    update({ name: trimmed });
    router.push("/setup/science" as any);
  };

  return (
    <QuestionLayout
      step={12}
      total={13}
      title="What should we call you?"
      subtitle="First name is fine. We'll use it on your dashboard and the rare nudge."
      canContinue={!!trimmed}
      onContinue={handleContinue}
    >
      <TextInput
        style={styles.input}
        placeholder="Your first name"
        placeholderTextColor={TOKENS.INK_FAINT}
        autoFocus
        autoCapitalize="words"
        textContentType="givenName"
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleContinue}
        returnKeyType="next"
        maxLength={40}
      />
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 22,
    color: TOKENS.INK,
    backgroundColor: "#FAFAFB",
    fontWeight: "600",
  },
});
