import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import {
  ReminderKey,
  ReminderSettings,
  REMINDER_DEFAULTS,
  REMINDER_META,
  loadReminderSettings,
  saveReminderSettings,
  rescheduleAllReminders,
  getPermissionStatus,
  requestPermission,
  PermissionStatus,
} from "../services/notificationsService";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const INK_FAINT = "#A0A8B3";
const BG = "#FAFAFB";
const CARD = "#FFFFFF";
const BORDER = "#F0F2F5";
const PRIMARY = "#0a7ea4";

const ACCENT: Record<ReminderKey, { ink: string; tint: string; icon: any }> = {
  breakfast: { ink: "#F59E0B", tint: "#FFF6E6", icon: "sunny" },
  lunch: { ink: "#22C55E", tint: "#E8F8EE", icon: "leaf" },
  dinner: { ink: "#EF4444", tint: "#FFECEC", icon: "moon" },
  weighIn: { ink: "#3B82F6", tint: "#E8F0FE", icon: "scale" },
};

function formatTime(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<ReminderSettings>(REMINDER_DEFAULTS);
  const [permission, setPermission] = useState<PermissionStatus>("undetermined");
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<ReminderKey | null>(null);

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([
        loadReminderSettings(),
        getPermissionStatus(),
      ]);
      setSettings(s);
      setPermission(p);
      setLoading(false);
    })();
  }, []);

  /** Helper: persist settings + reschedule (only when permission granted). */
  const persist = async (next: ReminderSettings) => {
    setSettings(next);
    await saveReminderSettings(next);
    if (permission === "granted") {
      await rescheduleAllReminders(next);
    }
  };

  const handleToggle = async (key: ReminderKey, nextEnabled: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    // If they're turning a reminder ON for the first time and we don't have
    // permission yet, ask for it now — this is the contextual moment Apple
    // expects.
    if (nextEnabled && permission !== "granted") {
      if (permission === "denied") {
        Alert.alert(
          "Notifications are off",
          "Enable notifications in iOS Settings to receive reminders.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const result = await requestPermission();
      setPermission(result);
      if (result !== "granted") return; // Don't toggle if they declined
    }

    const next: ReminderSettings = {
      ...settings,
      [key]: { ...settings[key], enabled: nextEnabled },
    };
    await persist(next);
  };

  const handleTimeChange = async (key: ReminderKey, date: Date) => {
    const next: ReminderSettings = {
      ...settings,
      [key]: {
        ...settings[key],
        hour: date.getHours(),
        minute: date.getMinutes(),
      },
    };
    await persist(next);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={INK} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const reminderKeys: ReminderKey[] = ["breakfast", "lunch", "dinner", "weighIn"];
  const showPermissionBanner = permission !== "granted";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        {showPermissionBanner && (
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="notifications-off" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {permission === "denied"
                  ? "Notifications are blocked"
                  : "Allow notifications"}
              </Text>
              <Text style={styles.bannerDesc}>
                {permission === "denied"
                  ? "Open iOS Settings to allow CalPal reminders."
                  : "Toggle a reminder below to enable system notifications."}
              </Text>
            </View>
            {permission === "denied" && (
              <TouchableOpacity
                style={styles.bannerBtn}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.bannerBtnText}>Open</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>DAILY REMINDERS</Text>

        <View style={styles.listCard}>
          {reminderKeys.map((key, idx) => {
            const setting = settings[key];
            const meta = REMINDER_META[key];
            const accent = ACCENT[key];
            const isLast = idx === reminderKeys.length - 1;
            return (
              <View
                key={key}
                style={[styles.row, !isLast && styles.rowBorder]}
              >
                <View style={[styles.rowIcon, { backgroundColor: accent.tint }]}>
                  <Ionicons name={accent.icon} size={18} color={accent.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{meta.label}</Text>
                  <TouchableOpacity
                    disabled={!setting.enabled}
                    onPress={() => setEditingKey(key)}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.rowTime,
                        setting.enabled
                          ? { color: accent.ink }
                          : { color: INK_FAINT },
                      ]}
                    >
                      {formatTime(setting.hour, setting.minute)}
                      {setting.enabled ? "  ✎" : ""}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Switch
                  value={setting.enabled}
                  onValueChange={(v) => handleToggle(key, v)}
                  trackColor={{ false: BORDER, true: accent.ink }}
                  thumbColor="#fff"
                  ios_backgroundColor={BORDER}
                />
              </View>
            );
          })}
        </View>

        <Text style={styles.footnote}>
          Reminders fire daily at the time you choose. Tap the time to change it.
          Cancel any time in iOS Settings or by toggling off here.
        </Text>
      </View>

      {/* Time picker — modal on iOS for consistent UX */}
      <Modal
        visible={editingKey !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingKey(null)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setEditingKey(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
            <View style={styles.pickerHandle} />
            {editingKey && (
              <>
                <Text style={styles.pickerTitle}>
                  {REMINDER_META[editingKey].label}
                </Text>
                <DateTimePicker
                  value={(() => {
                    const d = new Date();
                    d.setHours(
                      settings[editingKey].hour,
                      settings[editingKey].minute,
                      0,
                      0
                    );
                    return d;
                  })()}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, date) => {
                    if (date && editingKey) handleTimeChange(editingKey, date);
                  }}
                />
                <TouchableOpacity
                  style={styles.pickerDone}
                  onPress={() => setEditingKey(null)}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

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

  content: { padding: 16, gap: 14 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EEF7FB",
    borderRadius: 14,
    padding: 14,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { fontSize: 14, fontWeight: "800", color: INK },
  bannerDesc: { fontSize: 12, color: INK_MUTED, marginTop: 2 },
  bannerBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bannerBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: INK_MUTED,
    letterSpacing: 0.5,
    marginTop: 6,
    marginLeft: 4,
  },

  listCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "700", color: INK },
  rowTime: { fontSize: 13, fontWeight: "600", marginTop: 2 },

  footnote: {
    fontSize: 12,
    color: INK_MUTED,
    lineHeight: 17,
    paddingHorizontal: 4,
    marginTop: 4,
  },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,15,20,0.45)",
    justifyContent: "flex-end",
  },
  pickerCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 8,
    alignItems: "center",
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E3E8",
    alignSelf: "center",
    marginBottom: 6,
  },
  pickerTitle: { fontSize: 16, fontWeight: "800", color: INK, marginBottom: 4 },
  pickerDone: {
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 6,
  },
  pickerDoneText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
