import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { saveProfile } from "../services/firestoreService";
import { getNutritionRecommendations } from "../services/geminiService";

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
  ai: { ink: "#8B5CF6", tint: "#F1ECFF" },
};

const GENDERS = ["Male", "Female", "Other"] as const;
const WEEKLY_GOALS = [
  { key: "lose", label: "Lose fat", icon: "trending-down", colour: "#22C55E" },
  { key: "maintain", label: "Maintain", icon: "remove", colour: PRIMARY },
  { key: "gain", label: "Build muscle", icon: "trending-up", colour: "#F59E0B" },
] as const;
const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary", desc: "Mostly at a desk" },
  { key: "lightly_active", label: "Lightly active", desc: "1–3 days/week" },
  { key: "moderately_active", label: "Active", desc: "3–5 days/week" },
  { key: "very_active", label: "Very active", desc: "6–7 days/week" },
  { key: "extremely_active", label: "Athlete", desc: "2x/day or physical job" },
] as const;

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // Initialise from current profile — once it loads, we never overwrite the
  // user's in-progress edits unless they hit a re-load explicitly.
  const initial = useMemo(() => {
    const s = profile?.userStats;
    const g = profile?.nutritionGoals;
    return {
      name: profile?.name ?? "",
      age: s?.age ? String(s.age) : "",
      gender: s?.gender ?? "",
      height: s?.height ? String(s.height) : "",
      currentWeight: s?.currentWeight ? String(s.currentWeight) : "",
      goalWeight: s?.goalWeight ? String(s.goalWeight) : "",
      weeklyGoal: s?.weeklyGoal ?? "",
      activityLevel: s?.activityLevel ?? "",
      calories: g?.calories ? String(Math.round(g.calories)) : "",
      protein: g?.protein ? String(Math.round(g.protein)) : "",
      carbs: g?.carbs ? String(Math.round(g.carbs)) : "",
      fats: g?.fats ? String(Math.round(g.fats)) : "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name, profile?.userStats, profile?.nutritionGoals]);

  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const set = (patch: Partial<typeof initial>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (error) setError("");
  };

  const handleRecalculate = async () => {
    const ageNum = parseInt(form.age, 10);
    const heightNum = parseFloat(form.height);
    const weightNum = parseFloat(form.currentWeight);
    if (
      !ageNum ||
      !form.gender ||
      !heightNum ||
      !weightNum ||
      !form.activityLevel ||
      !form.weeklyGoal
    ) {
      setError("Fill in body stats + goal before recalculating.");
      return;
    }
    setError("");
    setRecalculating(true);
    try {
      const userStats = {
        startingWeight: profile?.userStats?.startingWeight ?? weightNum,
        currentWeight: weightNum,
        goalWeight: parseFloat(form.goalWeight) || weightNum,
        weeklyGoal: form.weeklyGoal,
        activityLevel: form.activityLevel,
        height: heightNum,
        age: ageNum,
        gender: form.gender.toLowerCase(),
      };
      const geminiData = {
        age: form.age,
        sex: form.gender.toLowerCase(),
        height: `${form.height} cm`,
        weight: `${form.currentWeight} kg`,
        activityLevel: form.activityLevel.replace(/_/g, " "),
        goal:
          form.weeklyGoal === "lose"
            ? "Lose weight"
            : form.weeklyGoal === "gain"
            ? "Gain weight"
            : "Maintain weight",
      };
      const goals = await getNutritionRecommendations(userStats, geminiData);
      set({
        calories: String(Math.round(goals.calories)),
        protein: String(Math.round(goals.protein)),
        carbs: String(Math.round(goals.carbs)),
        fats: String(Math.round(goals.fats)),
      });
    } catch (err: any) {
      setError(err?.message ?? "Couldn't recalculate. Try again.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const ageNum = parseInt(form.age, 10);
    const heightNum = parseFloat(form.height);
    const weightNum = parseFloat(form.currentWeight);
    const goalWeightNum = parseFloat(form.goalWeight);
    if (!ageNum || ageNum < 10 || ageNum > 120) {
      setError("Age looks off. Please enter a value between 10 and 120.");
      return;
    }
    if (!heightNum || heightNum < 50 || heightNum > 280) {
      setError("Height should be in cm (50–280).");
      return;
    }
    if (!weightNum || weightNum < 20 || weightNum > 500) {
      setError("Weight should be in kg (20–500).");
      return;
    }
    if (!goalWeightNum || goalWeightNum < 20 || goalWeightNum > 500) {
      setError("Goal weight should be in kg (20–500).");
      return;
    }
    if (!form.gender || !form.weeklyGoal || !form.activityLevel) {
      setError("Sex, goal type, and activity level are required.");
      return;
    }
    const calNum = parseFloat(form.calories);
    const proNum = parseFloat(form.protein);
    const carbNum = parseFloat(form.carbs);
    const fatNum = parseFloat(form.fats);
    if (!calNum || calNum < 500 || calNum > 10000) {
      setError("Calorie target should be 500–10000.");
      return;
    }
    if (proNum < 0 || carbNum < 0 || fatNum < 0) {
      setError("Macros must be 0 or positive.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await saveProfile(user.id, {
        name: trimmedName,
        userStats: {
          startingWeight: profile?.userStats?.startingWeight ?? weightNum,
          currentWeight: weightNum,
          goalWeight: goalWeightNum,
          weeklyGoal: form.weeklyGoal,
          activityLevel: form.activityLevel,
          height: heightNum,
          age: ageNum,
          gender: form.gender.toLowerCase(),
        },
        nutritionGoals: {
          calories: calNum,
          protein: proNum,
          carbs: carbNum,
          fats: fatNum,
        },
      });
      router.back();
    } catch (err: any) {
      console.error("Save profile failed:", err);
      setError(err?.message ?? "Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={INK} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Personal */}
          <Section title="Personal">
            <Field
              label="Name"
              value={form.name}
              onChangeText={(t) => set({ name: t })}
              placeholder="Your name"
              autoCapitalize="words"
            />
          </Section>

          {/* Body */}
          <Section title="Body stats">
            <View style={styles.row2}>
              <Field
                label="Age"
                value={form.age}
                onChangeText={(t) => set({ age: t })}
                placeholder="25"
                keyboardType="number-pad"
                suffix="yrs"
                flex
              />
              <Field
                label="Height"
                value={form.height}
                onChangeText={(t) => set({ height: t })}
                placeholder="175"
                keyboardType="decimal-pad"
                suffix="cm"
                flex
              />
            </View>
            <Field
              label="Current weight"
              value={form.currentWeight}
              onChangeText={(t) => set({ currentWeight: t })}
              placeholder="75"
              keyboardType="decimal-pad"
              suffix="kg"
            />
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Sex</Text>
              <View style={styles.pills}>
                {GENDERS.map((g) => {
                  const selected = form.gender.toLowerCase() === g.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pill, selected && styles.pillActive]}
                      onPress={() => set({ gender: g })}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Section>

          {/* Goal */}
          <Section title="Goal">
            <Field
              label="Target weight"
              value={form.goalWeight}
              onChangeText={(t) => set({ goalWeight: t })}
              placeholder="70"
              keyboardType="decimal-pad"
              suffix="kg"
            />
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Goal type</Text>
              <View style={styles.goalRow}>
                {WEEKLY_GOALS.map((g) => {
                  const selected = form.weeklyGoal === g.key;
                  return (
                    <TouchableOpacity
                      key={g.key}
                      style={[
                        styles.goalCard,
                        selected && styles.goalCardActive,
                      ]}
                      onPress={() => set({ weeklyGoal: g.key })}
                    >
                      <View
                        style={[
                          styles.goalIcon,
                          { backgroundColor: selected ? g.colour : BG },
                        ]}
                      >
                        <Ionicons
                          name={g.icon as any}
                          size={16}
                          color={selected ? "#fff" : g.colour}
                        />
                      </View>
                      <Text
                        style={[styles.goalLabel, selected && styles.goalLabelActive]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Activity level</Text>
              <View style={{ gap: 6 }}>
                {ACTIVITY_LEVELS.map((a) => {
                  const selected = form.activityLevel === a.key;
                  return (
                    <TouchableOpacity
                      key={a.key}
                      style={[styles.actRow, selected && styles.actRowActive]}
                      onPress={() => set({ activityLevel: a.key })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.actLabel, selected && styles.actLabelActive]}>
                          {a.label}
                        </Text>
                        <Text style={styles.actDesc}>{a.desc}</Text>
                      </View>
                      <View
                        style={[
                          styles.actRadio,
                          selected && styles.actRadioActive,
                        ]}
                      >
                        {selected && <View style={styles.actRadioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Section>

          {/* Daily targets */}
          <Section
            title="Daily targets"
            right={
              <TouchableOpacity
                style={styles.recalcBtn}
                onPress={handleRecalculate}
                disabled={recalculating}
              >
                {recalculating ? (
                  <ActivityIndicator size="small" color={ACCENT.ai.ink} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={12} color={ACCENT.ai.ink} />
                    <Text style={styles.recalcText}>Recalculate</Text>
                  </>
                )}
              </TouchableOpacity>
            }
          >
            <Field
              label="Calories"
              value={form.calories}
              onChangeText={(t) => set({ calories: t })}
              placeholder="2000"
              keyboardType="number-pad"
              suffix="kcal"
              accent={ACCENT.cal}
            />
            <View style={styles.row2}>
              <Field
                label="Protein"
                value={form.protein}
                onChangeText={(t) => set({ protein: t })}
                placeholder="150"
                keyboardType="decimal-pad"
                suffix="g"
                accent={ACCENT.protein}
                flex
              />
              <Field
                label="Carbs"
                value={form.carbs}
                onChangeText={(t) => set({ carbs: t })}
                placeholder="200"
                keyboardType="decimal-pad"
                suffix="g"
                accent={ACCENT.carbs}
                flex
              />
              <Field
                label="Fats"
                value={form.fats}
                onChangeText={(t) => set({ fats: t })}
                placeholder="65"
                keyboardType="decimal-pad"
                suffix="g"
                accent={ACCENT.fats}
                flex
              />
            </View>
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  suffix,
  accent,
  flex,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  suffix?: string;
  accent?: { ink: string; tint: string };
  flex?: boolean;
  autoCapitalize?: any;
}) {
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={INK_FAINT}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
        />
        {suffix && (
          <Text style={[styles.suffix, accent && { color: accent.ink }]}>{suffix}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  saveBtn: {
    backgroundColor: INK,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  content: { padding: 16, gap: 18 },
  error: {
    backgroundColor: "#FFF0F0",
    color: "#D70015",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },

  section: { gap: 8 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: INK_MUTED,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: INK_MUTED },
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
    paddingVertical: 12,
    fontSize: 16,
    color: INK,
    fontWeight: "600",
  },
  suffix: { paddingRight: 14, fontSize: 12, fontWeight: "700", color: INK_MUTED },
  row2: { flexDirection: "row", gap: 10 },

  pills: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  pillActive: { backgroundColor: INK, borderColor: INK },
  pillText: { fontSize: 13, fontWeight: "700", color: INK_MUTED },
  pillTextActive: { color: "#fff" },

  goalRow: { flexDirection: "row", gap: 8 },
  goalCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 6,
    backgroundColor: BG,
  },
  goalCardActive: { borderColor: INK, backgroundColor: "#fff" },
  goalIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  goalLabel: { fontSize: 11, fontWeight: "700", color: INK_MUTED, textAlign: "center" },
  goalLabelActive: { color: INK },

  actRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: BG,
  },
  actRowActive: { borderColor: INK, backgroundColor: "#fff" },
  actLabel: { fontSize: 14, fontWeight: "700", color: INK_MUTED },
  actLabelActive: { color: INK },
  actDesc: { fontSize: 12, color: INK_MUTED, marginTop: 1 },
  actRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  actRadioActive: { borderColor: INK },
  actRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: INK },

  recalcBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ACCENT.ai.tint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  recalcText: { fontSize: 11, fontWeight: "800", color: ACCENT.ai.ink, letterSpacing: 0.2 },
});
