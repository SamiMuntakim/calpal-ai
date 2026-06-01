import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { SocialAuthButtons } from "../../components/SocialAuthButtons";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    if (!email.trim() || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      // AuthContext listener navigates → index → setup/welcome
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Please choose a stronger password.");
      } else {
        setError("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your CalPal journey today</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="#A0A0A0"
                secureTextEntry
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#A0A0A0"
                secureTextEntry
                textContentType="newPassword"
                value={confirm}
                onChangeText={setConfirm}
                onSubmitEditing={handleSignUp}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <SocialAuthButtons mode="signup" />
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => router.replace("/(onboarding)/sign-in" as any)}
          >
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = "#0a7ea4";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: PRIMARY, fontWeight: "500" },
  title: { fontSize: 30, fontWeight: "800", color: "#1C1C1E", marginBottom: 6 },
  subtitle: { fontSize: 16, color: "#6E6E73", marginBottom: 32 },
  errorText: {
    backgroundColor: "#FFF0F0",
    color: "#FF3B30",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#1C1C1E" },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1C1C1E",
    backgroundColor: "#FAFAFA",
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  switchLink: { alignItems: "center", marginTop: 32 },
  switchText: { fontSize: 15, color: "#6E6E73" },
  switchHighlight: { color: PRIMARY, fontWeight: "600" },
});
