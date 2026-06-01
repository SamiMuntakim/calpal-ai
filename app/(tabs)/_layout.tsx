import { Tabs, Redirect, type Href } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "@/components/HapticTab";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

const INK = "#0B0F14";
const INK_MUTED = "#94959B";

export default function TabLayout() {
  const { user, authReady } = useAuth();
  const { ready: subReady, isPremium } = useSubscription();

  // Subscription gate — anyone landing in /(tabs) without Premium goes back to paywall.
  if (authReady && user && subReady && !isPremium) {
    return <Redirect href={"/paywall" as Href} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: INK,
        tabBarInactiveTintColor: INK_MUTED,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: -0.1,
          marginTop: -2,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#F0F2F5",
          backgroundColor: "#fff",
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Diary",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
