import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getAllFoodEntries } from "../services/firestoreService";

function isoFromDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function computeStreak(loggedDates: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoFromDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = isoFromDate(yesterday);

  // Anchor on today if logged today, else yesterday (so a streak doesn't
  // break the moment the clock rolls over a new day before they've eaten).
  let cursor: Date;
  if (loggedDates.has(todayIso)) {
    cursor = new Date(today);
  } else if (loggedDates.has(yesterdayIso)) {
    cursor = new Date(yesterday);
  } else {
    return 0;
  }

  let count = 0;
  while (loggedDates.has(isoFromDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/**
 * Consecutive-days-logged streak based on food entries.
 *
 * Pass a `refreshKey` (e.g. today's foodLogs.length) to re-compute when
 * the user logs or deletes a meal without needing to mount/unmount.
 */
export function useStreak(refreshKey?: unknown) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) {
      setStreak(0);
      return;
    }
    setLoading(true);
    try {
      const logs = await getAllFoodEntries(user.id);
      const dates = new Set(
        logs.map((l) => l.date).filter((d): d is string => typeof d === "string")
      );
      setStreak(computeStreak(dates));
    } catch (err) {
      console.warn("useStreak fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch, refreshKey]);

  return { streak, loading, refetch: fetch };
}
