import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import { useSubscription } from "../hooks/useSubscription";
import { useAuth } from "../hooks/useAuth";
import { useOnboarding } from "../contexts/OnboardingContext";
import { saveProfile } from "../services/firestoreService";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import * as Haptics from "expo-haptics";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const PRIMARY = "#0a7ea4";
const ACCENT = "#FFB800";
const SURFACE_ALT = "#F4F8FA";

// ─── Trial-aware package formatter ────────────────────────────────────────────

type DisplayPackage = {
  pkg: PurchasesPackage;
  title: string;
  priceLabel: string;
  perMonthLabel?: string;
  savingsBadge?: string;
  popular?: boolean;
  hasTrial: boolean;
  trialDays: number;
};

function periodToDays(unit?: string, num?: number): number {
  if (!unit || !num) return 0;
  switch (unit.toUpperCase()) {
    case "DAY":
      return num;
    case "WEEK":
      return num * 7;
    case "MONTH":
      return num * 30;
    case "YEAR":
      return num * 365;
    default:
      return 0;
  }
}

function formatPackages(packages: PurchasesPackage[]): DisplayPackage[] {
  const monthly = packages.find((p) => p.packageType === "MONTHLY");
  const monthlyPrice = monthly?.product.price;

  return packages
    .filter((p) => p.packageType === "MONTHLY" || p.packageType === "ANNUAL")
    .map((p) => {
      const isAnnual = p.packageType === "ANNUAL";
      const intro = (p.product as any).introPrice;
      const hasTrial = !!intro && intro.price === 0;
      const trialDays = hasTrial
        ? periodToDays(intro.periodUnit, intro.periodNumberOfUnits)
        : 0;

      let title = isAnnual ? "Annual" : "Monthly";
      let priceLabel = isAnnual
        ? `${p.product.priceString} / year`
        : `${p.product.priceString} / month`;
      let perMonthLabel: string | undefined;
      let savingsBadge: string | undefined;

      if (isAnnual) {
        const monthlyEquivalent = p.product.price / 12;
        perMonthLabel = `Just ${p.product.currencyCode} ${monthlyEquivalent.toFixed(2)}/mo`;
        if (monthlyPrice && monthlyPrice > 0) {
          const yearlyAtMonthly = monthlyPrice * 12;
          const savings = Math.round(((yearlyAtMonthly - p.product.price) / yearlyAtMonthly) * 100);
          if (savings > 0) savingsBadge = `Save ${savings}%`;
        }
      }

      return {
        pkg: p,
        title,
        priceLabel,
        perMonthLabel,
        savingsBadge,
        popular: isAnnual,
        hasTrial,
        trialDays,
      };
    })
    .sort((a, b) => (a.pkg.packageType === "ANNUAL" ? -1 : 1));
}

function formatChargeDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { offering, loading, isPremium, purchase, restore, refresh } = useSubscription();
  const { user, signOut, bypassNextAuthNavigation } = useAuth();
  const { pending, reset: resetOnboarding } = useOnboarding();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  // We keep a stable ref to `pending` so the commit effect can read fresh
  // OnboardingContext data without re-firing whenever the user types in
  // a setup screen earlier in the funnel.
  const pendingRef = useRef(pending);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  // Ensures commit-and-navigate runs at most once per paywall mount.
  const hasCommittedRef = useRef(false);

  // Whenever the AuthSheet opens, tell AuthContext to skip its next
  // auto-navigation. We'll route manually after the purchase resolves.
  useEffect(() => {
    if (showAuthSheet) bypassNextAuthNavigation();
  }, [showAuthSheet, bypassNextAuthNavigation]);

  // Once the AuthSheet has produced a Firebase user, close the sheet and
  // kick off the purchase. The commit + navigation happens via the
  // isPremium effect below once the purchase completes.
  useEffect(() => {
    if (showAuthSheet && user) {
      setShowAuthSheet(false);
      const t = setTimeout(() => { runPurchase(); }, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAuthSheet, user]);

  const displayPackages = useMemo(
    () => (offering?.availablePackages ? formatPackages(offering.availablePackages) : []),
    [offering]
  );

  const selectedPkg = displayPackages.find((dp) => dp.pkg.identifier === selectedId);
  const hasTrial = selectedPkg?.hasTrial ?? false;
  const trialDays = selectedPkg?.trialDays ?? 7;

  // Default-select the annual package
  useEffect(() => {
    if (!selectedId && displayPackages.length > 0) {
      setSelectedId(displayPackages[0].pkg.identifier);
    }
  }, [displayPackages, selectedId]);

  /**
   * SINGLE SOURCE for "user is paid up, send them into the app."
   *
   * Fires when:
   *  • Returning subscriber lands on paywall with isPremium already true
   *  • New purchase completes (isPremium flips false → true)
   *  • Restore Purchases succeeds (same)
   *
   * It saves any OnboardingContext data to Firestore BEFORE navigating so
   * the dashboard always finds a profile, breaking the previous loop where
   * isPremium navigated to /(tabs) without persisting the pending setup.
   */
  useEffect(() => {
    if (!isPremium || !user || hasCommittedRef.current) return;
    hasCommittedRef.current = true;

    // The "you're in" moment — Apple Pay-style success haptic.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );

    const commit = async () => {
      const p = pendingRef.current;
      try {
        if (p.name || p.userStats || p.nutritionGoals || p.meta) {
          await saveProfile(user.id, {
            name: p.name ?? "User",
            ...(p.userStats ? { userStats: p.userStats } : {}),
            ...(p.nutritionGoals ? { nutritionGoals: p.nutritionGoals } : {}),
            // Persist the psychological data (diet/obstacles/motivations/pace)
            // so it informs future AI feedback and edit screens can pre-fill.
            ...(p.meta ? { meta: p.meta } : {}),
          });
        }
      } catch (err) {
        console.warn("Profile save failed (will recover later):", err);
        // Unblock the user — they're paid, they get in. useProfile will
        // surface the empty profile on next launch if save genuinely didn't
        // make it.
      }
      // Navigate FIRST, reset OnboardingContext AFTER. Reversing this order
      // would let prior setup screens' useEffect guards (plan-reveal,
      // calculating) re-fire on the now-empty `pending` and race with this
      // navigation — landing the user back on /setup/welcome.
      router.replace("/(tabs)");
      setTimeout(() => resetOnboarding(), 250);
    };
    commit();
  }, [isPremium, user, resetOnboarding]);

  /** Run the actual RevenueCat purchase. Navigation is handled by the
   *  isPremium effect once customerInfo updates. */
  const runPurchase = async () => {
    if (!selectedPkg) return;
    setWorking(true);
    const result = await purchase(selectedPkg.pkg);
    setWorking(false);

    if (!result.ok && !result.userCancelled) {
      Alert.alert("Purchase failed", result.message);
    }
    // Success path: customerInfo updates → isPremium becomes true →
    // the commit useEffect above takes over.
  };

  /** Tapped the main CTA. Branch: auth first if needed, else purchase. */
  const handlePrimaryCTA = () => {
    if (!selectedPkg) {
      Alert.alert("Pick a plan", "Choose monthly or annual to continue.");
      return;
    }
    // Medium impact at the commitment moment. Apple's HIG calls this the
    // tactile confirm Apple Pay uses. Premium feel without being intrusive.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!user) {
      setShowAuthSheet(true);
    } else {
      runPurchase();
    }
  };

  /** When the auth sheet successfully creates a Firebase user, run purchase. */
  const handleAuthSuccess = () => {
    setShowAuthSheet(false);
    // Give the auth state a beat to settle so `user` is populated when runPurchase fires
    setTimeout(() => runPurchase(), 250);
  };

  const handleRestore = async () => {
    setWorking(true);
    const result = await restore();
    setWorking(false);
    if (!result.ok) {
      Alert.alert("Restore Purchases", result.message);
    }
    // Success path: customerInfo updates → isPremium effect commits + navigates.
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Sign out of your CalPal account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try { await signOut(); } catch {}
        },
      },
    ]);
  };

  const showNoOfferings = !loading && !offering;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top eyebrow + headline */}
        <View style={styles.head}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="sparkles" size={12} color={PRIMARY} />
            <Text style={styles.eyebrow}>
              {hasTrial ? `${trialDays}-DAY FREE TRIAL` : "PREMIUM"}
            </Text>
          </View>
          <Text style={styles.title}>
            {hasTrial
              ? `Get the full plan,${"\n"}free for ${trialDays} days.`
              : `Unlock your full plan.`}
          </Text>
          <Text style={styles.subtitle}>
            {hasTrial
              ? "Cancel anytime in App Store settings. No charge today."
              : "Get unlimited access to every CalPal feature."}
          </Text>
        </View>

        {/* Trial timeline (only when trial is on) */}
        {hasTrial && (
          <View style={styles.timeline}>
            <TimelineDot
              icon="lock-open"
              title="Today"
              desc="Full access unlocks"
              active
            />
            <TimelineLine />
            <TimelineDot
              icon="notifications"
              title={`Day ${Math.max(trialDays - 2, 1)}`}
              desc="We'll remind you"
            />
            <TimelineLine />
            <TimelineDot
              icon="card"
              title={`Day ${trialDays}`}
              desc={`Charged ${formatChargeDate(trialDays)}`}
            />
          </View>
        )}

        {/* Plans */}
        {loading && displayPackages.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        ) : showNoOfferings ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Couldn't load plans</Text>
            <Text style={styles.errorText}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.plans}>
            {displayPackages.map((dp) => {
              const selected = selectedId === dp.pkg.identifier;
              return (
                <TouchableOpacity
                  key={dp.pkg.identifier}
                  style={[styles.planCard, selected && styles.planCardActive]}
                  onPress={() => setSelectedId(dp.pkg.identifier)}
                  activeOpacity={0.85}
                >
                  {dp.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View style={styles.radio}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.planTitleRow}>
                        <Text style={styles.planTitle}>{dp.title}</Text>
                        {dp.savingsBadge && (
                          <View style={styles.savingsBadge}>
                            <Text style={styles.savingsBadgeText}>{dp.savingsBadge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planPrice}>{dp.priceLabel}</Text>
                      {dp.perMonthLabel && (
                        <Text style={styles.planPerMonth}>{dp.perMonthLabel}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Features included */}
        <View style={styles.features}>
          {[
            "Unlimited AI food photo scans",
            "Personalised calorie & macro targets",
            "Weight trends with AI feedback",
            "Exercise calorie estimation",
            "All future Premium features",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Legal — Apple Guideline 3.1.2(a) required disclosure */}
        <Text style={styles.legalText}>
          <Text style={styles.legalStrong}>CalPal Premium</Text>{" "}
          {hasTrial
            ? `is free for ${trialDays} days, then automatically renews at ${selectedPkg?.priceLabel}. `
            : `is an auto-renewing subscription. `}
          Payment is charged to your Apple ID at the end of the trial.
          The subscription renews automatically at the same price and duration
          unless cancelled at least 24 hours before the end of the current
          period. Cancel anytime in your iPhone Settings → Apple ID →
          Subscriptions.
          {"\n\n"}
          By continuing you agree to our{" "}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://calpal.site/tos/")}
          >
            Terms of Use
          </Text>{" "}
          and{" "}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://calpal.site/privacy-policy/")}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.cta, (working || !selectedPkg) && styles.ctaDisabled]}
          onPress={handlePrimaryCTA}
          disabled={working || !selectedPkg}
          activeOpacity={0.9}
        >
          {working ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              {hasTrial ? `Start ${trialDays}-day free trial` : "Subscribe"}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.ctaSubtext}>
          {hasTrial ? "$0.00 today · cancel anytime" : "Secure payment via App Store"}
        </Text>

        {/* Less-prominent secondary actions */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity onPress={handleRestore} disabled={working} hitSlop={8}>
            <Text style={styles.secondaryLink}>Restore Purchases</Text>
          </TouchableOpacity>
          {user && (
            <>
              <Text style={styles.secondaryDot}>·</Text>
              <TouchableOpacity onPress={handleSignOut} disabled={working} hitSlop={8}>
                <Text style={styles.secondaryLink}>Sign out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Auth sheet — appears the moment user taps "Start trial" if they're not yet signed in */}
      <AuthSheet
        visible={showAuthSheet}
        trialDays={trialDays}
        hasTrial={hasTrial}
        onClose={() => setShowAuthSheet(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </SafeAreaView>
  );
}

// ─── Trial timeline ──────────────────────────────────────────────────────────

function TimelineDot({
  icon, title, desc, active,
}: {
  icon: any; title: string; desc: string; active?: boolean;
}) {
  return (
    <View style={timeline.dotWrap}>
      <View style={[timeline.dotIcon, active && timeline.dotIconActive]}>
        <Ionicons name={icon} size={14} color={active ? "#fff" : PRIMARY} />
      </View>
      <Text style={[timeline.title, active && timeline.titleActive]}>{title}</Text>
      <Text style={timeline.desc}>{desc}</Text>
    </View>
  );
}
function TimelineLine() {
  return <View style={timeline.line} />;
}

const timeline = StyleSheet.create({
  dotWrap: { flex: 1, alignItems: "center", gap: 4 },
  dotIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  dotIconActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  title: { fontSize: 11, fontWeight: "700", color: INK_MUTED },
  titleActive: { color: INK },
  desc: { fontSize: 10, color: INK_MUTED, textAlign: "center", marginTop: -2 },
  line: { height: 1, flex: 0.5, backgroundColor: "#E5E8EC", marginTop: 16 },
});

// ─── Auth sheet ──────────────────────────────────────────────────────────────

function AuthSheet({
  visible, trialDays, hasTrial, onClose, onAuthSuccess,
}: {
  visible: boolean;
  trialDays: number;
  hasTrial: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}) {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"choice" | "email">("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setMode("choice");
    setEmail("");
    setPassword("");
    setError("");
    setBusy(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleEmailContinue = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Try sign-up first; if account exists, fall back to sign-in
      try {
        await signUp(email.trim(), password);
      } catch (err: any) {
        if (err?.code === "auth/email-already-in-use") {
          await signIn(email.trim(), password);
        } else {
          throw err;
        }
      }
      reset();
      onAuthSuccess();
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Incorrect password for this email.");
      } else if (code === "auth/invalid-email") {
        setError("That doesn't look like a valid email.");
      } else if (code === "auth/weak-password") {
        setError("Pick a stronger password (6+ chars).");
      } else {
        setError("Couldn't continue. Please try again.");
      }
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={authSheet.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={authSheet.header}>
            <View style={{ width: 60 }} />
            <View style={authSheet.handle} />
            <TouchableOpacity onPress={handleClose} hitSlop={12} style={authSheet.closeBtn}>
              <Ionicons name="close" size={22} color={INK_MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={authSheet.content} keyboardShouldPersistTaps="handled">
            <View style={authSheet.head}>
              <Text style={authSheet.title}>
                {mode === "choice" ? "One step left" : "Continue with email"}
              </Text>
              <Text style={authSheet.subtitle}>
                {hasTrial
                  ? `Create your account to start your ${trialDays}-day free trial. $0.00 today.`
                  : `Create your account to continue.`}
              </Text>
            </View>

            {mode === "choice" ? (
              <View style={authSheet.choices}>
                <SocialAuthButtons mode="signup" onStart={onAuthSuccess} />
                <View style={authSheet.dividerRow}>
                  <View style={authSheet.dividerLine} />
                  <Text style={authSheet.dividerText}>or</Text>
                  <View style={authSheet.dividerLine} />
                </View>
                <TouchableOpacity
                  style={authSheet.emailBtn}
                  onPress={() => setMode("email")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mail" size={18} color={INK} />
                  <Text style={authSheet.emailBtnText}>Continue with Email</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={authSheet.form}>
                {error ? <Text style={authSheet.error}>{error}</Text> : null}

                <View style={authSheet.field}>
                  <Text style={authSheet.label}>Email</Text>
                  <TextInput
                    style={authSheet.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#A0A8B3"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(""); }}
                  />
                </View>
                <View style={authSheet.field}>
                  <Text style={authSheet.label}>Password</Text>
                  <TextInput
                    style={authSheet.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#A0A8B3"
                    secureTextEntry
                    textContentType="newPassword"
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(""); }}
                    onSubmitEditing={handleEmailContinue}
                  />
                </View>

                <TouchableOpacity
                  style={[authSheet.continueBtn, busy && { opacity: 0.6 }]}
                  onPress={handleEmailContinue}
                  disabled={busy}
                  activeOpacity={0.9}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={authSheet.continueBtnText}>
                      {hasTrial ? `Start ${trialDays}-day free trial` : "Continue"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { reset(); setMode("choice"); }} hitSlop={10}>
                  <Text style={authSheet.backLink}>← Back to all sign-in options</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const authSheet = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E8EC" },
  closeBtn: { padding: 8, width: 60, alignItems: "flex-end" },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 24 },
  head: { gap: 6 },
  title: { fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, color: INK_MUTED, lineHeight: 21 },
  choices: { gap: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E8EC" },
  dividerText: { fontSize: 12, color: INK_MUTED },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E5E8EC",
    borderRadius: 12,
    paddingVertical: 14,
  },
  emailBtnText: { fontSize: 16, fontWeight: "600", color: INK },
  form: { gap: 16 },
  error: { backgroundColor: "#FFF0F0", color: "#D70015", padding: 12, borderRadius: 10, fontSize: 13 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: INK_MUTED },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E8EC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: INK,
    backgroundColor: "#F8FAFB",
  },
  continueBtn: {
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backLink: { fontSize: 14, color: INK_MUTED, textAlign: "center", marginTop: 4 },
});

// ─── Main paywall styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 20 },

  head: { gap: 8 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: PRIMARY, letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: "800", color: INK, letterSpacing: -1, lineHeight: 38 },
  subtitle: { fontSize: 15, color: INK_MUTED, lineHeight: 22 },

  timeline: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: SURFACE_ALT,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },

  plans: { gap: 10 },
  planCard: {
    borderWidth: 2,
    borderColor: "#E5E8EC",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff",
    position: "relative",
  },
  planCardActive: { borderColor: INK, backgroundColor: SURFACE_ALT },
  planRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: INK },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planTitle: { fontSize: 17, fontWeight: "700", color: INK, letterSpacing: -0.3 },
  planPrice: { fontSize: 14, color: INK, marginTop: 2, fontWeight: "500" },
  planPerMonth: { fontSize: 12, color: INK_MUTED, marginTop: 2 },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  popularBadgeText: { fontSize: 10, fontWeight: "800", color: INK, letterSpacing: 0.5 },
  savingsBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800", letterSpacing: 0.3 },

  features: { gap: 10, paddingHorizontal: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { flex: 1, fontSize: 14, color: INK },

  loadingBox: { padding: 24, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 14, color: INK_MUTED },
  errorBox: { padding: 18, backgroundColor: "#FFF8E8", borderRadius: 12, gap: 10, alignItems: "center" },
  errorTitle: { fontSize: 15, fontWeight: "700", color: INK },
  errorText: { fontSize: 13, color: INK_MUTED, textAlign: "center" },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 8, backgroundColor: INK, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },

  legalText: { fontSize: 11, color: INK_MUTED, lineHeight: 16, textAlign: "center" },
  legalStrong: { color: INK, fontWeight: "700" },
  legalLink: { color: INK, textDecorationLine: "underline" },

  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
    gap: 8,
  },
  cta: {
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  ctaSubtext: { fontSize: 12, color: INK_MUTED, textAlign: "center" },

  secondaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  secondaryLink: { fontSize: 13, color: INK_MUTED, fontWeight: "500" },
  secondaryDot: { color: "#C7C7CC", fontSize: 13 },
});
