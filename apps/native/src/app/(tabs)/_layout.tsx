import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PALETTE, BORDERS, FONTS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  // Ensure bottom padding accommodates Android 3-button navigation bars as well as iOS home indicator
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 8);
  const tabHeight = 58 + bottomPadding;

  const barBg = isDark ? PALETTE.darkStage : PALETTE.duskViolet;
  const barBorder = isDark ? PALETTE.darkBorder : "rgba(249, 245, 242, 0.4)";
  const activeColor = PALETTE.hiVisYellow;
  const inactiveColor = "rgba(249, 245, 242, 0.7)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: barBg,
          borderTopWidth: BORDERS.heavy,
          borderTopColor: barBorder,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 8,
          shadowColor: PALETTE.pureBlack,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          fontFamily: FONTS.mono,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-sharp" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-sharp" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: PALETTE.hiVisYellow,
                borderWidth: BORDERS.heavy,
                borderColor: PALETTE.pureBlack,
                justifyContent: "center",
                alignItems: "center",
                marginTop: Platform.OS === "ios" ? -18 : -22,
                shadowColor: PALETTE.pureBlack,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 5,
                elevation: 6,
              }}
            >
              <Ionicons name="qr-code" size={26} color={PALETTE.pureBlack} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-sharp" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
