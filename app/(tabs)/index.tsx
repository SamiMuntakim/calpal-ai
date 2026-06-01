import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
  Modal,
  Platform,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "../../hooks/useProfile";
import { useFoodLogs } from "../../hooks/useFoodLogs";
import { useExerciseLogs } from "../../hooks/useExerciseLogs";
import { useStreak } from "../../hooks/useStreak";

// ─── Design tokens ───────────────────────────────────────────────────────────

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FAFAFB";
const CARD = "#FFFFFF";
const BORDER = "#F0F2F5";
const PRIMARY = "#0a7ea4";

const ACCENT = {
  cal: { ink: "#F59E0B", tint: "#FFF6E6" },
  protein: { ink: "#FF6B6B", tint: "#FFEEF0" },
  carbs: { ink: "#22C55E", tint: "#E8F8EE" },
  fats: { ink: "#3B82F6", tint: "#E8F0FE" },
  burn: { ink: "#EF4444", tint: "#FFECEC" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function isoFromDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function buildWeek(selected: string): Array<{ iso: string; day: string; date: number; isToday: boolean; isSelected: boolean }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoFromDate(today);
  // Anchor on the Sunday before today
  const dow = today.getDay(); // 0 = Sun
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dow);

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const iso = isoFromDate(d);
    return {
      iso,
      day: ["S", "M", "T", "W", "T", "F", "S"][i],
      date: d.getDate(),
      isToday: iso === todayIso,
      isSelected: iso === selected,
    };
  });
}

// ─── Components ──────────────────────────────────────────────────────────────

function DayPill({
  day,
  date,
  isToday,
  isSelected,
  onPress,
  isFuture,
}: {
  day: string;
  date: number;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
  isFuture: boolean;
}) {
  return (
    <TouchableOpacity
      style={dayStyles.wrap}
      onPress={onPress}
      disabled={isFuture}
      activeOpacity={0.7}
    >
      <Text
        style={[
          dayStyles.day,
          isSelected && dayStyles.dayActive,
          isFuture && dayStyles.dim,
        ]}
      >
        {day}
      </Text>
      <View
        style={[
          dayStyles.dateWrap,
          isSelected && dayStyles.dateWrapActive,
          isToday && !isSelected && dayStyles.dateWrapToday,
        ]}
      >
        <Text
          style={[
            dayStyles.date,
            isSelected && dayStyles.dateActive,
            isFuture && dayStyles.dim,
          ]}
        >
          {date}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const dayStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 6, width: 44 },
  day: { fontSize: 11, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.4 },
  dayActive: { color: INK },
  dateWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateWrapActive: { backgroundColor: PRIMARY },
  dateWrapToday: { borderWidth: 1.5, borderColor: PRIMARY },
  date: { fontSize: 15, fontWeight: "700", color: INK },
  dateActive: { color: "#fff" },
  dim: { color: INK_FAINT },
});

