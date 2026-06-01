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
  Image,
} from "react-native";
import { useState, useCallback, useEffect, useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useFoodLogs } from "../../hooks/useFoodLogs";
import { useExerciseLogs } from "../../hooks/useExerciseLogs";
import { useProfile } from "../../hooks/useProfile";
import { analyzeFoodImage, analyzeExercise } from "../../services/geminiService";
import { maybeRequestAppReview } from "../../services/reviewPrompt";

// ─── Design tokens (mirror dashboard) ────────────────────────────────────────

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FAFAFB";
const CARD = "#FFFFFF";
const BORDER = "#F0F2F5";

const ACCENT = {
  cal: { ink: "#F59E0B", tint: "#FFF6E6" },
  protein: { ink: "#FF6B6B", tint: "#FFEEF0" },
  carbs: { ink: "#22C55E", tint: "#E8F8EE" },
  fats: { ink: "#3B82F6", tint: "#E8F0FE" },
  burn: { ink: "#EF4444", tint: "#FFECEC" },
};

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" });
}

// ─── Food Modal ──────────────────────────────────────────────────────────────

function FoodModal({
  visible,
  initialMode,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialMode?: "choose" | "manual" | "photo";
  onClose: () => void;
  onSave: (entry: {
    title: string;
    items: string[];
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    photoBase64?: string;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<"choose" | "analyzing" | "review" | "manual">("choose");
  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Apply initialMode when the modal opens
  useEffect(() => {
    if (!visible) return;
    if (initialMode === "manual") setStep("manual");
    else if (initialMode === "photo") {
      // We'll trigger camera right away
      handleCamera();
    } else setStep("choose");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialMode]);

  const reset = () => {
    setStep("choose");
    setTitle("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
    setItems([]);
    setPhotoBase64("");
    setError("");
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const analyseImage = async (base64: string) => {
    setStep("analyzing");
    setError("");
    try {
      const result = await analyzeFoodImage(base64);
      setTitle(result.title);
      setCalories(String(Math.round(result.calories)));
      setProtein(String(Math.round(result.protein)));
      setCarbs(String(Math.round(result.carbs)));
      setFats(String(Math.round(result.fats)));
      setItems(result.items);
      setStep("review");
    } catch {
      setError("Couldn't analyse the image. Enter manually below.");
      setStep("manual");
    }
  };

  /**
   * Take whatever the picker returned (potentially a 3000×3000 iPhone photo)
   * and re-encode it at a fixed 800px width @ JPEG quality 0.6. The resulting
   * base64 is ~50–110KB regardless of source — comfortably inside Firestore's
   * 1 MB document limit. Without this step, default iPhone photos blow past
   * the limit and `setDoc` rejects with "Save failed".
   */
  const downscaleToBase64 = async (uri: string): Promise<string> => {
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return out.base64 ?? "";
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access", "We need camera permission to scan meals.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 1, // capture full quality; we'll re-encode below
      base64: false,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) {
      if (initialMode === "photo") setStep("choose");
      return;
    }
    try {
      const b64 = await downscaleToBase64(result.assets[0].uri);
      setPhotoBase64(b64);
      await analyseImage(b64);
    } catch (err) {
      console.error("Photo processing failed:", err);
      setError("Couldn't process the photo. Try again.");
      setStep("choose");
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photo library", "We need photo permission.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 1,
      base64: false,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const b64 = await downscaleToBase64(result.assets[0].uri);
      setPhotoBase64(b64);
      await analyseImage(b64);
    } catch (err) {
      console.error("Photo processing failed:", err);
      setError("Couldn't process the photo. Try again.");
      setStep("choose");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Give your meal a name.");
      return;
    }
    setSaving(true);
    const wasScannedMeal = !!photoBase64;
    try {
      await onSave({
        title: title.trim(),
        items,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fats) || 0,
        ...(photoBase64 ? { photoBase64 } : {}),
      });
      reset();
      onClose();
      // Delight-moment review prompt — only fires once, only after a real
      // AI-scanned meal lands successfully. Apple system-throttles further.
      maybeRequestAppReview({ wasScannedMeal });
    } catch (err: any) {
      console.error("Save meal failed:", err);
      // Show the real message so future failures are debuggable in-app.
      const msg = err?.message ?? "Save failed. Try again.";
      setError(msg.length > 160 ? msg.slice(0, 160) + "…" : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={mod.safe}>
        <View style={mod.header}>
          <Text style={mod.headerTitle}>
            {step === "choose" ? "Log a meal" : step === "analyzing" ? "Scanning…" : "Review"}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={INK_MUTED} />
          </TouchableOpacity>
        </View>

        {step === "choose" && (
          <View style={mod.chooseWrap}>
            <ChooseRow
              icon="camera"
              tint={ACCENT.cal.tint}
              ink={ACCENT.cal.ink}
              title="Snap a photo"
              desc="AI identifies food + nutrition"
              onPress={handleCamera}
            />
            <ChooseRow
              icon="image"
              tint={ACCENT.fats.tint}
              ink={ACCENT.fats.ink}
              title="Choose from library"
              desc="Pick an existing photo"
              onPress={handleGallery}
            />
            <ChooseRow
              icon="create"
              tint={ACCENT.protein.tint}
              ink={ACCENT.protein.ink}
              title="Enter manually"
              desc="Type in the macros"
              onPress={() => setStep("manual")}
            />
          </View>
        )}

        {step === "analyzing" && (
          <View style={mod.analyzeWrap}>
            <View style={[mod.analyzeIcon, { backgroundColor: ACCENT.cal.tint }]}>
              <Ionicons name="sparkles" size={26} color={ACCENT.cal.ink} />
            </View>
            <Text style={mod.analyzeTitle}>Analysing your meal</Text>
            <Text style={mod.analyzeDesc}>
              Identifying foods, estimating portions, calculating macros.
            </Text>
            <ActivityIndicator color={INK} style={{ marginTop: 8 }} />
          </View>
        )}

        {(step === "review" || step === "manual") && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={mod.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Captured photo — anchors the review visually */}
              {step === "review" && photoBase64 ? (
                <View style={mod.photoBanner}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
                    style={mod.photoBannerImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {step === "review" && items.length > 0 && (
                <View style={mod.chips}>
                  {items.map((i) => (
                    <View key={i} style={mod.chip}>
                      <Text style={mod.chipText}>{i}</Text>
                    </View>
                  ))}
                </View>
              )}

              {error ? <Text style={mod.errorText}>{error}</Text> : null}

              <Field
                label="Meal name"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Chicken salad"
              />
              <Field
                label="Calories"
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                keyboardType="decimal-pad"
                suffix="kcal"
                accent={ACCENT.cal}
              />
              <View style={mod.macroRow}>
                <Field
                  label="Protein"
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  suffix="g"
                  accent={ACCENT.protein}
                  flex
                />
                <Field
                  label="Carbs"
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  suffix="g"
                  accent={ACCENT.carbs}
                  flex
                />
                <Field
                  label="Fats"
                  value={fats}
                  onChangeText={setFats}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  suffix="g"
                  accent={ACCENT.fats}
                  flex
                />
              </View>
            </ScrollView>

            <View style={mod.footer}>
              <TouchableOpacity
                style={[mod.primaryBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.9}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={mod.primaryBtnText}>Save meal</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ChooseRow({
  icon, tint, ink, title, desc, onPress,
}: {
  icon: any; tint: string; ink: string; title: string; desc: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={mod.chooseRow} onPress={onPress} activeOpacity={0.85}>
      <View style={[mod.chooseIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color={ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mod.chooseTitle}>{title}</Text>
        <Text style={mod.chooseDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={INK_FAINT} />
    </TouchableOpacity>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, suffix, accent, flex,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  suffix?: string;
  accent?: { ink: string; tint: string };
  flex?: boolean;
}) {
  return (
    <View style={[mod.field, flex && { flex: 1 }]}>
      <Text style={mod.fieldLabel}>{label}</Text>
      <View style={mod.fieldInputWrap}>
        <TextInput
          style={mod.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={INK_FAINT}
          keyboardType={keyboardType}
        />
        {suffix && (
          <Text style={[mod.fieldSuffix, accent ? { color: accent.ink } : null]}>
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Exercise Modal ──────────────────────────────────────────────────────────

const EXERCISE_TYPES = [
  "Running", "Walking", "Cycling", "Swimming", "Weight Training",
  "HIIT", "Yoga", "Pilates", "Rowing", "Other",
];
const INTENSITIES = ["Low", "Moderate", "High"] as const;

function ExerciseModal({
  visible, onClose, onSave, userStats,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: {
    title: string; type: string; duration: number;
    intensity: string; caloriesBurned: number; description: string;
  }) => Promise<void>;
  userStats: any;
}) {
  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<string>("Moderate");
  const [description, setDescription] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    caloriesBurned: number;
    description: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType("");
    setCustomType("");
    setDuration("");
    setIntensity("Moderate");
    setDescription("");
    setCalculating(false);
    setResult(null);
    setError("");
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCalculate = async () => {
    const exerciseType = type === "Other" ? customType.trim() : type;
    if (!exerciseType) {
      setError("Pick an exercise type.");
      return;
    }
    const dur = parseInt(duration, 10);
    if (!dur || dur <= 0) {
      setError("Enter a valid duration.");
      return;
    }
    setError("");
    setCalculating(true);
    try {
      const data = await analyzeExercise({
        type: exerciseType,
        duration: dur,
        intensity,
        description: description.trim() || exerciseType,
        userStats: userStats ?? {
          currentWeight: 75, height: 170, age: 30, gender: "other",
          activityLevel: "moderately_active",
        },
      });
      setResult(data);
    } catch {
      // Fallback MET estimate
      const met = intensity === "Low" ? 3 : intensity === "High" ? 9 : 5;
      const weight = userStats?.currentWeight ?? 75;
      const burned = Math.round((met * weight * dur) / 60);
      setResult({ title: `${exerciseType} (${intensity})`, caloriesBurned: burned, description: exerciseType });
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const exerciseType = type === "Other" ? customType.trim() : type;
      await onSave({
        ...result,
        type: exerciseType,
        duration: parseInt(duration, 10),
        intensity,
      });
      reset();
      onClose();
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={mod.safe}>
        <View style={mod.header}>
          <Text style={mod.headerTitle}>Log exercise</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={INK_MUTED} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={mod.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error ? <Text style={mod.errorText}>{error}</Text> : null}

            {/* Type */}
            <Text style={mod.fieldLabel}>Exercise type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              style={{ marginBottom: 14 }}
            >
              {EXERCISE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[mod.typeChip, type === t && mod.typeChipActive]}
                  onPress={() => { setType(t); setError(""); }}
                >
                  <Text style={[mod.typeChipText, type === t && mod.typeChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {type === "Other" && (
              <Field
                label="Describe it"
                value={customType}
                onChangeText={setCustomType}
                placeholder="What kind of exercise?"
              />
            )}

            <Field
              label="Duration"
              value={duration}
              onChangeText={setDuration}
              placeholder="30"
              keyboardType="number-pad"
              suffix="min"
              accent={ACCENT.burn}
            />

            <Text style={mod.fieldLabel}>Intensity</Text>
            <View style={mod.intensityRow}>
              {INTENSITIES.map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[mod.intensityBtn, intensity === i && mod.intensityBtnActive]}
                  onPress={() => setIntensity(i)}
                >
                  <Text style={[mod.intensityText, intensity === i && mod.intensityTextActive]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field
              label="Notes (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. treadmill at 8 km/h"
            />

            {result && (
              <View style={mod.resultCard}>
                <View style={[mod.resultIcon, { backgroundColor: ACCENT.burn.tint }]}>
                  <Ionicons name="flame" size={20} color={ACCENT.burn.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={mod.resultTitle}>{result.title}</Text>
                  <Text style={mod.resultBurn}>{Math.round(result.caloriesBurned)} kcal burned</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={mod.footer}>
            {!result ? (
              <TouchableOpacity
                style={[mod.primaryBtn, calculating && { opacity: 0.6 }]}
                onPress={handleCalculate}
                disabled={calculating}
                activeOpacity={0.9}
              >
                {calculating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={mod.primaryBtnText}>Calculate calories</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[mod.primaryBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.9}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={mod.primaryBtnText}>Save exercise</Text>}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function LogScreen() {
  const today = todayDate();
  const { profile } = useProfile();
  const {
    foodLogs, totals, addEntry: addFood, deleteEntry: deleteFood,
    refetch: refetchFood,
  } = useFoodLogs(today);
  const {
    exerciseLogs, totalCaloriesBurned, addEntry: addExercise,
    deleteEntry: deleteExercise, refetch: refetchEx,
  } = useExerciseLogs(today);

  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foodInitialMode, setFoodInitialMode] = useState<"choose" | "manual" | "photo">("choose");
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // React to deep-link from Dashboard FAB: /(tabs)/log?action=photo|meal|exercise
  const { action } = useLocalSearchParams<{ action?: string }>();
  useEffect(() => {
    if (!action) return;
    if (action === "photo") {
      setFoodInitialMode("photo");
      setShowFoodModal(true);
    } else if (action === "meal") {
      setFoodInitialMode("manual");
      setShowFoodModal(true);
    } else if (action === "exercise") {
      setShowExerciseModal(true);
    }
    // Strip the param so closing/reopening the modal doesn't re-trigger
    router.setParams({ action: undefined });
  }, [action]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFood(), refetchEx()]);
    setRefreshing(false);
  }, [refetchFood, refetchEx]);

  // Refetch when the diary regains focus — catches edits/deletes made on the
  // food detail screen so the diary doesn't show stale macros.
  useFocusEffect(
    useCallback(() => {
      refetchFood();
      refetchEx();
    }, [refetchFood, refetchEx])
  );

  // Build chronological feed
  const feed = useMemo(() => {
    type Item = { kind: "food" | "exercise"; ts: number; data: any };
    const items: Item[] = [
      ...foodLogs.map((e) => ({ kind: "food" as const, ts: e.createdAt ?? 0, data: e })),
      ...exerciseLogs.map((e) => ({ kind: "exercise" as const, ts: e.createdAt ?? 0, data: e })),
    ];
    items.sort((a, b) => b.ts - a.ts);
    return items;
  }, [foodLogs, exerciseLogs]);

  const net = totals.calories - totalCaloriesBurned;
  const goal = profile?.nutritionGoals?.calories ?? 2000;
  const remaining = goal - net;

  const handleSaveFood = async (entry: any) => {
    await addFood({ ...entry, date: today });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };
  const handleSaveExercise = async (entry: any) => {
    await addExercise({ ...entry, date: today });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  };

  const confirmDeleteFood = (id: string, title: string) => {
    Alert.alert("Delete entry", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteFood(id) },
    ]);
  };
  const confirmDeleteExercise = (id: string, title: string) => {
    Alert.alert("Delete entry", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteExercise(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INK} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.day}>{formatDayHeader(today)}</Text>
          <Text style={styles.title}>Diary</Text>
        </View>

        {/* Day stat strip */}
        <View style={styles.statStrip}>
          <Stat label="Eaten" value={Math.round(totals.calories)} unit="kcal" inkOverride={ACCENT.cal.ink} />
          <View style={styles.statDivider} />
          <Stat label="Burned" value={Math.round(totalCaloriesBurned)} unit="kcal" inkOverride={ACCENT.burn.ink} />
          <View style={styles.statDivider} />
          <Stat
            label={remaining < 0 ? "Over" : "Left"}
            value={Math.abs(Math.round(remaining))}
            unit="kcal"
            inkOverride={remaining < 0 ? "#EF4444" : ACCENT.carbs.ink}
          />
        </View>

        {/* Feed */}
        {feed.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: ACCENT.cal.tint }]}>
              <Ionicons name="restaurant" size={28} color={ACCENT.cal.ink} />
            </View>
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptyDesc}>
              Add your first meal or exercise to get going.
            </Text>
          </View>
        ) : (
          <View style={styles.feedCard}>
            {feed.map((item, idx) => (
              <View key={`${item.kind}-${item.data.id}`}>
                {item.kind === "food" ? (
                  <FoodFeedRow
                    id={item.data.id}
                    title={item.data.title}
                    cal={item.data.calories}
                    protein={item.data.protein}
                    carbs={item.data.carbs}
                    fats={item.data.fats}
                    photoBase64={item.data.photoBase64}
                    time={formatTime(item.data.createdAt)}
                    onDelete={() => confirmDeleteFood(item.data.id, item.data.title)}
                  />
                ) : (
                  <ExerciseFeedRow
                    title={item.data.title}
                    duration={item.data.duration}
                    intensity={item.data.intensity}
                    burned={item.data.caloriesBurned}
                    time={formatTime(item.data.createdAt)}
                    onDelete={() => confirmDeleteExercise(item.data.id, item.data.title)}
                  />
                )}
                {idx < feed.length - 1 && <View style={styles.feedDivider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Sticky add bar */}
      <View style={styles.addBar}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: ACCENT.cal.tint }]}
          onPress={() => { setFoodInitialMode("choose"); setShowFoodModal(true); }}
          activeOpacity={0.85}
        >
          <View style={[styles.addBtnIcon, { backgroundColor: "#fff" }]}>
            <Ionicons name="restaurant" size={18} color={ACCENT.cal.ink} />
          </View>
          <Text style={[styles.addBtnText, { color: ACCENT.cal.ink }]}>Add meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: ACCENT.burn.tint }]}
          onPress={() => setShowExerciseModal(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.addBtnIcon, { backgroundColor: "#fff" }]}>
            <Ionicons name="barbell" size={18} color={ACCENT.burn.ink} />
          </View>
          <Text style={[styles.addBtnText, { color: ACCENT.burn.ink }]}>Add exercise</Text>
        </TouchableOpacity>
      </View>

      <FoodModal
        visible={showFoodModal}
        initialMode={foodInitialMode}
        onClose={() => setShowFoodModal(false)}
        onSave={handleSaveFood}
      />
      <ExerciseModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSave={handleSaveExercise}
        userStats={profile?.userStats}
      />
    </SafeAreaView>
  );
}

function Stat({
  label, value, unit, inkOverride,
}: { label: string; value: number; unit: string; inkOverride?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, inkOverride ? { color: inkOverride } : null]}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

function FoodFeedRow({
  id, title, cal, protein, carbs, fats, time, onDelete, photoBase64,
}: {
  id: string; title: string; cal: number; protein: number; carbs: number; fats: number;
  time: string; onDelete: () => void;
  photoBase64?: string;
}) {
  return (
    <TouchableOpacity
      style={feed.row}
      activeOpacity={0.7}
      onPress={() => router.push(`/food/${id}` as any)}
    >
      {photoBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
          style={feed.photoThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[feed.thumb, { backgroundColor: ACCENT.cal.tint }]}>
          <Ionicons name="restaurant" size={20} color={ACCENT.cal.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={feed.titleRow}>
          <Text style={feed.title} numberOfLines={1}>{title}</Text>
          <Text style={feed.time}>{time}</Text>
        </View>
        <View style={feed.metaRow}>
          <View style={feed.calChip}>
            <Ionicons name="flame" size={11} color={ACCENT.cal.ink} />
            <Text style={feed.calText}>{Math.round(cal)}</Text>
          </View>
          <Text style={feed.macroText}>
            <Text style={{ color: ACCENT.protein.ink, fontWeight: "700" }}>P{Math.round(protein)}</Text>
            <Text style={{ color: INK_FAINT }}> · </Text>
            <Text style={{ color: ACCENT.carbs.ink, fontWeight: "700" }}>C{Math.round(carbs)}</Text>
            <Text style={{ color: INK_FAINT }}> · </Text>
            <Text style={{ color: ACCENT.fats.ink, fontWeight: "700" }}>F{Math.round(fats)}</Text>
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={10} style={feed.delete}>
        <Ionicons name="trash-outline" size={16} color={INK_FAINT} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ExerciseFeedRow({
  title, duration, intensity, burned, time, onDelete,
}: {
  title: string; duration: number; intensity: string; burned: number;
  time: string; onDelete: () => void;
}) {
  return (
    <View style={feed.row}>
      <View style={[feed.thumb, { backgroundColor: ACCENT.burn.tint }]}>
        <Ionicons name="barbell" size={20} color={ACCENT.burn.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={feed.titleRow}>
          <Text style={feed.title} numberOfLines={1}>{title}</Text>
          <Text style={feed.time}>{time}</Text>
        </View>
        <View style={feed.metaRow}>
          <View style={feed.calChip}>
            <Ionicons name="flame" size={11} color={ACCENT.burn.ink} />
            <Text style={[feed.calText, { color: ACCENT.burn.ink }]}>−{Math.round(burned)}</Text>
          </View>
          <Text style={[feed.macroText, { color: INK_MUTED }]}>{duration} min · {intensity}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={10} style={feed.delete}>
        <Ionicons name="trash-outline" size={16} color={INK_FAINT} />
      </TouchableOpacity>
    </View>
  );
}

const feed = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  thumb: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  photoThumb: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: BG,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: INK, flex: 1 },
  time: { fontSize: 11, fontWeight: "600", color: INK_FAINT },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  calChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: BG, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999,
  },
  calText: { fontSize: 11, fontWeight: "800", color: ACCENT.cal.ink, letterSpacing: -0.2 },
  macroText: { fontSize: 12, fontWeight: "600" },
  delete: { padding: 6 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  header: { gap: 2 },
  day: { fontSize: 13, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.3 },
  title: { fontSize: 30, fontWeight: "800", color: INK, letterSpacing: -1 },

  statStrip: {
    flexDirection: "row",
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },
  statLabel: { fontSize: 11, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.4, textTransform: "uppercase" },
  statValue: { fontSize: 22, fontWeight: "800", color: INK, letterSpacing: -0.6, marginTop: 2 },
  statUnit: { fontSize: 11, fontWeight: "600", color: INK_FAINT },

  emptyCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 28, alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: INK, marginTop: 4 },
  emptyDesc: { fontSize: 13, color: INK_MUTED, textAlign: "center" },

  feedCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  feedDivider: { height: 1, backgroundColor: BORDER, marginLeft: 64 },

  addBar: {
    position: "absolute",
    left: 16, right: 16,
    bottom: Platform.OS === "ios" ? 96 : 76,
    flexDirection: "row",
    gap: 10,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: CARD,
    borderRadius: 16,
    shadowColor: INK,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 5,
  },
  addBtnIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: INK },
});

// ─── Modal shared styles ─────────────────────────────────────────────────────

const mod = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
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
  headerTitle: { fontSize: 17, fontWeight: "800", color: INK, letterSpacing: -0.3 },

  chooseWrap: { padding: 20, gap: 10 },
  chooseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: BG,
    borderRadius: 16,
  },
  chooseIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  chooseTitle: { fontSize: 15, fontWeight: "700", color: INK },
  chooseDesc: { fontSize: 12, color: INK_MUTED, marginTop: 2 },

  analyzeWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  analyzeIcon: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  analyzeTitle: { fontSize: 20, fontWeight: "800", color: INK, letterSpacing: -0.4, marginTop: 6 },
  analyzeDesc: { fontSize: 14, color: INK_MUTED, textAlign: "center", lineHeight: 20 },

  formScroll: { padding: 20, gap: 12, paddingBottom: 40 },
  photoBanner: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: BG,
    marginBottom: 4,
  },
  photoBannerImage: {
    width: "100%",
    aspectRatio: 16 / 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { backgroundColor: ACCENT.cal.tint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, color: ACCENT.cal.ink, fontWeight: "700" },
  errorText: {
    backgroundColor: "#FFF0F0",
    color: "#D70015",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 4,
  },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.3, textTransform: "uppercase" },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: INK,
    fontWeight: "600",
  },
  fieldSuffix: { paddingRight: 14, fontSize: 12, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.2 },
  macroRow: { flexDirection: "row", gap: 10 },

  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  typeChipActive: { backgroundColor: INK, borderColor: INK },
  typeChipText: { fontSize: 13, fontWeight: "600", color: INK_MUTED },
  typeChipTextActive: { color: "#fff" },

  intensityRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  intensityBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  intensityBtnActive: { backgroundColor: INK, borderColor: INK },
  intensityText: { fontSize: 13, fontWeight: "700", color: INK_MUTED },
  intensityTextActive: { color: "#fff" },

  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BG,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  resultIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  resultTitle: { fontSize: 14, fontWeight: "700", color: INK },
  resultBurn: { fontSize: 20, fontWeight: "800", color: ACCENT.burn.ink, marginTop: 2 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
