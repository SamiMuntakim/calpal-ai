import React, { createContext, useContext, useState, ReactNode } from "react";
import type { UserStats, NutritionGoals } from "../hooks/useProfile";

/** Soft / psychological data collected during onboarding. Influences the
 *  AI prompt and gives us context for future personalization. */
export type OnboardingMeta = {
  /** Dietary preference — feeds into macro split recommendations. */
  diet?:
    | "balanced"
    | "high_protein"
    | "vegetarian"
    | "vegan"
    | "low_carb"
    | "mediterranean";
  /** What's stopped them before — pain-point self-identification. */
  obstacles?: string[];
  /** Why this matters — identity priming. */
  motivations?: string[];
  /** How fast they want to move — slow/moderate/fast → 0.25/0.5/0.75 kg per week. */
  pace?: "slow" | "moderate" | "fast";
};

/** All the data we collect during the unauthenticated quiz flow, plus
 *  the nutrition goals we compute at the end of it. Saved to Firestore
 *  only after the user has authenticated and started their trial.
 */
export type PendingProfile = {
  name?: string;
  userStats?: UserStats;
  nutritionGoals?: NutritionGoals;
  meta?: OnboardingMeta;
};

type OnboardingContextType = {
  pending: PendingProfile;
  /** Merge new fields into the pending profile. */
  update: (patch: Partial<PendingProfile>) => void;
  /** Convenience: merge meta-only patches without losing other meta keys. */
  updateMeta: (patch: Partial<OnboardingMeta>) => void;
  /** Wipe everything (called after successful save to Firestore). */
  reset: () => void;
  /** True once we have name + userStats + nutritionGoals filled in. */
  isComplete: boolean;
};

const OnboardingContext = createContext<OnboardingContextType>({
  pending: {},
  update: () => {},
  updateMeta: () => {},
  reset: () => {},
  isComplete: false,
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingProfile>({});

  const update = (patch: Partial<PendingProfile>) => {
    setPending((prev) => ({ ...prev, ...patch }));
  };

  const updateMeta = (patch: Partial<OnboardingMeta>) => {
    setPending((prev) => ({
      ...prev,
      meta: { ...(prev.meta ?? {}), ...patch },
    }));
  };

  const reset = () => setPending({});

  const isComplete = !!(
    pending.name &&
    pending.userStats &&
    pending.nutritionGoals
  );

  return (
    <OnboardingContext.Provider
      value={{ pending, update, updateMeta, reset, isComplete }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
