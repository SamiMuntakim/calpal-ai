import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useWeightLogs } from "../../hooks/useWeightLogs";
import { useProfile } from "../../hooks/useProfile";
import { analyzeWeightTrends } from "../../services/geminiService";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FAFAFB";
const CARD = "#FFFFFF";
const BORDER = "#F0F2F5";

const ACCENT = {
  scale: { ink: "#3B82F6", tint: "#E8F0FE" },
  goal: { ink: "#22C55E", tint: "#E8F8EE" },
  ai: { ink: "#8B5CF6", tint: "#F1ECFF" },
  loss: { ink: "#22C55E", tint: "#E8F8EE" },
  gain: { ink: "#EF4444", tint: "#FFECEC" },
};

const TIME_RANGES = [
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "180", label: "6 months", days: 180 },
  { key: "all", label: "All time", days: 99999 },
] as const;

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

// ─── Tiny chart component ─────────────────────────────────────────────────────
// Pure RN — no SVG dep. Renders a polyline-like area using thin Views stacked.
// Good enough for an at-a-glance trend without requiring a native rebuild.

function MiniLineChart({
  data,
  goal,
  height = 140,
}: {
  data: { x: number; y: number }[];
  goal?: number;
  height?: number;
}) {
  const width = Dimensions.get("window").width - 64;
  if (data.length < 2) {
    return (
      <View style={[chart.emptyWrap, { height }]}>
        <Text style={chart.emptyText}>Log at least 2 entries to see the trend.</Text>
      </View>
    );
  }

  const ys = data.map((p) => p.y);
  const minY = Math.min(...ys, goal ?? Infinity);
  const maxY = Math.max(...ys, goal ?? -Infinity);
  const range = maxY - minY || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  // Compute coordinates
  const points = data.map((p, i) => ({
    x: i * stepX,
    y: ((maxY - p.y) / range) * (height - 40) + 20,
  }));

  const goalY =
    goal != null ? ((maxY - goal) / range) * (height - 40) + 20 : null;

  // Render thin rectangles between consecutive points (a poor man's line)
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    segments.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: p1.x,
          top: p1.y - 1,
          width: len,
          height: 2.5,
          backgroundColor: INK,
          transformOrigin: "left center",
          transform: [{ rotate: `${angle}deg` }],
          borderRadius: 2,
        }}
      />
    );
  }

  return (
    <View style={[{ width, height }, chart.wrap]}>
      {/* Goal line */}
      {goalY != null && (
        <>
          <View
            style={[
              chart.goalLine,
              { top: goalY - 0.5 },
            ]}
          />
          <View
            style={[
              chart.goalLabel,
              { top: goalY - 9 },
            ]}
          >
            <Text style={chart.goalLabelText}>goal</Text>
          </View>
        </>
      )}

      {/* Segments */}
      {segments}

      {/* Points */}
      {points.map((p, i) => (
        <View
          key={i}
          style={[
            chart.point,
            { left: p.x - 4, top: p.y - 4 },
            i === points.length - 1 && chart.pointLast,
          ]}
        />
      ))}
    </View>
  );
}

