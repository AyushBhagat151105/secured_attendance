import "@/global.css";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useUpdateCheck } from "@/lib/updates";

const queryClient = new QueryClient();

import { useRouter, useSegments } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { useStudentProfile } from "@/hooks/use-profile";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [timeoutReached, setTimeoutReached] = useState(false);
  
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: profile, isLoading: profilePending } = useStudentProfile();

  const user = session?.user as any;
  const isPending = sessionPending || (user?.role === "student" && profilePending);

  // If the server is unreachable, useSession might hang forever in isPending state.
  // We'll force a timeout after 5 seconds to prevent the app from hanging.
  useEffect(() => {
    if (sessionPending) {
      const timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionPending]);

  useEffect(() => {
    if (isPending && !timeoutReached) return;

    const inAuthGroup = segments[0] === "(auth)";
    const path = segments.join("/");

    // If session is null (or we timed out trying to reach the server)
    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace("/(auth)/sign-in" as any);
    } else if (session) {
      if (user.requiresPasswordChange && path !== "(auth)/reset-password") {
        router.replace("/(auth)/reset-password" as any);
      } else if (!user.requiresPasswordChange && user.role === "student" && profile && !profile.deviceBound && path !== "(auth)/device-bind") {
        router.replace("/(auth)/device-bind" as any);
      } else if (!user.requiresPasswordChange && (user.role !== "student" || (profile && profile.deviceBound))) {
        if (inAuthGroup) {
          router.replace("/(tabs)" as any);
        }
      }
    }
  }, [session, profile, isPending, timeoutReached, segments, router, user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal", headerShown: true }} />
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