function HeroCalorieCard({
  eaten,
  goal,
  burned,
}: {
  eaten: number;
  goal: number;
  burned: number;
}) {
  const remaining = goal - (eaten - burned);
  const pct = goal > 0 ? Math.min((eaten - burned) / goal, 1) : 0;
  const isOver = remaining < 0;

  return (
    <View style={hero.card}>
      <View style={hero.head}>
        <View style={hero.eyebrowRow}>
          <View style={[hero.eyebrowDot, { backgroundColor: ACCENT.cal.ink }]} />
          <Text style={hero.eyebrow}>CALORIES</Text>
        </View>
        <Text style={hero.metaSmall}>{Math.round(goal)} kcal goal</Text>
      </View>

      <View style={hero.numberRow}>
        <Text style={hero.bigNumber}>{Math.round(eaten).toLocaleString()}</Text>
        <Text style={hero.unit}>eaten</Text>
      </View>

      <View style={hero.barTrack}>
        <View
          style={[
            hero.barFill,
            { width: `${pct * 100}%`, backgroundColor: isOver ? "#EF4444" : ACCENT.cal.ink },
          ]}
        />
      </View>

      <View style={hero.footRow}>
        <View style={hero.footChip}>
          <Ionicons
            name={isOver ? "warning" : "checkmark-circle"}
            size={13}
            color={isOver ? "#EF4444" : "#22C55E"}
          />
          <Text style={[hero.footChipText, isOver && { color: "#EF4444" }]}>
            {isOver
              ? `${Math.abs(Math.round(remaining))} kcal over`
              : `${Math.round(remaining)} kcal left`}
          </Text>
        </View>
        {burned > 0 && (
          <View style={hero.footChip}>
            <Ionicons name="flame" size={13} color={ACCENT.burn.ink} />
            <Text style={[hero.footChipText, { color: ACCENT.burn.ink }]}>
              {Math.round(burned)} kcal burned
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: INK_MUTED, letterSpacing: 1 },
  metaSmall: { fontSize: 12, fontWeight: "600", color: INK_MUTED },
  numberRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  bigNumber: { fontSize: 56, fontWeight: "800", color: INK, letterSpacing: -2, lineHeight: 60 },
  unit: { fontSize: 15, fontWeight: "600", color: INK_MUTED },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: BORDER, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  footRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  footChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  footChipText: { fontSize: 12, fontWeight: "700", color: INK },
});

function MacroCard({
  label,
  eaten,
  goal,
  tint,
  ink,
}: {
  label: string;
  eaten: number;
  goal: number;
  tint: string;
  ink: string;
}) {
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  return (
    <View style={[macro.card, { backgroundColor: tint }]}>
      <View style={[macro.iconWrap, { backgroundColor: "#fff" }]}>
        <View style={[macro.iconDot, { backgroundColor: ink }]} />
      </View>
      <Text style={macro.label}>{label}</Text>
      <Text style={[macro.value, { color: ink }]}>
        {Math.round(eaten)}
        <Text style={macro.goal}> / {Math.round(goal)}g</Text>
      </Text>
      <View style={[macro.barTrack, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
        <View style={[macro.barFill, { width: `${pct * 100}%`, backgroundColor: ink }]} />
      </View>
    </View>
  );
}

const macro = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconDot: { width: 12, height: 12, borderRadius: 6 },
  label: { fontSize: 11, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.4, textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "800", color: INK, letterSpacing: -0.4 },
  goal: { fontSize: 12, fontWeight: "600", color: INK_FAINT, letterSpacing: 0 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: BORDER, overflow: "hidden", marginTop: 4 },
  barFill: { height: "100%", borderRadius: 3 },
});

function LogRowFood({
  id,
  title,
  meta,
  cal,
  protein,
  carbs,
  fats,
  time,
  photoBase64,
}: {
  id: string;
  title: string;
  meta?: string;
  cal: number;
  protein: number;
  carbs: number;
  fats: number;
  time?: string;
  photoBase64?: string;
}) {
  return (
    <TouchableOpacity
      style={logRow.row}
      activeOpacity={0.7}
      onPress={() => router.push(`/food/${id}` as any)}
    >
      {photoBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
          style={logRow.photoThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[logRow.thumb, { backgroundColor: ACCENT.cal.tint }]}>
          <Ionicons name="restaurant" size={20} color={ACCENT.cal.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={logRow.titleRow}>
          <Text style={logRow.title} numberOfLines={1}>
            {title}
          </Text>
          {time && <Text style={logRow.time}>{time}</Text>}
        </View>
        <View style={logRow.macroRow}>
          <View style={logRow.calChip}>
            <Ionicons name="flame" size={11} color={ACCENT.cal.ink} />
            <Text style={logRow.calText}>{Math.round(cal)}</Text>
          </View>
          <Text style={logRow.macroText}>
            <Text style={{ color: ACCENT.protein.ink, fontWeight: "700" }}>{Math.round(protein)}g</Text>
            <Text style={{ color: INK_FAINT }}> · </Text>
            <Text style={{ color: ACCENT.carbs.ink, fontWeight: "700" }}>{Math.round(carbs)}g</Text>
            <Text style={{ color: INK_FAINT }}> · </Text>
            <Text style={{ color: ACCENT.fats.ink, fontWeight: "700" }}>{Math.round(fats)}g</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LogRowExercise({
  title,
  duration,
  intensity,
  burned,
  time,
}: {
  title: string;
  duration: number;
  intensity: string;
  burned: number;
  time?: string;
}) {
  return (
    <View style={logRow.row}>
      <View style={[logRow.thumb, { backgroundColor: ACCENT.burn.tint }]}>
        <Ionicons name="barbell" size={20} color={ACCENT.burn.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={logRow.titleRow}>
          <Text style={logRow.title} numberOfLines={1}>
            {title}
          </Text>
          {time && <Text style={logRow.time}>{time}</Text>}
        </View>
        <View style={logRow.macroRow}>
          <View style={logRow.calChip}>
            <Ionicons name="flame" size={11} color={ACCENT.burn.ink} />
            <Text style={[logRow.calText, { color: ACCENT.burn.ink }]}>
              −{Math.round(burned)}
            </Text>
          </View>
          <Text style={logRow.macroText}>
            <Text style={{ color: INK_MUTED }}>{duration} min · {intensity}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const logRow = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: BG,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: INK, flex: 1 },
  time: { fontSize: 11, fontWeight: "600", color: INK_FAINT },
  macroRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  calChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BG,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  calText: { fontSize: 11, fontWeight: "800", color: ACCENT.cal.ink, letterSpacing: -0.2 },
  macroText: { fontSize: 12, fontWeight: "600" },
});

// ─── Quick-add menu ──────────────────────────────────────────────────────────

function QuickAddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const options = [
    { label: "Snap a meal", desc: "AI nutrition from a photo", icon: "camera", tint: ACCENT.cal.tint, ink: ACCENT.cal.ink, route: "/(tabs)/log?action=photo" },
    { label: "Add meal manually", desc: "Type in the macros", icon: "create", tint: ACCENT.protein.tint, ink: ACCENT.protein.ink, route: "/(tabs)/log?action=meal" },
    { label: "Log exercise", desc: "AI calorie estimate", icon: "barbell", tint: ACCENT.burn.tint, ink: ACCENT.burn.ink, route: "/(tabs)/log?action=exercise" },
    { label: "Log weight", desc: "Track your progress", icon: "scale", tint: ACCENT.fats.tint, ink: ACCENT.fats.ink, route: "/(tabs)/progress?action=weight" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={sheet.card}>
          <View style={sheet.grabber} />
          <Text style={sheet.title}>Quick add</Text>
          <View style={{ gap: 10 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[sheet.row, { backgroundColor: opt.tint }]}
                onPress={() => {
                  onClose();
                  router.push(opt.route as any);
                }}
                activeOpacity={0.85}
              >
                <View style={[sheet.iconWrap, { backgroundColor: "#fff" }]}>
                  <Ionicons name={opt.icon as any} size={20} color={opt.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sheet.rowTitle, { color: opt.ink }]}>{opt.label}</Text>
                  <Text style={sheet.rowDesc}>{opt.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={opt.ink} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,15,20,0.45)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 14,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E0E3E8", alignSelf: "center" },
  title: { fontSize: 20, fontWeight: "800", color: INK, letterSpacing: -0.4, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BG,
    borderRadius: 16,
    padding: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: INK },
  rowDesc: { fontSize: 12, fontWeight: "500", color: INK_MUTED, marginTop: 1 },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const { profile } = useProfile();
  const { foodLogs, totals, refetch: refetchFood } = useFoodLogs(selectedDate);
  const { exerciseLogs, totalCaloriesBurned, refetch: refetchEx } =
    useExerciseLogs(selectedDate);
  // Recompute streak whenever today's food count changes
  const { streak, refetch: refetchStreak } = useStreak(foodLogs.length);
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const goals = profile?.nutritionGoals ?? { calories: 2000, protein: 150, carbs: 200, fats: 65 };
  const week = useMemo(() => buildWeek(selectedDate), [selectedDate]);
  const todayIso = todayDate();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFood(), refetchEx(), refetchStreak()]);
    setRefreshing(false);
  }, [refetchFood, refetchEx, refetchStreak]);

  // Refetch when the dashboard regains focus — catches edits made on the
  // food detail screen so totals & rows reflect the new values.
  useFocusEffect(
    useCallback(() => {
      refetchFood();
      refetchEx();
      refetchStreak();
    }, [refetchFood, refetchEx, refetchStreak])
  );

  // Merge food + exercise into one chronological feed for display
  const recent = useMemo(() => {
    type Item = {
      kind: "food" | "exercise";
      id: string;
      ts: number;
      data: any;
    };
    const items: Item[] = [
      ...foodLogs.map((e) => ({ kind: "food" as const, id: e.id ?? Math.random().toString(), ts: e.createdAt ?? 0, data: e })),
      ...exerciseLogs.map((e) => ({ kind: "exercise" as const, id: e.id ?? Math.random().toString(), ts: e.createdAt ?? 0, data: e })),
    ];
    items.sort((a, b) => b.ts - a.ts);
    return items.slice(0, 8);
  }, [foodLogs, exerciseLogs]);

  const name = profile?.name ?? "";

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          {name ? <Text style={styles.name}>{name}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.headerPill}
          onPress={() => router.push("/(tabs)/progress" as any)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="flame"
            size={14}
            color={streak > 0 ? ACCENT.burn.ink : INK_FAINT}
          />
          <Text
            style={[
              styles.headerPillText,
              streak === 0 && { color: INK_FAINT },
            ]}
          >
            {streak} day{streak === 1 ? "" : "s"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INK} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Day picker */}
        <View style={styles.dayPicker}>
          {week.map((w) => (
            <DayPill
              key={w.iso}
              day={w.day}
              date={w.date}
              isToday={w.isToday}
              isSelected={w.isSelected}
              isFuture={w.iso > todayIso}
              onPress={() => setSelectedDate(w.iso)}
            />
          ))}
        </View>

        {/* Hero calorie card */}
        <HeroCalorieCard
          eaten={totals.calories}
          goal={goals.calories}
          burned={totalCaloriesBurned}
        />

        {/* Macros — 3 cards */}
        <View style={styles.macros}>
          <MacroCard
            label="Protein"
            eaten={totals.protein}
            goal={goals.protein}
            tint={ACCENT.protein.tint}
            ink={ACCENT.protein.ink}
          />
          <MacroCard
            label="Carbs"
            eaten={totals.carbs}
            goal={goals.carbs}
            tint={ACCENT.carbs.tint}
            ink={ACCENT.carbs.ink}
          />
          <MacroCard
            label="Fats"
            eaten={totals.fats}
            goal={goals.fats}
            tint={ACCENT.fats.tint}
            ink={ACCENT.fats.ink}
          />
        </View>

        {/* Recently logged */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently logged</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/log" as any)}>
              <Text style={styles.sectionLink}>See diary →</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => setShowQuickAdd(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.emptyIcon, { backgroundColor: ACCENT.cal.tint }]}>
                <Ionicons name="add" size={22} color={ACCENT.cal.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>Log something to get started</Text>
                <Text style={styles.emptyDesc}>
                  Snap a meal, add manually, or log exercise
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={INK_FAINT} />
            </TouchableOpacity>
          ) : (
            <View style={styles.feedCard}>
              {recent.map((item, idx) => (
                <View key={item.id}>
                  {item.kind === "food" ? (
                    <LogRowFood
                      id={item.data.id}
                      title={item.data.title}
                      cal={item.data.calories}
                      protein={item.data.protein}
                      carbs={item.data.carbs}
                      fats={item.data.fats}
                      photoBase64={item.data.photoBase64}
                      time={formatTime(item.data.createdAt)}
                    />
                  ) : (
                    <LogRowExercise
                      title={item.data.title}
                      duration={item.data.duration}
                      intensity={item.data.intensity}
                      burned={item.data.caloriesBurned}
                      time={formatTime(item.data.createdAt)}
                    />
                  )}
                  {idx < recent.length - 1 && <View style={styles.feedDivider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Compliance disclaimer — AI estimates are educational, not medical */}
        <Text style={styles.disclaimer}>
          AI estimates are approximate and not medical advice. For health
          decisions, consult a qualified professional.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowQuickAdd(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <QuickAddSheet visible={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  greeting: { fontSize: 13, fontWeight: "600", color: INK_MUTED },
  name: { fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.8, marginTop: 2 },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerPillText: { fontSize: 13, fontWeight: "800", color: INK },

  dayPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },

  macros: { flexDirection: "row", gap: 10 },

  section: { gap: 10, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontWeight: "700", color: INK_MUTED },

  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: INK },
  emptyDesc: { fontSize: 12, color: INK_MUTED, marginTop: 2 },

  feedCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  feedDivider: { height: 1, backgroundColor: BORDER, marginLeft: 64 },
  disclaimer: {
    fontSize: 11,
    color: INK_FAINT,
    lineHeight: 15,
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 8,
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 100 : 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: INK,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
});
