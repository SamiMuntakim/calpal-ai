import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { setupForegroundHandler } from '@/services/notificationsService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Configure how notifications render when the app is in the foreground
setupForegroundHandler();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <OnboardingProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="setup" options={{ headerShown: false }} />
            <Stack.Screen name="paywall" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="notification-settings" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="food" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        </OnboardingProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
