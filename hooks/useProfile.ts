import { useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { AuthContext } from "../contexts/AuthContext";
import { firestore } from "../services/firebaseConfig";

export interface UserStats {
  startingWeight: number;
  currentWeight: number;
  goalWeight: number;
  weeklyGoal: string;
  activityLevel: string;
  height: number;
  age: number;
  gender: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ProfileMeta {
  diet?: string;
  obstacles?: string[];
  motivations?: string[];
  pace?: "slow" | "moderate" | "fast";
}

export interface Profile {
  name: string;
  userStats?: UserStats;
  nutritionGoals?: NutritionGoals;
  meta?: ProfileMeta;
}

export function useProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Tracks which user the `profile` value above belongs to. If this is null
  // (or doesn't match the current user.id) we haven't fetched their data yet.
  const [profileForUserId, setProfileForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileForUserId(null);
      return;
    }

    const profileRef = doc(firestore, "users", user.id);
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as Profile);
        } else {
          setProfile(null);
        }
        setProfileForUserId(user.id);
      },
      (error) => {
        console.error("Profile listen error:", error);
        setProfile(null);
        setProfileForUserId(user.id);
      }
    );

    return unsubscribe;
  }, [user?.id]);

  // Synchronously derived: we are "loading" any time we have a signed-in
  // user whose profile hasn't been fetched yet. Critically this is computed
  // from state that updates IN THE SAME RENDER as user.id changing, so the
  // routing logic in app/index.tsx never sees a (user, loading=false, profile=null)
  // tuple between an auth restore and the first Firestore response.
  const loading = !!user && profileForUserId !== user.id;

  // Don't return a stale profile that belongs to a different user
  return { profile: loading ? null : profile, loading };
}
