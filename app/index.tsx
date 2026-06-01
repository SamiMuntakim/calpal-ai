import { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  SafeAreaView,
} from "react-native";
import { Redirect, type Href } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { useSubscription } from "../hooks/useSubscription";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

export default function Home() {
  const { isLoading: authLoading, user, authReady } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { ready: subReady, isPremium } = useSubscription();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  useEffect(() => {
    // Hide the splash screen once we've determined auth state and Firebase is ready
    if (authReady && !authLoading && !profileLoading) {
      SplashScreen.hideAsync();
      setIsCheckingProfile(false);
    }
  }, [authReady, authLoading, profileLoading]);

  // Show loading until Firebase Auth AND RevenueCat have settled
  if (!authReady || authLoading || profileLoading || isCheckingProfile || (user && !subReady)) {
    // Show loading indicator while checking auth state and profile
    return (
      <SafeAreaView style={styles.container}>
        {/* Decorative background logos */}
        <Image
          source={require("../assets/images/transparent-logo.png")}
          style={[styles.decorativeLogo, styles.logoTopRight]}
          resizeMode="contain"
        />
        <Image
          source={require("../assets/images/transparent-logo.png")}
          style={[styles.decorativeLogo, styles.logoBottomLeft]}
          resizeMode="contain"
        />

        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  // Now Firebase Auth is ready, we can trust the user state
  // Redirect based on authentication status and profile completion
  if (user) {
    // Check if user needs onboarding
    // A user needs onboarding if:
    // 1. No profile exists, or
    // 2. Profile has the default name "User" (indicating it was just created with defaults)
    // 3. Profile name is empty
    const needsOnboarding =
      !profile || !profile.name || profile.name === "User";

    if (needsOnboarding) {
      console.log("User needs onboarding, redirecting to setup/welcome");
      return <Redirect href={"/setup/welcome" as Href} />;
    }

    // Subscription gate — must have an active Premium entitlement to use the app
    if (!isPremium) {
      console.log("User has no active subscription, redirecting to paywall");
      return <Redirect href={"/paywall" as Href} />;
    }

    console.log("User has completed onboarding and is subscribed, redirecting to tabs");
    return <Redirect href="/(tabs)" />;
  } else {
    // User is not logged in, redirect to onboarding
      return <Redirect href="/(onboarding)/welcome" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  // New styles for decorative logos
  decorativeLogo: {
    position: "absolute",
    opacity: 0.08,
    width: 120,
    height: 120,
  },
  logoTopRight: {
    top: 20,
    right: -30,
    transform: [{ rotate: "10deg" }],
  },
  logoBottomLeft: {
    bottom: 20,
    left: -30,
    transform: [{ rotate: "-10deg" }],
  },
});
