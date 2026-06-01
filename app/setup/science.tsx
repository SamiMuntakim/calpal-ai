import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuestionLayout, TOKENS } from "../../components/QuestionLayout";
import { useOnboarding } from "../../contexts/OnboardingContext";

/**
 * Authority moment — borrows scientific credibility right before the
 * calculating reveal. Noom does this with their behavioural-science citation,
 * Cal AI does this with the Mifflin-St Jeor citation. Makes the AI's number
 * feel like it came from an expert, not a guess.
 */
export default function ScienceScreen() {
  const { pending } = useOnboarding();
  const name = pending.name ?? "";

  return (
    <QuestionLayout
      step={13}
      total={13}
      title={
        name
          ? `${name}, here's the science.`
          : "Here's the science behind your plan."
      }
      subtitle="So you know your targets aren't pulled out of thin air."
      canContinue={true}
      continueLabel="Build my plan"
      onContinue={() => router.push("/setup/calculating" as any)}
      scrollable
    >
      <View style={{ gap: 14 }}>
        <Pillar
          icon="calculator"
          colour="#0a7ea4"
          tint="#E6F3F8"
          title="Mifflin-St Jeor equation"
          body="The gold-standard formula for Basal Metabolic Rate (BMR), which is what your body burns at complete rest. Used by registered dietitians worldwide."
        />
        <Pillar
          icon="speedometer"
          colour="#F59E0B"
          tint="#FFF6E6"
          title="Activity-adjusted TDEE"
          body="Your BMR multiplied by an activity factor (1.2 to 1.9 depending on lifestyle) gives Total Daily Energy Expenditure, your real maintenance calories."
        />
        <Pillar
          icon="trending-down"
          colour="#22C55E"
          tint="#E8F8EE"
          title="Sustainable deficit / surplus"
          body="We apply a deficit or surplus that hits your goal at the pace you picked. Never below 1,200 kcal for safety, never extreme."
        />
        <Pillar
          icon="nutrition"
          colour="#FF6B6B"
          tint="#FFEEF0"
          title="Personalised macro split"
          body="Protein, carbs, and fats balanced to your goal type and dietary preference. Not a one-size-fits-all template."
        />

        <View style={styles.footnote}>
          <Ionicons name="shield-checkmark" size={14} color={TOKENS.INK_MUTED} />
          <Text style={styles.footnoteText}>
            Estimates only. Not medical advice. Always consult a qualified
            professional for medical decisions.
          </Text>
        </View>
      </View>
    </QuestionLayout>
  );
}

function Pillar({
  icon,
  colour,
  tint,
  title,
  body,
}: {
  icon: any;
  colour: string;
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.pillar}>
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={colour} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillar: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: TOKENS.BORDER,
    borderRadius: 14,
    backgroundColor: "#FAFAFB",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "800", color: TOKENS.INK },
  body: { fontSize: 12, color: TOKENS.INK_MUTED, lineHeight: 18, marginTop: 4 },
  footnote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    padding: 10,
  },
  footnoteText: { flex: 1, fontSize: 11, color: TOKENS.INK_MUTED, lineHeight: 15 },
});
