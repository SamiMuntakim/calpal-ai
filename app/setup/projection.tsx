import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { useEffect, useRef, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useOnboarding } from "../../contexts/OnboardingContext";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FFFFFF";
const BORDER = "#F0F2F5";

const CALPAL = "#0a7ea4";
const FLAT = "#94A3B8";   // grey-ish for the "no CalPal" line
const GOAL_GREEN = "#22C55E";

/**
 * The single most important screen in the funnel.
 *
 * After 13 questions + an authority moment + a 5-step theatrical calculation,
 * we visually show them the gap between staying where they are and using
 * CalPal. The chart curves down (or up for muscle gain) toward their goal
 * by their target date, with the flat "if you do nothing" line for contrast.
 *
 * This is pure loss-aversion. They've earned the right to see this number,
 * they own this plan now, and the cost of not subscribing is rendered
 * visually — not as text.
 */
export default function ProjectionScreen() {
  const { pending } = useOnboarding();
  const stats = pending.userStats;
  const pace = pending.meta?.pace ?? "moderate";
  const name = pending.name ?? "";

  // Compute projection
  const projection = useMemo(() => {
    if (!stats?.currentWeight || !stats?.goalWeight) return null;

    const start = stats.currentWeight;
    const goal = stats.goalWeight;
    const direction = goal > start ? 1 : goal < start ? -1 : 0;
    const ratePerWeek = pace === "slow" ? 0.25 : pace === "fast" ? 0.75 : 0.5;
    const weeksToGoal = Math.ceil(Math.abs(goal - start) / ratePerWeek);

    const totalWeeks = Math.max(4, weeksToGoal);
    const points = Array.from({ length: totalWeeks + 1 }).map((_, i) => {
      // Easing curve — fast at start, gradual near the goal (real-world weight loss/gain)
      const t = i / totalWeeks;
      const eased = 1 - Math.pow(1 - t, 1.6);
      const projected = start + direction * Math.abs(goal - start) * eased;
      return Math.round(projected * 10) / 10;
    });

    // Target date
    const target = new Date();
    target.setDate(target.getDate() + weeksToGoal * 7);

    return {
      start,
      goal,
      direction,
      points,
      totalWeeks,
      weeksToGoal,
      targetDate: target,
      totalChange: Math.abs(goal - start).toFixed(1),
      action: direction < 0 ? "lose" : direction > 0 ? "gain" : "maintain",
    };
  }, [stats, pace]);

  // Entrance animations
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(20)).current;
  const chartOpacity = useRef(new Animated.Value(0)).current;
  const statOpacity = useRef(new Animated.Value(0)).current;
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
      Animated.timing(chartOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(statOpacity, {
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

  // Guard — one-shot on mount only. Mirrors the same pattern as plan-reveal:
  // if we somehow land here without setup data, bounce. Empty deps means it
  // cannot re-fire later when the paywall resets OnboardingContext (which
  // would race with /(tabs) navigation and bounce the user back to /setup).
  const guardedRef = useRef(false);
  useEffect(() => {
    if (guardedRef.current) return;
    guardedRef.current = true;
    if (!projection) router.replace("/setup/welcome" as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!projection) return null;

  const targetLabel = projection.targetDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.head,
            { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
          ]}
        >
          <Text style={styles.eyebrow}>YOUR PROJECTION</Text>
          <Text style={styles.headline}>
            {name ? `${name}, you'll ` : "You'll "}
            <Text style={styles.headlineAccent}>
              {projection.action === "lose"
                ? `reach ${projection.goal} kg`
                : projection.action === "gain"
                ? `hit ${projection.goal} kg`
                : `stay at ${projection.goal} kg`}
            </Text>
            {"\n"}by {targetLabel}.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.chartCard, { opacity: chartOpacity }]}>
          <Chart projection={projection} />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CALPAL }]} />
              <Text style={styles.legendText}>With CalPal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: FLAT }]} />
              <Text style={styles.legendText}>Without</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.statRow, { opacity: statOpacity }]}>
          <Stat
            label={projection.action === "lose" ? "To lose" : projection.action === "gain" ? "To gain" : "Hold"}
            value={`${projection.totalChange} kg`}
            colour={projection.action === "lose" ? GOAL_GREEN : CALPAL}
          />
          <Stat
            label="Timeline"
            value={`${projection.weeksToGoal} weeks`}
            colour={INK}
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.ctaWrap, { opacity: ctaOpacity }]}>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push("/setup/plan-reveal" as any)}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>See my plan</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function Stat({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: colour }]}>{value}</Text>
    </View>
  );
}

// ─── Chart (pure RN, no SVG) ─────────────────────────────────────────────────