const chart = StyleSheet.create({
  wrap: { position: "relative", marginVertical: 8 },
  emptyWrap: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: INK_MUTED, textAlign: "center" },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: ACCENT.goal.ink,
    opacity: 0.35,
  },
  goalLabel: {
    position: "absolute",
    right: 0,
    backgroundColor: ACCENT.goal.tint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  goalLabelText: { fontSize: 9, fontWeight: "800", color: ACCENT.goal.ink, letterSpacing: 0.4 },
  point: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: INK },
  pointLast: { backgroundColor: ACCENT.goal.ink, width: 12, height: 12, borderRadius: 6, top: 0, left: 0 },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { profile } = useProfile();
  const { weightLogs, loading, addEntry, deleteEntry, refetch } = useWeightLogs();

  const [showLogModal, setShowLogModal] = useState(false);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayDate());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [range, setRange] = useState<(typeof TIME_RANGES)[number]["key"]>("90");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    trend: string;
    averageWeeklyChange: number;
    feedback: string;
    recommendedActions: string[];
  } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Deep-link from FAB
  const { action } = useLocalSearchParams<{ action?: string }>();
  useEffect(() => {
    if (action === "weight") {
      setShowLogModal(true);
      router.setParams({ action: undefined });
    }
  }, [action]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter by time range
  const filteredLogs = useMemo(() => {
    const rangeDef = TIME_RANGES.find((r) => r.key === range);
    if (!rangeDef || rangeDef.days >= 99999) return weightLogs;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDef.days);
    const cutoffIso = cutoff.toISOString().split("T")[0];
    return weightLogs.filter((e) => e.date >= cutoffIso);
  }, [weightLogs, range]);

  const handleSave = async () => {
    const w = parseFloat(weight);
    if (!weight || isNaN(w) || w < 10 || w > 500) {
      setModalError("Enter a valid weight in kg.");
      return;
    }
    setSaving(true);
    try {
      await addEntry(w, date);
      setShowLogModal(false);
      setWeight("");
      setDate(todayDate());
      setModalError("");
    } catch {
      setModalError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, w: number, d: string) => {
    Alert.alert("Delete entry", `Remove ${w} kg on ${formatDate(d)}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEntry(id) },
    ]);
  };

  const handleAnalyze = async () => {
    if (weightLogs.length < 2) {
      Alert.alert("Not enough data", "Log at least 2 entries to see trend analysis.");
      return;
    }
    setAnalyzing(true);
    try {
      const data = weightLogs.map((e) => ({
        weight: e.weight,
        date: new Date(e.date + "T00:00:00"),
      }));
      const result = await analyzeWeightTrends(
        data,
        profile?.userStats?.goalWeight ?? 70,
        profile?.userStats?.weeklyGoal ?? "maintain"
      );
      setAnalysis(result);
    } catch {
      Alert.alert("Couldn't analyse", "Try again in a moment.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Stats
  const latest = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const starting = profile?.userStats?.startingWeight;
  const goal = profile?.userStats?.goalWeight;
  const totalChange =
    latest != null && starting != null ? latest.weight - starting : null;
  const remainingToGoal =
    latest != null && goal != null ? goal - latest.weight : null;

  const chartData = filteredLogs.map((e) => ({ x: 0, y: e.weight }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INK} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>

        {/* Paired top cards */}
        <View style={styles.pairedRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: ACCENT.scale.tint }]}>
              <Ionicons name="speedometer" size={18} color={ACCENT.scale.ink} />
            </View>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>
              {latest != null ? `${latest.weight}` : "—"}
              <Text style={styles.statUnit}> kg</Text>
            </Text>
            {totalChange != null && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: totalChange <= 0 ? ACCENT.loss.tint : ACCENT.gain.tint },
                ]}
              >
                <Ionicons
                  name={totalChange < 0 ? "trending-down" : totalChange > 0 ? "trending-up" : "remove"}
                  size={11}
                  color={totalChange <= 0 ? ACCENT.loss.ink : ACCENT.gain.ink}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: totalChange <= 0 ? ACCENT.loss.ink : ACCENT.gain.ink },
                  ]}
                >
                  {totalChange > 0 ? "+" : ""}
                  {totalChange.toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: ACCENT.goal.tint }]}>
              <Ionicons name="flag" size={18} color={ACCENT.goal.ink} />
            </View>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>
              {goal ? `${goal}` : "—"}
              <Text style={styles.statUnit}> kg</Text>
            </Text>
            {remainingToGoal != null && Math.abs(remainingToGoal) > 0.05 && (
              <View style={[styles.chip, { backgroundColor: ACCENT.goal.tint }]}>
                <Text style={[styles.chipText, { color: ACCENT.goal.ink }]}>
                  {Math.abs(remainingToGoal).toFixed(1)} kg to go
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Log weight button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setShowLogModal(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Log weight</Text>
        </TouchableOpacity>

        {/* Time range */}
        <View style={styles.rangeRow}>
          {TIME_RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangePill, range === r.key && styles.rangePillActive]}
              onPress={() => setRange(r.key)}
            >
              <Text
                style={[
                  styles.rangePillText,
                  range === r.key && styles.rangePillTextActive,
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weight trend</Text>
            {latest != null && (
              <View style={styles.cardHeaderChip}>
                <Text style={styles.cardHeaderChipText}>
                  Latest: <Text style={{ color: INK }}>{latest.weight} kg</Text>
                </Text>
              </View>
            )}
          </View>
          <MiniLineChart data={chartData} goal={goal} />
        </View>

        {/* AI Analysis card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardTitleIcon, { backgroundColor: ACCENT.ai.tint }]}>
                <Ionicons name="sparkles" size={14} color={ACCENT.ai.ink} />
              </View>
              <Text style={styles.cardTitle}>AI insight</Text>
            </View>
            <TouchableOpacity
              style={styles.analyzeBtn}
              onPress={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color={INK} />
              ) : (
                <Text style={styles.analyzeBtnText}>{analysis ? "Refresh" : "Analyse"}</Text>
              )}
            </TouchableOpacity>
          </View>

          {analysis ? (
            <View style={{ gap: 12 }}>
              <View style={styles.trendRow}>
                <View
                  style={[
                    styles.trendBadge,
                    {
                      backgroundColor:
                        analysis.trend === "losing"
                          ? ACCENT.loss.tint
                          : analysis.trend === "gaining"
                          ? ACCENT.gain.tint
                          : BG,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      analysis.trend === "losing"
                        ? "trending-down"
                        : analysis.trend === "gaining"
                        ? "trending-up"
                        : "remove"
                    }
                    size={13}
                    color={
                      analysis.trend === "losing"
                        ? ACCENT.loss.ink
                        : analysis.trend === "gaining"
                        ? ACCENT.gain.ink
                        : INK_MUTED
                    }
                  />
                  <Text
                    style={[
                      styles.trendBadgeText,
                      {
                        color:
                          analysis.trend === "losing"
                            ? ACCENT.loss.ink
                            : analysis.trend === "gaining"
                            ? ACCENT.gain.ink
                            : INK_MUTED,
                      },
                    ]}
                  >
                    {analysis.trend.charAt(0).toUpperCase() + analysis.trend.slice(1)}
                  </Text>
                </View>
                <Text style={styles.trendDelta}>
                  {analysis.averageWeeklyChange > 0 ? "+" : ""}
                  {analysis.averageWeeklyChange.toFixed(2)} kg / week
                </Text>
              </View>

              <Text style={styles.feedbackText}>{analysis.feedback}</Text>

              {analysis.recommendedActions.length > 0 && (
                <View style={{ gap: 6, marginTop: 4 }}>
                  {analysis.recommendedActions.map((a, i) => (
                    <View key={i} style={styles.actionRow}>
                      <View style={styles.actionDot}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                      <Text style={styles.actionText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.aiHint}>
              Tap "Analyse" for personalised feedback on your weight trend and what to do next.
            </Text>
          )}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {loading && weightLogs.length === 0 ? (
            <ActivityIndicator color={INK} />
          ) : weightLogs.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptyDesc}>Log your first weight to see history.</Text>
            </View>
          ) : (
            <View style={styles.historyCard}>
              {[...weightLogs].reverse().map((entry, idx, arr) => {
                const prev = arr[idx + 1];
                const diff = prev ? entry.weight - prev.weight : null;
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.historyRow,
                      idx < arr.length - 1 && styles.historyRowBorder,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyWeight}>{entry.weight} kg</Text>
                      <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                    </View>
                    {diff != null && (
                      <View
                        style={[
                          styles.chip,
                          { backgroundColor: diff < 0 ? ACCENT.loss.tint : diff > 0 ? ACCENT.gain.tint : BG },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color:
                                diff < 0
                                  ? ACCENT.loss.ink
                                  : diff > 0
                                  ? ACCENT.gain.ink
                                  : INK_MUTED,
                            },
                          ]}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(1)} kg
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => confirmDelete(entry.id!, entry.weight, entry.date)}
                      hitSlop={10}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={INK_FAINT} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Log weight modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={mod.header}>
            <Text style={mod.headerTitle}>Log weight</Text>
            <TouchableOpacity onPress={() => { setShowLogModal(false); setModalError(""); }} hitSlop={12}>
              <Ionicons name="close" size={22} color={INK_MUTED} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView contentContainerStyle={mod.body}>
              {modalError ? <Text style={mod.error}>{modalError}</Text> : null}

              <View style={mod.field}>
                <Text style={mod.label}>Weight</Text>
                <View style={mod.inputWrap}>
                  <TextInput
                    style={mod.input}
                    value={weight}
                    onChangeText={(t) => { setWeight(t); setModalError(""); }}
                    placeholder="72.5"
                    placeholderTextColor={INK_FAINT}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <Text style={mod.suffix}>kg</Text>
                </View>
              </View>

              <View style={mod.field}>
                <Text style={mod.label}>Date</Text>
                <View style={mod.inputWrap}>
                  <TextInput
                    style={mod.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={INK_FAINT}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={mod.footer}>
              <TouchableOpacity
                style={[mod.primaryBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.9}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={mod.primaryBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  header: { paddingTop: 4, paddingBottom: 4 },
  title: { fontSize: 30, fontWeight: "800", color: INK, letterSpacing: -1 },

  pairedRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.4, textTransform: "uppercase" },
  statValue: { fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.8 },
  statUnit: { fontSize: 14, fontWeight: "600", color: INK_FAINT, letterSpacing: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 2,
  },
  chipText: { fontSize: 11, fontWeight: "800", letterSpacing: -0.2 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  rangeRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: CARD,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  rangePillActive: { backgroundColor: INK },
  rangePillText: { fontSize: 12, fontWeight: "700", color: INK_MUTED },
  rangePillTextActive: { color: "#fff" },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitleIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: INK, letterSpacing: -0.2 },
  cardHeaderChip: {
    backgroundColor: BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardHeaderChipText: { fontSize: 11, fontWeight: "600", color: INK_MUTED },

  analyzeBtn: {
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  analyzeBtnText: { fontSize: 12, fontWeight: "700", color: INK },
  aiHint: { fontSize: 13, color: INK_MUTED, lineHeight: 19 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  trendBadgeText: { fontSize: 12, fontWeight: "800" },
  trendDelta: { fontSize: 12, color: INK_MUTED, fontWeight: "600" },
  feedbackText: { fontSize: 14, color: INK, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  actionDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT.goal.ink,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  actionText: { flex: 1, fontSize: 13, color: INK, lineHeight: 19 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  emptyHistory: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: INK },
  emptyDesc: { fontSize: 13, color: INK_MUTED },

  historyCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  historyWeight: { fontSize: 16, fontWeight: "700", color: INK },
  historyDate: { fontSize: 12, color: INK_MUTED, marginTop: 2 },
});

const mod = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: INK },
  body: { padding: 20, gap: 14 },
  error: {
    backgroundColor: "#FFF0F0",
    color: "#D70015",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.3, textTransform: "uppercase" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: INK,
    fontWeight: "600",
  },
  suffix: { paddingRight: 14, fontSize: 13, fontWeight: "700", color: INK_MUTED },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  primaryBtn: {
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
