import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  WeightEntry,
  addWeightEntry,
  deleteWeightEntry,
  getAllWeightEntries,
} from "../services/firestoreService";

export function useWeightLogs() {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const logs = await getAllWeightEntries(user.id);
      setWeightLogs(logs);
    } catch (error) {
      console.error("Error fetching weight logs:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addEntry = async (weight: number, date: string) => {
    if (!user) return;
    const id = await addWeightEntry(user.id, { weight, date });
    const newEntry: WeightEntry = { weight, date, id, createdAt: Date.now() };
    setWeightLogs((prev) =>
      [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date))
    );
  };

  const deleteEntry = async (entryId: string) => {
    if (!user) return;
    await deleteWeightEntry(entryId);
    setWeightLogs((prev) => prev.filter((e) => e.id !== entryId));
  };

  return { weightLogs, loading, addEntry, deleteEntry, refetch: fetchLogs };
}
