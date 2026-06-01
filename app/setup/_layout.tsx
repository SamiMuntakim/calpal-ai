import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="welcome" />

      {/* Body stats — 4 single-question screens */}
      <Stack.Screen name="gender" />
      <Stack.Screen name="age" />
      <Stack.Screen name="height" />
      <Stack.Screen name="weight" />

      {/* Goal — 4 single-question screens */}
      <Stack.Screen name="goal-type" />
      <Stack.Screen name="goal-weight" />
      <Stack.Screen name="goal-pace" />
      <Stack.Screen name="activity" />

      {/* Lifestyle / psychological */}
      <Stack.Screen name="diet" />
      <Stack.Screen name="obstacles" />
      <Stack.Screen name="motivations" />

      {/* Personal */}
      <Stack.Screen name="name" />

      {/* Authority + reveal — gestureEnabled: false so users don't swipe back mid-reveal */}
      <Stack.Screen name="science" />
      <Stack.Screen name="calculating" options={{ gestureEnabled: false }} />
      <Stack.Screen name="projection" options={{ gestureEnabled: false }} />
      <Stack.Screen name="plan-reveal" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
