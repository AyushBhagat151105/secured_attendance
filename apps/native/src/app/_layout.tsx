import "@/global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";

// Prevent auto-hiding until ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Global network request logging for ADB logcat debugging
if (typeof globalThis !== "undefined" && (globalThis as any).fetch) {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (input: any, init: any) => {
    const url = typeof input === "string" ? input : input?.url || input?.toString();
    const method = init?.method || "GET";
    console.log(`🌐 [Fetch Request] ${method} ${url}`);
    try {
      const response = await originalFetch(input, init);
      console.log(`✅ [Fetch Response] ${response.status} ${url}`);
      return response;
    } catch (err: any) {
      console.log(`❌ [Fetch Network Error] ${url}: ${err?.message}`);
      throw err;
    }
  };
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useUpdateCheck } from "@/lib/updates";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        const status = error?.response?.status || error?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

import { useRouter, useSegments } from "expo-router";
import { useSessionGate } from "@/hooks/use-session-gate";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { status } = useSessionGate();

  const inAuthGroup = segments[0] === "(auth)";
  const path = segments.join("/");

  useEffect(() => {
    switch (status) {
      case "LOADING":
        break;
      case "UNAUTHENTICATED":
        if (!inAuthGroup) {
          router.replace("/(auth)/sign-in");
        }
        break;
      case "PASSWORD_CHANGE_REQUIRED":
        if (path !== "(auth)/reset-password") {
          router.replace("/(auth)/reset-password");
        }
        break;
      case "DEVICE_BINDING_REQUIRED":
        if (path !== "(auth)/device-binding") {
          router.replace("/(auth)/device-binding");
        }
        break;
      case "DEVICE_MISMATCH":
        if (path !== "(auth)/device-mismatch") {
          router.replace("/(auth)/device-mismatch" as any);
        }
        break;
      case "AUTHORIZED":
        if (path === "(auth)/sign-in") {
          router.replace("/(tabs)");
        }
        break;
    }
  }, [status, path, inAuthGroup, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="modal"
        options={{ title: "Modal", presentation: "modal", headerShown: true }}
      />
    </Stack>
  );
}

export default function Layout() {
  useUpdateCheck();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <QueryClientProvider client={queryClient}>
            <StackLayout />
          </QueryClientProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
