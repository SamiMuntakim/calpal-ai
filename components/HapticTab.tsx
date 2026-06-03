import * as Haptics from 'expo-haptics';
import { Platform, Pressable, type PressableProps } from 'react-native';

// Minimal tab button compatible with expo-router's Tabs `tabBarButton` prop.
// Replaces the previous @react-navigation/elements PlatformPressable usage,
// which is no longer compatible with expo-router as of SDK 56.
export function HapticTab(props: PressableProps) {
  return (
    <Pressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Soft haptic feedback on tab press (iOS only)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
