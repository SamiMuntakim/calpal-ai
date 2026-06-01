import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const SETTINGS_KEY = "calpal_reminder_settings_v1";

export type ReminderKey = "breakfast" | "lunch" | "dinner" | "weighIn";

export type ReminderSetting = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ReminderSettings = Record<ReminderKey, ReminderSetting>;

export const REMINDER_DEFAULTS: ReminderSettings = {
  breakfast: { enabled: false, hour: 8, minute: 0 },
  lunch: { enabled: false, hour: 12, minute: 30 },
  dinner: { enabled: false, hour: 18, minute: 30 },
  weighIn: { enabled: false, hour: 7, minute: 0 },
};

export const REMINDER_META: Record<
  ReminderKey,
  { title: string; body: string; emoji: string; label: string }
> = {
  breakfast: {
    title: "Time for breakfast 🍳",
    body: "Snap your meal to log it in seconds.",
    emoji: "🍳",
    label: "Breakfast",
  },
  lunch: {
    title: "Lunchtime 🥗",
    body: "Don't forget to log what you ate.",
    emoji: "🥗",
    label: "Lunch",
  },
  dinner: {
    title: "Dinner reminder 🍽",
    body: "Stay on track — log your meal now.",
    emoji: "🍽",
    label: "Dinner",
  },
  weighIn: {
    title: "Time to weigh in ⚖️",
    body: "A quick log keeps your trend honest.",
    emoji: "⚖️",
    label: "Morning weigh-in",
  },
};

// ─── Permissions ─────────────────────────────────────────────────────────────

export type PermissionStatus = "granted" | "denied" | "undetermined";

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function requestPermission(): Promise<PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

// ─── Settings persistence ────────────────────────────────────────────────────

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return REMINDER_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    // Merge with defaults so a future-added reminder doesn't break old saves
    return {
      breakfast: { ...REMINDER_DEFAULTS.breakfast, ...parsed.breakfast },
      lunch: { ...REMINDER_DEFAULTS.lunch, ...parsed.lunch },
      dinner: { ...REMINDER_DEFAULTS.dinner, ...parsed.dinner },
      weighIn: { ...REMINDER_DEFAULTS.weighIn, ...parsed.weighIn },
    };
  } catch (err) {
    console.warn("loadReminderSettings failed:", err);
    return REMINDER_DEFAULTS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

/**
 * Cancels every scheduled notification and re-schedules from the given
 * settings. Idempotent — safe to call after every settings change.
 */
export async function rescheduleAllReminders(settings: ReminderSettings) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const enabled = (Object.keys(settings) as ReminderKey[]).filter(
    (k) => settings[k].enabled
  );

  for (const key of enabled) {
    const setting = settings[key];
    const meta = REMINDER_META[key];
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `calpal_reminder_${key}`,
        content: {
          title: meta.title,
          body: meta.body,
          sound: "default",
        },
        // iOS + Android: daily repeating at the given hour/minute
        trigger: {
          hour: setting.hour,
          minute: setting.minute,
          repeats: true,
        } as any,
      });
    } catch (err) {
      console.warn(`Failed to schedule ${key} reminder:`, err);
    }
  }
}

/** Configure how notifications behave when the app is in the foreground. */
export function setupForegroundHandler() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
