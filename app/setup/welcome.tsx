import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const INK = "#0B0F14";
const INK_MUTED = "#5B6573";
const PRIMARY = "#0a7ea4";
const ACCENT_BG = "#F4F8FA";

export default function SetupWelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Image
            source={require("../../assets/images/transparent-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.eyebrow}>13 questions · 90 seconds</Text>
          <Text style={styles.title}>Let's build{"\n"}your plan</Text>
          <Text style={styles.subtitle}>
            A few questions so we can dial in your exact daily targets and
            the real reasons you want this. Not generic ones.
          </Text>
        </View>

        <View style={styles.steps}>
          <StepRow num="1" label="About you" desc="sex, age, height, weight" />
          <StepRow num="2" label="Your goal" desc="target weight, pace, activity" />
          <StepRow num="3" label="Your lifestyle" desc="diet, obstacles, motivations" />
        </View>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push("/setup/gender" as any)}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>Let's go</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.reassure}>
            <Ionicons name="lock-closed" size={11} color={INK_MUTED} /> Your answers are private and never shared.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepRow({ num, label, desc }: { num: string; label: string; desc: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  top: { alignItems: "center", gap: 10 },
  logo: { width: 56, height: 56, marginBottom: 8 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: INK,
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 320,
  },
  steps: { gap: 12 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: ACCENT_BG,
    borderRadius: 14,
    padding: 14,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  stepNum: { color: PRIMARY, fontWeight: "800", fontSize: 14 },
  stepLabel: { fontSize: 15, fontWeight: "700", color: INK },
  stepDesc: { fontSize: 13, color: INK_MUTED, marginTop: 1 },
  ctaWrap: { gap: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 17,
  },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  reassure: { fontSize: 12, color: INK_MUTED, textAlign: "center" },
});