function Chart({
  projection,
}: {
  projection: {
    points: number[];
    start: number;
    goal: number;
    totalWeeks: number;
  };
}) {
  const width = Dimensions.get("window").width - 80;
  const height = 200;
  const padding = { top: 20, right: 16, bottom: 28, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Y axis range — pad slightly so curves don't kiss edges
  const allYs = [...projection.points, projection.start];
  const minY = Math.min(...allYs) - 0.5;
  const maxY = Math.max(...allYs) + 0.5;
  const yRange = maxY - minY || 1;

  const xStep = chartW / projection.totalWeeks;
  const yPos = (val: number) =>
    padding.top + ((maxY - val) / yRange) * chartH;

  // CalPal line — actual projection points
  const calpalSegments = [];
  for (let i = 0; i < projection.points.length - 1; i++) {
    const p1x = padding.left + i * xStep;
    const p1y = yPos(projection.points[i]);
    const p2x = padding.left + (i + 1) * xStep;
    const p2y = yPos(projection.points[i + 1]);
    const dx = p2x - p1x;
    const dy = p2y - p1y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    calpalSegments.push(
      <View
        key={`calpal-${i}`}
        style={{
          position: "absolute",
          left: p1x,
          top: p1y - 1.5,
          width: len,
          height: 3,
          backgroundColor: CALPAL,
          transformOrigin: "left center",
          transform: [{ rotate: `${angle}deg` }],
          borderRadius: 2,
        }}
      />
    );
  }

  // Flat line — "what happens if you do nothing"
  const flatY = yPos(projection.start);
  const flatLine = (
    <View
      style={{
        position: "absolute",
        left: padding.left,
        right: padding.right,
        top: flatY - 1,
        height: 2,
        backgroundColor: FLAT,
        borderRadius: 1,
        opacity: 0.7,
      }}
    />
  );

  // Goal line (dashed-ish via opacity)
  const goalY = yPos(projection.goal);
  const goalLine = (
    <>
      <View
        style={{
          position: "absolute",
          left: padding.left,
          right: padding.right,
          top: goalY - 0.5,
          height: 1,
          backgroundColor: GOAL_GREEN,
          opacity: 0.35,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: padding.right - 6,
          top: goalY - 9,
          backgroundColor: "#E8F8EE",
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: "800",
            color: GOAL_GREEN,
            letterSpacing: 0.3,
          }}
        >
          goal
        </Text>
      </View>
    </>
  );

  // Y-axis labels (current + goal)
  const yLabels = (
    <>
      <Text
        style={[styles.yLabel, { top: flatY - 7, left: 0, width: padding.left - 4 }]}
      >
        {projection.start}
      </Text>
      <Text
        style={[styles.yLabel, { top: goalY - 7, left: 0, width: padding.left - 4 }]}
      >
        {projection.goal}
      </Text>
    </>
  );

  // X-axis labels (today + goal date)
  const xLabels = (
    <>
      <Text
        style={[
          styles.xLabel,
          { top: height - padding.bottom + 6, left: padding.left - 12 },
        ]}
      >
        Today
      </Text>
      <Text
        style={[
          styles.xLabel,
          {
            top: height - padding.bottom + 6,
            right: padding.right - 12,
            textAlign: "right",
          },
        ]}
      >
        Goal
      </Text>
    </>
  );

  // End-point marker — punctuates the journey
  const endX = padding.left + (projection.points.length - 1) * xStep;
  const endY = yPos(projection.points[projection.points.length - 1]);
  const endMarker = (
    <View
      style={{
        position: "absolute",
        left: endX - 6,
        top: endY - 6,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: GOAL_GREEN,
      }}
    />
  );

  return (
    <View style={{ width, height }}>
      {goalLine}
      {flatLine}
      {calpalSegments}
      {endMarker}
      {yLabels}
      {xLabels}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG, justifyContent: "space-between" },
  content: { paddingHorizontal: 24, paddingTop: 32, gap: 24 },

  head: { gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: CALPAL, letterSpacing: 1 },
  headline: {
    fontSize: 30,
    fontWeight: "800",
    color: INK,
    letterSpacing: -1,
    lineHeight: 36,
  },
  headlineAccent: { color: CALPAL },

  chartCard: {
    backgroundColor: "#FAFAFB",
    borderRadius: 18,
    padding: 16,
    paddingTop: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  legend: { flexDirection: "row", justifyContent: "center", gap: 18 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: "600", color: INK_MUTED },

  yLabel: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "700",
    color: INK_MUTED,
    textAlign: "right",
  },
  xLabel: { position: "absolute", fontSize: 10, fontWeight: "700", color: INK_MUTED },

  statRow: { flexDirection: "row", gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: "#FAFAFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: INK_MUTED,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },

  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 17,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
});
