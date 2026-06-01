import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { getNutritionRecommendations } from "../../services/geminiService";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const PRIMARY = "#0a7ea4";
const SUCCESS = "#10B981";

const STEPS = [
  "Analysing body composition",
  "Calculating BMR via Mifflin-St Jeor",
  "Adjusting TDEE for activity level",
  "Tuning deficit to your chosen pace",
  "Balancing macros for your diet",
  "Cross-referencing your motivations",
  "Finalising your personalised plan",
];

// Step reveal cadence — total ~4.5s, matches typical Gemini latency.
const STEP_INTERVAL_MS = 850;

export default function CalculatingScreen() {
  const { pending, update } = useOnboarding();
  const userStats = pending.userStats;

  const [currentStep, setCurrentStep] = useState(0);
  const [computedGoals, setComputedGoals] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hasRun = useRef(false);

  // Kick off the Gemini call in parallel with the animation.
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!userStats) {
      // If they somehow landed here without completing prior steps, bounce back
      router.replace("/setup/welcome" as any);
      return;
    }

    const run = async () => {
      try {
        const meta = pending.meta;
        const paceLabel =
          meta?.pace === "slow"
            ? "slow (0.25 kg/week)"
            : meta?.pace === "fast"
            ? "aggressive (0.75 kg/week)"
            : "balanced (0.5 kg/week)";
        const geminiData: any = {
          age: String(userStats.age),
          sex: userStats.gender,
          height: `${userStats.height} cm`,
          weight: `${userStats.currentWeight} kg`,
          activityLevel: userStats.activityLevel.replace(/_/g, " "),
          goal:
            userStats.weeklyGoal === "lose"
              ? `Lose weight at a ${paceLabel} pace, target ${userStats.goalWeight} kg`
              : userStats.weeklyGoal === "gain"
              ? `Gain weight at a ${paceLabel} pace, target ${userStats.goalWeight} kg`
              : "Maintain weight",
          // Diet preference shifts the macro split (e.g. low-carb gets more fat, vegan needs care with protein)
          dietPreference: meta?.diet
            ? meta.diet.replace(/_/g, " ")
            : "balanced",
        };
        const goals = await getNutritionRecommendations(userStats, geminiData);
        setComputedGoals(goals);
      } catch (e) {
        // Fallback so the user is never stuck
        setComputedGoals({ calories: 2000, protein: 150, carbs: 200, fats: 65 });
      }
    };
    run();
  }, [userStats, pending.meta]);

  // Drive the step animation independently
  useEffect(() => {
    if (currentStep < STEPS.length) {
      const t = setTimeout(() => setCurrentStep((s) => s + 1), STEP_INTERVAL_MS);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  // Only navigate forward when BOTH the animation has finished AND the goals are computed.
  useEffect(() => {
    if (currentStep >= STEPS.length && computedGoals) {
      update({ nutritionGoals: computedGoals });
      // Tiny breath so the last tick lands before transitioning
      const t = setTimeout(() => {
        router.replace("/setup/projection" as any);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [currentStep, computedGoals]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.head}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={26} color={PRIMARY} />
          </View>
          <Text style={styles.title}>Building your plan</Text>
          <Text style={styles.subtitle}>
            Crunching the numbers on your unique profile.
          </Text>
        </View>

        <View style={styles.steps}>
          {STEPS.map((label, i) => (
            <StepRow
              key={label}
              label={label}
              state={
                i < currentStep
                  ? "done"
                  : i === currentStep
                  ? "active"
                  : "pending"
              }
            />
          ))}
        </View>

        <View style={styles.footerWrap}>
          <Text style={styles.footer}>
            Powered by Gemini · personalised to you, not averaged
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepRow({
  label,
  state,
}: {
  label: string;
  state: "pending" | "active" | "done";
}) {
  const opacity = useRef(new Animated.Value(state === "pending" ? 0.3 : 1)).current;
  const scale = useRef(new Animated.Value(state === "done" ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: state === "pending" ? 0.3 : 1,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scale, {
        toValue: state === "done" ? 1 : 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }),
    ]).start();
  }, [state]);

  return (
    <Animated.View style={[styles.stepRow, { opacity }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {state === "done" ? (
          <View style={[styles.bullet, styles.bulletDone]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : state === "active" ? (
          <View style={styles.bulletActive}>
            <ActivityIndicator size="small" color={PRIMARY} />
          </View>
        ) : (
          <View style={styles.bulletPending} />
        )}
      </Animated.View>
      <Text
        style={[
          styles.stepLabel,
          state === "done" && styles.stepLabelDone,
          state === "active" && styles.stepLabelActive,
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  head: { alignItems: "center", gap: 12, marginTop: 40 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F4F8FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: INK,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 15, color: INK_MUTED, textAlign: "center", lineHeight: 22 },
  steps: { gap: 14, paddingHorizontal: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  bullet: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bulletDone: { backgroundColor: SUCCESS },
  bulletActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F8FA",
  },
  bulletPending: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#E5E8EC",
  },
  stepLabel: { fontSize: 16, color: INK_MUTED, fontWeight: "500", flex: 1 },
  stepLabelActive: { color: INK, fontWeight: "600" },
  stepLabelDone: { color: INK, fontWeight: "500" },
  footerWrap: { alignItems: "center" },
  footer: { fontSize: 12, color: INK_MUTED },
});
