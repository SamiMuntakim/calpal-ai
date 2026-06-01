import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FAFAFB";
const CARD = "#FFFFFF";
const BORDER = "#F0F2F5";

const ACCENT = {
  protein: { ink: "#FF6B6B", tint: "#FFEEF0" },
  carbs: { ink: "#22C55E", tint: "#E8F8EE" },
  fats: { ink: "#3B82F6", tint: "#E8F0FE" },
  cal: { ink: "#F59E0B", tint: "#FFF6E6" },
  goal: { ink: "#22C55E", tint: "#E8F8EE" },
  ai: { ink: "#8B5CF6", tint: "#F1ECFF" },
};

function formatActivity(level: string) {
  if (!level) return "—";
  return level
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGoal(goal: string) {
  if (goal === "lose") return "Lose fat";
  if (goal === "gain") return "Build muscle";
  if (goal === "maintain") return "Maintain weight";
  return goal || "—";
}

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { profile, loading } = useProfile();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try { await signOut(); }
          catch { Alert.alert("Error", "Sign out failed. Try again."); }
          finally { setSigningOut(false); }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all data. Cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try { await deleteAccount(); }
            catch (err: any) { Alert.alert("Error", err?.message ?? "Failed. Sign in again and try."); }
          },
        },
      ]
    );
  };

  const stats = profile?.userStats;
  const goals = profile?.nutritionGoals;
  const initial = (profile?.name ?? user?.email ?? "?")[0].toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={INK} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? "User"}</Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
          <View style={styles.heroChip}>
            <Ionicons name="diamond" size={11} color={ACCENT.ai.ink} />
            <Text style={styles.heroChipText}>Premium</Text>
          </View>
        </View>

        {/* Daily targets */}
        {goals && (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push("/edit-profile" as any)}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Daily targets</Text>
              <View style={styles.editChip}>
                <Ionicons name="create-outline" size={11} color={INK_MUTED} />
                <Text style={styles.editChipText}>Edit</Text>
              </View>
            </View>
            <View style={styles.calorieRow}>
              <View style={[styles.calorieIcon, { backgroundColor: ACCENT.cal.tint }]}>
                <Ionicons name="flame" size={20} color={ACCENT.cal.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.calorieLabel}>CALORIES</Text>
                <Text style={styles.calorieBig}>
                  {Math.round(goals.calories).toLocaleString()}
                  <Text style={styles.calorieUnit}> kcal</Text>
                </Text>
              </View>
            </View>
            <View style={styles.macrosRow}>
              <MacroPill label="Protein" value={goals.protein} tint={ACCENT.protein.tint} ink={ACCENT.protein.ink} />
              <MacroPill label="Carbs" value={goals.carbs} tint={ACCENT.carbs.tint} ink={ACCENT.carbs.ink} />
              <MacroPill label="Fats" value={goals.fats} tint={ACCENT.fats.tint} ink={ACCENT.fats.ink} />
            </View>
          </TouchableOpacity>
        )}

        {/* Body stats */}
        {stats && (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push("/edit-profile" as any)}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Body stats</Text>
              <View style={styles.editChip}>
                <Ionicons name="create-outline" size={11} color={INK_MUTED} />
                <Text style={styles.editChipText}>Edit</Text>
              </View>
            </View>
            <View style={styles.statGrid}>
              <StatTile label="Current" value={`${stats.currentWeight}`} unit="kg" />
              <StatTile label="Starting" value={`${stats.startingWeight}`} unit="kg" />
              <StatTile label="Goal" value={`${stats.goalWeight}`} unit="kg" accent />
            </View>
            <View style={styles.divider} />
            <Row label="Height" value={`${stats.height} cm`} />
            <Row label="Age" value={`${stats.age} years`} />
            <Row label="Sex" value={stats.gender.charAt(0).toUpperCase() + stats.gender.slice(1)} />
            <Row label="Activity" value={formatActivity(stats.activityLevel)} />
            <Row label="Goal" value={formatGoal(stats.weeklyGoal)} last />
          </TouchableOpacity>
        )}

        {/* Health & wellness disclaimer (Apple guideline 5.1.5 / medical scope) */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerIcon}>
            <Ionicons name="information-circle" size={18} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.disclaimerTitle}>About AI estimates</Text>
            <Text style={styles.disclaimerBody}>
              CalPal's nutrition values and calorie targets are AI-generated
              approximations for educational use. They are{" "}
              <Text style={styles.disclaimerStrong}>not medical advice</Text>{" "}
              and should not replace consultation with a qualified healthcare
              professional, particularly if you have a medical condition,
              eating disorder, or are pregnant or nursing.
            </Text>
          </View>
        </View>

        {/* Settings list */}
        <View style={styles.listCard}>
          <SettingsRow
            icon="person-circle"
            tint="#E8F0FE"
            ink="#3B82F6"
            label="Edit profile & goals"
            onPress={() => router.push("/edit-profile" as any)}
          />
          <SettingsRow
            icon="notifications"
            tint="#FFF6E6"
            ink="#F59E0B"
            label="Reminders"
            onPress={() => router.push("/notification-settings" as any)}
          />
          <SettingsRow
            icon="card"
            tint="#F1ECFF"
            ink="#8B5CF6"
            label="Manage subscription"
            onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")}
          />
          <SettingsRow
            icon="document-text"
            tint="#E8F0FE"
            ink="#3B82F6"
            label="Terms of Use"
            onPress={() => Linking.openURL("https://calpal.site/tos/")}
          />
          <SettingsRow
            icon="shield-checkmark"
            tint="#E8F8EE"
            ink="#22C55E"
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://calpal.site/privacy-policy/")}
          />
          <SettingsRow
            icon="help-circle"
            tint="#FFF6E6"
            ink="#F59E0B"
            label="Help & support"
            onPress={() => Linking.openURL("mailto:support@calpal.ai")}
            last
          />
        </View>

        {/* Danger zone */}
        <View style={styles.listCard}>
          <SettingsRow
            icon="log-out"
            tint="#FFF0E6"
            ink="#FF9500"
            label="Sign out"
            onPress={handleSignOut}
            loading={signingOut}
          />
          <SettingsRow
            icon="trash"
            tint="#FFECEC"
            ink="#EF4444"
            label="Delete account"
            onPress={handleDelete}
            danger
            last
          />
        </View>

        <Text style={styles.footerBrand}>
          CalPal · v{Constants.expoConfig?.version ?? "1.0"}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroPill({
  label, value, tint, ink,
}: { label: string; value: number; tint: string; ink: string }) {
  return (
    <View style={[macroPill.box, { backgroundColor: tint }]}>
      <View style={[macroPill.dot, { backgroundColor: ink }]} />
      <Text style={macroPill.label}>{label}</Text>
      <Text style={[macroPill.value, { color: ink }]}>{Math.round(value)}g</Text>
    </View>
  );
}

