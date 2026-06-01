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
  Alert,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { SocialAuthButtons } from "../../components/SocialAuthButtons";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // AuthContext listener handles navigation
    } catch (err: any) {
      const code = err?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Sign in failed. Please try again.");
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
          {/* Back */}
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your CalPal account</Text>

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
                placeholder="Your password"
                placeholderTextColor="#A0A0A0"
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSignIn}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <SocialAuthButtons mode="signin" />
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => router.replace("/(onboarding)/sign-up" as any)}
          >
            <Text style={styles.switchText}>
              Don't have an account?{" "}
              <Text style={styles.switchHighlight}>Create one</Text>
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
