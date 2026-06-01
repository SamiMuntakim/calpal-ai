import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

const OPTIONS = [
  {
    key: "slow" as const,
    label: "Steady",
    sub: "0.25 kg / week · easiest to sustain",
    rate: 0.25,
    icon: "leaf" as const,
    colour: "#22C55E",
  },
  {
    key: "moderate" as const,
    label: "Balanced",
    sub: "0.5 kg / week · the sweet spot",
    rate: 0.5,
    icon: "flame" as const,
    colour: "#F59E0B",
    recommended: true,
  },
  {
    key: "fast" as const,
    label: "Aggressive",
    sub: "0.75 kg / week · requires real discipline",
    rate: 0.75,
    icon: "rocket" as const,
    colour: "#EF4444",
  },
];

export default function GoalPaceScreen() {
  const { pending, updateMeta } = useOnboarding();
  const [value, setValue] = useState<"slow" | "moderate" | "fast" | "">(
    pending.meta?.pace ?? ""
  );

  // Estimate how many weeks they'll need at the selected pace
  const weeksEstimate = useMemo(() => {
    const current = pending.userStats?.currentWeight;
    const goal = pending.userStats?.goalWeight;
    if (!current || !goal) return null;
    const opt = OPTIONS.find((o) => o.key === value);
    if (!opt) return null;
    const diff = Math.abs(current - goal);
    return Math.ceil(diff / opt.rate);
  }, [pending.userStats, value]);

  const goalDate = useMemo(() => {
    if (!weeksEstimate) return null;
    const d = new Date();
    d.setDate(d.getDate() + weeksEstimate * 7);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [weeksEstimate]);

  const handleContinue = () => {
    if (!value) return;
    updateMeta({ pace: value });
    router.push("/setup/activity" as any);
  };

  return (
    <QuestionLayout
      step={7}
      total={13}
      title="How fast do you want to move?"
      subtitle="Faster isn't always better. Pick what you'll actually stick to."
      canContinue={!!value}
      onContinue={handleContinue}
    >
      <View style={{ gap: 10 }}>
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[
                styles.card,
                selected && { borderColor: o.colour, backgroundColor: "#fff" },
              ]}
              onPress={() => setValue(o.key)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: selected ? o.colour : `${o.colour}15`,
                  },
                ]}
              >
                <Ionicons
                  name={o.icon}
                  size={18}
                  color={selected ? "#fff" : o.colour}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.label, selected && { color: TOKENS.INK }]}
                  >
                    {o.label}
                  </Text>
                  {o.recommended && (
                    <View style={styles.recBadge}>
                      <Text style={styles.recBadgeText}>RECOMMENDED</Text>
                    </View>
                  )}
                </View>
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

        {/* Live ETA — shows them when they'll hit their goal at this pace */}
        {goalDate && value && (
          <View style={styles.etaCard}>
            <Ionicons name="calendar" size={16} color={TOKENS.INK} />
            <Text style={styles.etaText}>
              You'll reach your goal by{" "}
              <Text style={styles.etaStrong}>{goalDate}</Text> ({weeksEstimate}{" "}
              weeks)
            </Text>
          </View>
        )}
      </View>
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "700", color: TOKENS.INK_MUTED },
  sub: { fontSize: 12, color: TOKENS.INK_MUTED, marginTop: 2 },
  recBadge: {
    backgroundColor: "#FFF6E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.4,
  },
  checkPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  etaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F8FA",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  etaText: { flex: 1, fontSize: 13, color: TOKENS.INK_MUTED },
  etaStrong: { color: TOKENS.INK, fontWeight: "700" },
});
