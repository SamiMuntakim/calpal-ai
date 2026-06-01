import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesError,
} from "react-native-purchases";
import {
  configureRevenueCat,
  RC_ENTITLEMENTS,
  RC_OFFERINGS,
  validateRevenueCatConfig,
} from "../services/revenueCatConfig";
import { useAuth } from "../hooks/useAuth";

type PurchaseResult = { ok: true } | { ok: false; userCancelled: boolean; message: string };

type SubscriptionContextType = {
  /** True once we have made our first determination of subscription state. */
  ready: boolean;
  /** True while a network call is in flight (configure / login / restore / refresh). */
  loading: boolean;
  /** Latest CustomerInfo from RevenueCat. */
  customerInfo: CustomerInfo | null;
  /** Active offering (set of packages). */
  offering: PurchasesOffering | null;
  /** Convenience: true if the Premium entitlement is currently active. */
  isPremium: boolean;
  /** Purchase a package. */
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  /** Restore Apple/Google purchases for the signed-in account. */
  restore: () => Promise<PurchaseResult>;
  /** Manually re-fetch CustomerInfo and offerings. */
  refresh: () => Promise<void>;
};

export const SubscriptionContext = createContext<SubscriptionContextType>({
  ready: false,
  loading: false,
  customerInfo: null,
  offering: null,
  isPremium: false,
  purchase: async () => ({ ok: false, userCancelled: false, message: "Not initialised" }),
  restore: async () => ({ ok: false, userCancelled: false, message: "Not initialised" }),
  refresh: async () => {},
});

function checkEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return info.entitlements.active[RC_ENTITLEMENTS.PREMIUM] !== undefined;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const isPremium = checkEntitlement(customerInfo);

  const configuredRef = useRef(false);
  const currentRcUserRef = useRef<string | null>(null);

  // ─── One-time RevenueCat configuration ───────────────────────────────────
  useEffect(() => {
    if (configuredRef.current) return;
    if (!validateRevenueCatConfig()) {
      // No keys configured — skip silently. Routing logic will see ready=true,
      // isPremium=false → paywall will appear so the user can at least see the page.
      configuredRef.current = true;
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const ok = await configureRevenueCat();
      if (cancelled) return;
      configuredRef.current = ok;
      // Attach listener so external purchase / restore / subscription changes
      // propagate into React state.
      Purchases.addCustomerInfoUpdateListener((info) => {
        setCustomerInfo(info);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Sync RC identity with Firebase auth user ────────────────────────────
  // When the signed-in user changes, log them in to RevenueCat with their UID
  // so existing purchases on this account/Apple-ID are restored automatically.
  useEffect(() => {
    if (!authReady || !configuredRef.current) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (user) {
          if (currentRcUserRef.current !== user.id) {
            const { customerInfo: info } = await Purchases.logIn(user.id);
            if (cancelled) return;
            currentRcUserRef.current = user.id;
            setCustomerInfo(info);
          } else {
            // Same user — just refresh
            const info = await Purchases.getCustomerInfo();
            if (cancelled) return;
            setCustomerInfo(info);
          }
        } else {
          // Signed out — log RC out so the next user starts clean
          if (currentRcUserRef.current != null) {
            try {
              await Purchases.logOut();
            } catch {
              /* swallow — already anonymous etc. */
            }
            currentRcUserRef.current = null;
          }
          setCustomerInfo(null);
        }

        // Always refresh offerings after identity changes
        try {
          const offerings = await Purchases.getOfferings();
          if (cancelled) return;
          // Prefer the configured default offering id; fall back to current
          const selected =
            (offerings.all && offerings.all[RC_OFFERINGS.DEFAULT]) ||
            offerings.current ||
            null;
          setOffering(selected);
        } catch (err) {
          console.warn("Failed to fetch RevenueCat offerings:", err);
        }
      } catch (err) {
        console.warn("RevenueCat identity sync failed:", err);
      } finally {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
    setLoading(true);
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return { ok: true };
    } catch (err: any) {
      const e = err as PurchasesError;
      const userCancelled = (err as any)?.userCancelled === true;
      const message = userCancelled
        ? "Purchase cancelled."
        : e?.message ?? "Purchase failed. Please try again.";
      return { ok: false, userCancelled, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    setLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const hasPremium = checkEntitlement(info);
      if (!hasPremium) {
        return {
          ok: false,
          userCancelled: false,
          message:
            "No active subscription found for this " +
            (Platform.OS === "ios" ? "Apple ID" : "Google account") +
            ".",
        };
      }
      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        userCancelled: false,
        message: err?.message ?? "Restore failed. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!configuredRef.current) return;
    setLoading(true);
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      const offerings = await Purchases.getOfferings();
      const selected =
        (offerings.all && offerings.all[RC_OFFERINGS.DEFAULT]) ||
        offerings.current ||
        null;
      setOffering(selected);
    } catch (err) {
      console.warn("RevenueCat refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{ ready, loading, customerInfo, offering, isPremium, purchase, restore, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