const macroPill = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  label: { fontSize: 10, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.4, textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
});

function StatTile({
  label, value, unit, accent,
}: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <View style={statTile.box}>
      <Text style={statTile.label}>{label}</Text>
      <Text style={[statTile.value, accent && { color: ACCENT.goal.ink }]}>
        {value}
        <Text style={statTile.unit}> {unit}</Text>
      </Text>
    </View>
  );
}

const statTile = StyleSheet.create({
  box: { flex: 1, alignItems: "flex-start", paddingVertical: 4 },
  label: { fontSize: 10, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.4, textTransform: "uppercase" },
  value: { fontSize: 20, fontWeight: "800", color: INK, letterSpacing: -0.5, marginTop: 4 },
  unit: { fontSize: 12, fontWeight: "600", color: INK_FAINT, letterSpacing: 0 },
});

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[row.wrap, !last && row.border]}>
      <Text style={row.label}>{label}</Text>
      <Text style={row.value}>{value}</Text>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
  },
  border: { borderBottomWidth: 1, borderBottomColor: BORDER },
  label: { fontSize: 14, color: INK_MUTED, fontWeight: "500" },
  value: { fontSize: 14, color: INK, fontWeight: "700" },
});

function SettingsRow({
  icon, tint, ink, label, onPress, last, loading, danger,
}: {
  icon: any; tint: string; ink: string; label: string;
  onPress: () => void; last?: boolean; loading?: boolean; danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[settingsRow.wrap, !last && settingsRow.border]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={loading}
    >
      <View style={[settingsRow.icon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color={ink} />
      </View>
      <Text style={[settingsRow.label, danger && { color: "#EF4444" }]}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={INK_MUTED} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={INK_FAINT} />
      )}
    </TouchableOpacity>
  );
}

const settingsRow = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  border: { borderBottomWidth: 1, borderBottomColor: BORDER },
  icon: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: INK },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  hero: { alignItems: "center", gap: 6, paddingTop: 4, paddingBottom: 4 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: INK,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  name: { fontSize: 22, fontWeight: "800", color: INK, letterSpacing: -0.5, marginTop: 4 },
  email: { fontSize: 13, color: INK_MUTED },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ACCENT.ai.tint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  heroChipText: { fontSize: 11, fontWeight: "800", color: ACCENT.ai.ink, letterSpacing: 0.4 },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: INK, letterSpacing: -0.2 },
  cardMeta: { fontSize: 11, color: INK_FAINT },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  editChipText: { fontSize: 11, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.2 },
  calorieRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  calorieIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  calorieLabel: { fontSize: 10, fontWeight: "700", color: INK_MUTED, letterSpacing: 0.5 },
  calorieBig: { fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.8, marginTop: 2 },
  calorieUnit: { fontSize: 13, fontWeight: "600", color: INK_FAINT, letterSpacing: 0 },
  macrosRow: { flexDirection: "row", gap: 8 },

  statGrid: { flexDirection: "row", gap: 8 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },

  listCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },

  disclaimerCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  disclaimerIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  disclaimerBody: { fontSize: 12, color: "#334155", lineHeight: 17 },
  disclaimerStrong: { fontWeight: "700", color: "#1E3A8A" },

  footerBrand: {
    fontSize: 11,
    fontWeight: "600",
    color: INK_FAINT,
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: 8,
  },
});
