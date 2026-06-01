import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { firestore } from "./firebaseConfig";
import { Profile } from "../hooks/useProfile";

// ─── Profile ─────────────────────────────────────────────────────────────────
// Collection: users/{userId}  — path-based ownership (auth.uid == userId)

export const saveProfile = async (
  userId: string,
  profile: Partial<Profile>
): Promise<void> => {
  await setDoc(doc(firestore, "users", userId), profile, { merge: true });
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FoodEntry {
  id?: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  title: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  /** Optional compressed thumbnail (JPEG @ ~quality 0.4, ~30–80KB).
   *  Stored inline because there's no Firebase Storage rules infra yet.
   *  Rendered as `data:image/jpeg;base64,...`. */
  photoBase64?: string;
  createdAt?: number;
}

export interface ExerciseEntry {
  id?: string;
  userId?: string;
  date: string;
  title: string;
  type: string;
  duration: number;
  intensity: string;
  caloriesBurned: number;
  description: string;
  createdAt?: number;
}

export interface WeightEntry {
  id?: string;
  userId?: string;
  weight: number;
  date: string;
  createdAt?: number;
}

// ─── Food Logs ───────────────────────────────────────────────────────────────
// Collection: mealLogs  (top-level, owned via userId field)

export const addFoodEntry = async (
  userId: string,
  entry: Omit<FoodEntry, "id" | "userId" | "createdAt">
): Promise<string> => {
  const ref = await addDoc(collection(firestore, "mealLogs"), {
    ...entry,
    userId,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const deleteFoodEntry = async (entryId: string): Promise<void> => {
  await deleteDoc(doc(firestore, "mealLogs", entryId));
};

/** Fetch a single food entry by ID. Returns null if missing. */
export const getFoodEntry = async (entryId: string): Promise<FoodEntry | null> => {
  const ref = doc(firestore, "mealLogs", entryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FoodEntry;
};

/** Patch a food entry — used by the detail/edit screen. Fields like
 *  userId and id are stripped so we can't accidentally clobber ownership. */
export const updateFoodEntry = async (
  entryId: string,
  patch: Partial<Omit<FoodEntry, "id" | "userId" | "createdAt">>
): Promise<void> => {
  // Strip any undefined keys — Firestore doesn't accept them.
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  await updateDoc(doc(firestore, "mealLogs", entryId), clean);
};

export const getFoodEntriesByDate = async (
  userId: string,
  date: string
): Promise<FoodEntry[]> => {
  const q = query(
    collection(firestore, "mealLogs"),
    where("userId", "==", userId),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() } as FoodEntry)
  );
  return entries.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
};

/** Fetch every food entry for a user. Used by useStreak — we filter
 *  client-side rather than range-query so we don't need a composite index. */
export const getAllFoodEntries = async (userId: string): Promise<FoodEntry[]> => {
  const q = query(
    collection(firestore, "mealLogs"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FoodEntry));
};

// ─── Exercise Logs ───────────────────────────────────────────────────────────
// Collection: exerciseLogs  (top-level, owned via userId field)

export const addExerciseEntry = async (
  userId: string,
  entry: Omit<ExerciseEntry, "id" | "userId" | "createdAt">
): Promise<string> => {
  const ref = await addDoc(collection(firestore, "exerciseLogs"), {
    ...entry,
    userId,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const deleteExerciseEntry = async (entryId: string): Promise<void> => {
  await deleteDoc(doc(firestore, "exerciseLogs", entryId));
};

export const getExerciseEntriesByDate = async (
  userId: string,
  date: string
): Promise<ExerciseEntry[]> => {
  const q = query(
    collection(firestore, "exerciseLogs"),
    where("userId", "==", userId),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() } as ExerciseEntry)
  );
  return entries.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
};

// ─── Weight Logs ─────────────────────────────────────────────────────────────
// Collection: weightLogs  (top-level, owned via userId field)

export const addWeightEntry = async (
  userId: string,
  entry: Omit<WeightEntry, "id" | "userId" | "createdAt">
): Promise<string> => {
  const ref = await addDoc(collection(firestore, "weightLogs"), {
    ...entry,
    userId,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const deleteWeightEntry = async (entryId: string): Promise<void> => {
  await deleteDoc(doc(firestore, "weightLogs", entryId));
};

export const getAllWeightEntries = async (
  userId: string
): Promise<WeightEntry[]> => {
  const q = query(
    collection(firestore, "weightLogs"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map((d) => {
    const data = d.data();
    // Normalise date: Firestore Timestamps, numbers, or other non-strings → "YYYY-MM-DD" string
    let date: string = "";
    if (typeof data.date === "string") {
      date = data.date;
    } else if (data.date?.toDate) {
      // Firestore Timestamp
      date = data.date.toDate().toISOString().split("T")[0];
    } else if (data.date) {
      date = String(data.date);
    }
    return { id: d.id, ...data, date } as WeightEntry;
  });
  return entries.sort((a, b) => a.date.localeCompare(b.date));
};
