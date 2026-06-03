import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlurTabBarBackground() {
  return (
    <BlurView
      // System chrome material automatically adapts to the system's theme
      // and matches the native tab bar appearance on iOS.
      tint="systemChromeMaterial"
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

// useBottomTabBarHeight is no longer available from expo-router as of SDK 56.
// This hook is only consumed by ParallaxScrollView (currently unused in the
// app). We fall back to the safe-area bottom inset so any future consumer
// still gets a reasonable value.
export function useBottomTabOverflow() {
  const { bottom } = useSafeAreaInsets();
  return bottom;
}
