import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AsyncStorage flag — once we've asked once, we don't ask again from our side.
 * (Apple's StoreKit also rate-limits SKStoreReviewController to ~3 prompts per
 * 365 days per user, system-wide, regardless of our flag.)
 */
const REVIEW_PROMPTED_KEY = "calpal_review_prompted_v1";

/**
 * Briefly fires the native App Store review sheet at a moment of delight.
 *
 * Apple's rules (App Store Review Guidelines + HIG):
 *  - Only ask after the user has experienced enough to form an opinion.
 *  - Don't interrupt critical flows.
 *  - Don't ask repeatedly — Apple system-enforces 3/year max but we ask once.
 *
 * We call this from the food-save success path, ONLY for scanned meals (the
 * AI-photo-analysis path is our core "wow" moment), and we delay so the modal
 * has time to close and the user can see their meal land on the diary first.
 */
export async function maybeRequestAppReview(opts: { wasScannedMeal: boolean }) {
  if (!opts.wasScannedMeal) return;

  try {
    const alreadyPrompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    if (alreadyPrompted === "1") return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    // Mark BEFORE asking so we don't double-fire if the call throws after
    // the sheet has already been shown.
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, "1");

    // Delay so the parent modal has time to dismiss and the diary updates
    // before the system review sheet appears on top.
    setTimeout(() => {
      StoreReview.requestReview().catch((err) => {
        console.warn("requestReview failed:", err);
      });
    }, 900);
  } catch (err) {
    console.warn("Review prompt orchestration failed:", err);
  }
}

/** Test helper — manually reset the prompted flag (dev menu / settings later). */
export async function resetReviewPromptFlag() {
  await AsyncStorage.removeItem(REVIEW_PROMPTED_KEY);
}
