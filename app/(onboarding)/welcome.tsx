import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const SURFACE = "#FFFFFF";
const PRIMARY = "#0a7ea4";
const ACCENT_BG = "#F4F8FA";

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/images/transparent-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brand}>CalPal</Text>
          </View>

          <Text style={styles.headline}>
            Hit your goal weight{"\n"}
            <Text style={styles.headlineAccent}>without counting a thing.</Text>
          </Text>

          <Text style={styles.sub}>
            Snap a photo of your meal. We do the maths. You get the body you want.
          </Text>
        </View>

        {/* The "money shot" — a real, designed proof card. Not a bullet list. */}
        <View style={styles.proofCard}>
          <View style={styles.proofTop}>
            <View style={styles.proofBadge}>
              <Ionicons name="sparkles" size={12} color={PRIMARY} />
              <Text style={styles.proofBadgeText}>AI Estimate</Text>
            </View>
            <Text style={styles.proofTimestamp}>just now</Text>
          </View>
          <Text style={styles.proofMeal}>Grilled chicken bowl</Text>
          <View style={styles.proofMacros}>
            <ProofMacro value="612" label="kcal" />
            <ProofMacro value="48g" label="protein" />
            <ProofMacro value="54g" label="carbs" />
            <ProofMacro value="18g" label="fats" />
          </View>
          <View style={styles.proofFooter}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.proofFooterText}>
              Logged in 1.2 seconds. No scales, no databases.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push("/setup/welcome" as any)}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Build My Plan</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(onboarding)/sign-in" as any)}
          hitSlop={12}
        >
          <Text style={styles.signInLink}>
            Already have an account?{" "}
            <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProofMacro({ value, label }: { value: string; label: string }) {
  return (
    <View style={macroStyles.box}>
      <Text style={macroStyles.value}>{value}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", gap: 2 },
  value: { fontSize: 18, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  label: { fontSize: 11, color: INK_MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },

  hero: { gap: 16, marginTop: 24, marginBottom: 32 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 28, height: 28 },
  brand: { fontSize: 17, fontWeight: "700", color: INK, letterSpacing: -0.3 },
  headline: {
    fontSize: 38,
    fontWeight: "800",
    color: INK,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headlineAccent: { color: PRIMARY },
  sub: {
    fontSize: 17,
    color: INK_MUTED,
    lineHeight: 24,
    letterSpacing: -0.2,
  },

  proofCard: {
    backgroundColor: ACCENT_BG,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    marginBottom: 24,
  },
  proofTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proofBadgeText: { fontSize: 11, fontWeight: "700", color: PRIMARY, letterSpacing: 0.2 },
  proofTimestamp: { fontSize: 11, color: INK_MUTED },
  proofMeal: { fontSize: 19, fontWeight: "700", color: INK, letterSpacing: -0.3 },
  proofMacros: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
  },
  proofFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  proofFooterText: { fontSize: 12, color: INK_MUTED, flex: 1 },

  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 17,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  signInLink: { fontSize: 14, color: INK_MUTED, textAlign: "center" },
  signInBold: { color: INK, fontWeight: "700" },
});
