import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  FoodEntry,
  addFoodEntry,
  deleteFoodEntry,
  getFoodEntriesByDate,
} from "../services/firestoreService";

export function useFoodLogs(date: string) {
  const { user } = useAuth();
  const [foodLogs, setFoodLogs] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const logs = await getFoodEntriesByDate(user.id, date);
      setFoodLogs(logs);
    } catch (error) {
      console.error("Error fetching food logs:", error);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addEntry = async (entry: Omit<FoodEntry, "id" | "createdAt">) => {
    if (!user) return;
    const id = await addFoodEntry(user.id, entry);
    const newEntry: FoodEntry = { ...entry, id, createdAt: Date.now() };
    setFoodLogs((prev) => [...prev, newEntry]);
  };

  const deleteEntry = async (entryId: string) => {
    if (!user) return;
    await deleteFoodEntry(entryId);
    setFoodLogs((prev) => prev.filter((e) => e.id !== entryId));
  };

  const totals = foodLogs.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fats: acc.fats + (entry.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return { foodLogs, loading, addEntry, deleteEntry, refetch: fetchLogs, totals };
}
