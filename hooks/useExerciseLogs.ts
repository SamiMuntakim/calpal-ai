import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  ExerciseEntry,
  addExerciseEntry,
  deleteExerciseEntry,
  getExerciseEntriesByDate,
} from "../services/firestoreService";

export function useExerciseLogs(date: string) {
  const { user } = useAuth();
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const logs = await getExerciseEntriesByDate(user.id, date);
      setExerciseLogs(logs);
    } catch (error) {
      console.error("Error fetching exercise logs:", error);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addEntry = async (entry: Omit<ExerciseEntry, "id" | "createdAt">) => {
    if (!user) return;
    const id = await addExerciseEntry(user.id, entry);
    const newEntry: ExerciseEntry = { ...entry, id, createdAt: Date.now() };
    setExerciseLogs((prev) => [...prev, newEntry]);
  };

  const deleteEntry = async (entryId: string) => {
    if (!user) return;
    await deleteExerciseEntry(entryId);
    setExerciseLogs((prev) => prev.filter((e) => e.id !== entryId));
  };

  const totalCaloriesBurned = exerciseLogs.reduce(
    (acc, e) => acc + (e.caloriesBurned || 0),
    0
  );

  return {
    exerciseLogs,
    loading,
    addEntry,
    deleteEntry,
    refetch: fetchLogs,
    totalCaloriesBurned,
  };
}
