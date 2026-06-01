import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useOnboarding } from "../../contexts/OnboardingContext";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const PRIMARY = "#0a7ea4";
const SURFACE_ALT = "#F4F8FA";

function estimateGoalDate(
  current: number,
  goal: number,
  pace: string
): string {
  const diff = Math.abs(goal - current);
  if (pace === "maintain" || diff < 0.5) return "Maintain weight";

  // Reasonable weekly change assumptions
  const weeklyKg = pace === "lose" ? 0.5 : pace === "gain" ? 0.3 : 0;
  if (weeklyKg === 0) return "—";

  const weeks = Math.ceil(diff / weeklyKg);
  const target = new Date();
  target.setDate(target.getDate() + weeks * 7);
  return target.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlanRevealScreen() {
  const { pending } = useOnboarding();
  const goals = pending.nutritionGoals;
  const stats = pending.userStats;
  const name = pending.name ?? "";

  // Guard: if data is missing on initial mount, bounce back to start.
  // We capture this in a ref + empty-deps useEffect so the guard runs ONCE.
  // Otherwise the paywall's resetOnboarding() would re-trigger this and
  // race with paywall's router.replace("/(tabs)"), kicking the user back
  // here after a successful purchase.
  const guardedRef = useRef(false);
  useEffect(() => {
    if (guardedRef.current) return;
    guardedRef.current = true;
    if (!goals || !stats) {
      router.replace("/setup/welcome" as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation refs — staggered entrance for big number + macro cards
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(20)).current;
  const calOpacity = useRef(new Animated.Value(0)).current;
  const calScale = useRef(new Animated.Value(0.9)).current;
  const macroOpacity = useRef(new Animated.Value(0)).current;
  const macroY = useRef(new Animated.Value(20)).current;
  const insightOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headlineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(headlineY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      Animated.parallel([
        Animated.timing(calOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(calScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]),
      Animated.parallel([
        Animated.timing(macroOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(macroY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      Animated.timing(insightOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(ctaOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!goals || !stats) return null;

  // Map motivation keys back to user-facing language. We reflect their stated
  // reasons back to reinforce ownership of the plan ("this is what YOU said
  // you wanted") — identity priming, Cal AI / Noom pattern.
  const motivationLabels: Record<string, string> = {
    energy: "more energy",
    clothes: "fit your clothes",
    confidence: "feeling confident",
    health: "better health",
    athletic: "athletic performance",
    photos: "looking good in photos",
    sleep: "better sleep",
    role_model: "being a role model",
    longevity: "living longer",
  };
  const motivations = (pending.meta?.motivations ?? [])
    .map((k) => motivationLabels[k])
    .filter(Boolean);
  const motivationLine =
    motivations.length === 0
      ? null
      : motivations.length === 1
      ? motivations[0]
      : motivations.length === 2
      ? `${motivations[0]} and ${motivations[1]}`
      : `${motivations.slice(0, -1).join(", ")}, and ${motivations[motivations.length - 1]}`;

  const goalDate = estimateGoalDate(stats.currentWeight, stats.goalWeight, stats.weeklyGoal);
  const goalLabel =
    stats.weeklyGoal === "lose"
      ? "Lose fat"
      : stats.weeklyGoal === "gain"
      ? "Build muscle"
      : "Maintain";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Headline */}
        <Animated.View
          style={[
            styles.headWrap,
            { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
          ]}
        >
          <Text style={styles.eyebrow}>YOUR PLAN IS READY</Text>
          <Text style={styles.headline}>
            {name ? `${name}, ` : ""}here's how you{"\n"}
            <Text style={styles.headlineAccent}>hit your goal.</Text>
          </Text>
        </Animated.View>

        {/* Big calorie card */}
        <Animated.View
          style={[
            styles.calorieCard,
            { opacity: calOpacity, transform: [{ scale: calScale }] },
          ]}
        >
          <Text style={styles.calorieLabel}>Daily target</Text>
          <Text style={styles.calorieNumber}>{Math.round(goals.calories).toLocaleString()}</Text>
          <Text style={styles.calorieUnit}>kcal / day</Text>

          <View style={styles.divider} />

          <View style={styles.targetRow}>
            <Ionicons name="flag" size={14} color={PRIMARY} />
            <Text style={styles.targetText}>
              {goalLabel} to <Text style={styles.targetStrong}>{stats.goalWeight} kg</Text>
              {goalDate !== "Maintain weight" && goalDate !== "—" && (
                <> by <Text style={styles.targetStrong}>{goalDate}</Text></>
              )}
            </Text>
          </View>
        </Animated.View>

        {/* Macros */}
        <Animated.View
          style={[
            styles.macros,
            { opacity: macroOpacity, transform: [{ translateY: macroY }] },
          ]}
        >
          <MacroCard label="Protein" value={Math.round(goals.protein)} color="#FF6B6B" />
          <MacroCard label="Carbs" value={Math.round(goals.carbs)} color="#4ECDC4" />
          <MacroCard label="Fats" value={Math.round(goals.fats)} color="#FFB800" />
        </Animated.View>

        {/* Insight — reflects their stated motivations back so the plan feels owned, not assigned */}
        <Animated.View style={[styles.insight, { opacity: insightOpacity }]}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb" size={16} color={PRIMARY} />
          </View>
          <Text style={styles.insightText}>
            {motivationLine
              ? `Calibrated for ${motivationLine}. Not a generic template.`
              : "Calibrated to your BMR, activity level, and goal pace. Not a generic template."}
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Sticky CTA */}
      <Animated.View style={[styles.ctaWrap, { opacity: ctaOpacity }]}>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push("/paywall" as any)}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Unlock my plan</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function MacroCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={macroStyles.card}>
      <View style={[macroStyles.dot, { backgroundColor: color }]} />
      <Text style={macroStyles.value}>{value}<Text style={macroStyles.unit}>g</Text></Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SURFACE_ALT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  value: { fontSize: 20, fontWeight: "800", color: INK, letterSpacing: -0.5 },
  unit: { fontSize: 12, fontWeight: "600", color: INK_MUTED },
  label: { fontSize: 12, color: INK_MUTED, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 24,
  },

  headWrap: { gap: 8 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 1,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: INK,
    letterSpacing: -1,
    lineHeight: 38,
  },
  headlineAccent: { color: PRIMARY },

  calorieCard: {
    backgroundColor: INK,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 2,
  },
  calorieLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  calorieNumber: {
    fontSize: 72,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -3,
    lineHeight: 80,
    marginTop: 4,
  },
  calorieUnit: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 16,
  },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  targetText: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  targetStrong: { color: "#fff", fontWeight: "700" },

  macros: { flexDirection: "row", gap: 10 },

  insight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE_ALT,
    borderRadius: 14,
    padding: 14,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  insightText: { flex: 1, fontSize: 13, color: INK_MUTED, lineHeight: 19 },

  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
    backgroundColor: "#fff",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 17,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
});
