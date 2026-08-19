import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useUpdateCheck } from "@/lib/updates";

const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  useUpdateCheck();
  useEffect(() => {}, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <HeroUINativeProvider>
            <QueryClientProvider client={queryClient}>
              <StackLayout />
            </QueryClientProvider>
          </HeroUINativeProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
