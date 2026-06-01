import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "../hooks/useAuth";
import {
  isAppleSignInAvailable,
  isAppleCancelled,
  isGoogleCancelled,
} from "../services/socialAuth";

type Props = {
  /** "signin" | "signup" — affects button copy ("Sign in with…" vs "Continue with…") */
  mode?: "signin" | "signup";
  /** Called when a successful sign-in started (the auth listener will navigate). */
  onStart?: () => void;
};

export function SocialAuthButtons({ mode = "signin", onStart }: Props) {
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const verb = mode === "signup" ? "Sign up" : "Sign in";

  const handleApple = async () => {
    setBusy("apple");
    try {
      onStart?.();
      await signInWithApple();
    } catch (err: any) {
      if (!isAppleCancelled(err)) {
        Alert.alert("Apple Sign-In failed", err?.message ?? "Please try again.");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setBusy("google");
    try {
      onStart?.();
      await signInWithGoogle();
    } catch (err: any) {
      if (!isGoogleCancelled(err)) {
        Alert.alert("Google Sign-In failed", err?.message ?? "Please try again.");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.line} />
      </View>

      {/* Apple — iOS only, must use the official-styled button */}
      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === "signup"
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleApple}
        />
      )}

      {/* Google */}
      <TouchableOpacity
        style={[styles.googleBtn, busy === "google" && { opacity: 0.7 }]}
        onPress={handleGoogle}
        disabled={busy !== null}
        activeOpacity={0.85}
      >
        {busy === "google" ? (
          <ActivityIndicator color="#1C1C1E" />
        ) : (
          <>
            <Image
              source={require("../assets/images/g-logo.png")}
              style={styles.gIcon}
              resizeMode="contain"
            />
            <Text style={styles.googleText}>{verb} with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, marginTop: 8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: "#E5E5EA" },
  dividerText: { fontSize: 13, color: "#8E8E93" },
  appleButton: { width: "100%", height: 50 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    height: 50,
  },
  gIcon: { width: 20, height: 20, marginRight: 2 },
  googleText: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
});
