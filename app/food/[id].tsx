import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  FoodEntry,
  getFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
} from "../../services/firestoreService";

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
};

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Local editable form state — only consulted while editing
  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Load the entry once on mount
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const e = await getFoodEntry(id);
        if (cancelled) return;
        if (!e) {
          Alert.alert("Not found", "This meal couldn't be loaded.");
          router.back();
          return;
        }
        setEntry(e);
        setTitle(e.title);
        setCalories(String(Math.round(e.calories)));
        setProtein(String(Math.round(e.protein)));
        setCarbs(String(Math.round(e.carbs)));
        setFats(String(Math.round(e.fats)));
      } catch (err) {
        console.error("Load food entry failed:", err);
        Alert.alert("Error", "Couldn't load this meal.");
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!entry?.id) return;
    if (!title.trim()) {
      setError("Meal name is required.");
      return;
    }
    const cal = parseFloat(calories);
    const prot = parseFloat(protein);
    const carb = parseFloat(carbs);
    const fat = parseFloat(fats);
    if (isNaN(cal) || cal < 0) { setError("Calories must be 0 or positive."); return; }
    if (isNaN(prot) || prot < 0) { setError("Protein must be 0 or positive."); return; }
    if (isNaN(carb) || carb < 0) { setError("Carbs must be 0 or positive."); return; }
    if (isNaN(fat) || fat < 0) { setError("Fats must be 0 or positive."); return; }

    setError("");
    setSaving(true);
    try {
      await updateFoodEntry(entry.id, {
        title: title.trim(),
        calories: cal,
        protein: prot,
        carbs: carb,
        fats: fat,
      });
      // Optimistically update local state so the View mode reflects the new values
      setEntry({ ...entry, title: title.trim(), calories: cal, protein: prot, carbs: carb, fats: fat });
      setEditing(false);
    } catch (err: any) {
      console.error("Update food entry failed:", err);
      setError(err?.message ?? "Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!entry?.id) return;
    Alert.alert("Delete meal", `Remove "${entry.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteFoodEntry(entry.id!);
            router.back();
          } catch (err: any) {
            console.error("Delete failed:", err);
            Alert.alert("Error", err?.message ?? "Couldn't delete. Try again.");
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleCancelEdit = () => {
    if (!entry) return;
    // Reset the form back to the entry's current values
    setTitle(entry.title);
    setCalories(String(Math.round(entry.calories)));
    setProtein(String(Math.round(entry.protein)));
    setCarbs(String(Math.round(entry.carbs)));
    setFats(String(Math.round(entry.fats)));
    setError("");
    setEditing(false);
  };

  if (loading || !entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={INK} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal</Text>
        <View style={styles.headerActions}>
          {editing ? (
            <>
              <TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
                <Text style={styles.headerCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerSaveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.headerSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.headerEditBtn}
              onPress={() => setEditing(true)}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={16} color={INK} />
              <Text style={styles.headerEditText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo banner */}
          {entry.photoBase64 ? (
            <View style={styles.photoBanner}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${entry.photoBase64}` }}
                style={styles.photoBannerImage}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={[styles.photoBanner, styles.photoPlaceholder]}>
              <Ionicons name="restaurant" size={42} color={ACCENT.cal.ink} />
              <Text style={styles.photoPlaceholderText}>No photo on this meal</Text>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Title + time */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              {editing ? (
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Meal name"
                  placeholderTextColor={INK_FAINT}
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.title}>{entry.title}</Text>
              )}
            </View>
            {entry.createdAt && !editing && (
              <View style={styles.timeChip}>
                <Ionicons name="time" size={11} color={INK_MUTED} />
                <Text style={styles.timeChipText}>{formatTime(entry.createdAt)}</Text>
              </View>
            )}
          </View>

          {/* Calorie hero card */}
          <View style={[styles.calorieCard, { backgroundColor: ACCENT.cal.tint }]}>
            <View style={[styles.calorieIcon, { backgroundColor: "#fff" }]}>
              <Ionicons name="flame" size={26} color={ACCENT.cal.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.calorieLabel}>CALORIES</Text>
              {editing ? (
                <View style={styles.editFieldInline}>
                  <TextInput
                    style={[styles.calorieBig, { color: ACCENT.cal.ink }]}
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={INK_FAINT}
                  />
                  <Text style={styles.calorieUnit}>kcal</Text>
                </View>
              ) : (
                <Text style={[styles.calorieBig, { color: ACCENT.cal.ink }]}>
                  {Math.round(entry.calories).toLocaleString()}
                  <Text style={styles.calorieUnit}> kcal</Text>
                </Text>
              )}
            </View>
          </View>

          {/* Macros row */}
          <View style={styles.macrosRow}>
            <MacroCard
              label="Protein"
              value={protein}
              displayValue={entry.protein}
              tint={ACCENT.protein.tint}
              ink={ACCENT.protein.ink}
              editing={editing}
              onChangeText={setProtein}
            />
            <MacroCard
              label="Carbs"
              value={carbs}
              displayValue={entry.carbs}
              tint={ACCENT.carbs.tint}
              ink={ACCENT.carbs.ink}
              editing={editing}
              onChangeText={setCarbs}
            />
            <MacroCard
              label="Fats"
              value={fats}
              displayValue={entry.fats}
              tint={ACCENT.fats.tint}
              ink={ACCENT.fats.ink}
              editing={editing}
              onChangeText={setFats}
            />
          </View>

          {/* AI items chips */}
          {entry.items && entry.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>AI-DETECTED ITEMS</Text>
              <View style={styles.chipsCard}>
                {entry.items.map((item, i) => (
                  <View key={`${item}-${i}`} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Delete (only when not editing — Save/Cancel live in the header during edit) */}
          {!editing && (
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteBtnText}>
                {deleting ? "Deleting…" : "Delete meal"}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            Estimates from AI photo analysis are approximate. Tap Edit to adjust
            any value. Not intended as medical advice.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroCard({
  label,
  value,
  displayValue,
  tint,
  ink,
  editing,
  onChangeText,
}: {
  label: string;
  value: string;
  displayValue: number;
  tint: string;
  ink: string;
  editing: boolean;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={[macro.card, { backgroundColor: tint }]}>
      <Text style={macro.label}>{label}</Text>
      {editing ? (
        <View style={macro.editWrap}>
          <TextInput
            style={[macro.value, { color: ink }]}
            value={value}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={INK_FAINT}
          />
          <Text style={[macro.unit, { color: ink }]}>g</Text>
        </View>
      ) : (
        <Text style={[macro.value, { color: ink }]}>
          {Math.round(displayValue)}
          <Text style={macro.unit}>g</Text>
        </Text>
      )}
    </View>
  );
}

const macro = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: INK_MUTED,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    minWidth: 40,
  },
  unit: { fontSize: 13, fontWeight: "700", color: INK_MUTED, letterSpacing: 0 },
  editWrap: { flexDirection: "row", alignItems: "baseline", gap: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  headerEditText: { fontSize: 13, fontWeight: "700", color: INK },
  headerCancel: { fontSize: 14, fontWeight: "600", color: INK_MUTED },
  headerSaveBtn: {
    backgroundColor: INK,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    minWidth: 56,
    alignItems: "center",
  },
  headerSaveText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  content: { padding: 16, gap: 16 },

  photoBanner: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: ACCENT.cal.tint,
  },
  photoBannerImage: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  photoPlaceholder: {
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoPlaceholderText: { fontSize: 13, color: INK_MUTED, fontWeight: "600" },

  error: {
    backgroundColor: "#FFF0F0",
    color: "#D70015",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.8 },
  titleInput: {
    fontSize: 22,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timeChipText: { fontSize: 11, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.2 },

  calorieCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 16,
  },
  calorieIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  calorieLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: INK_MUTED,
    letterSpacing: 0.5,
  },
  calorieBig: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 2 },
  calorieUnit: { fontSize: 14, fontWeight: "600", color: INK_MUTED, letterSpacing: 0 },
  editFieldInline: { flexDirection: "row", alignItems: "baseline", gap: 4 },

  macrosRow: { flexDirection: "row", gap: 10 },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: INK_MUTED,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  chipsCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: BG,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: INK },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFECEC",
    marginTop: 4,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },

  disclaimer: {
    fontSize: 11,
    color: INK_FAINT,
    lineHeight: 15,
    textAlign: "center",
    paddingHorizontal: 12,
    marginTop: 16,
  },
});
