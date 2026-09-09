import "@/global.css";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";

// Prevent auto-hiding until ready
SplashScreen.preventAutoHideAsync().catch(() => {});

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
import { authClient } from "@/lib/auth-client";
import { useStudentProfile } from "@/hooks/api/use-profile";
import {
  getCachedSession,
  getCachedProfile,
  saveCachedSession,
  saveCachedProfile,
  subscribeAuthCache,
  clearAllCachedAuth,
  type CachedSessionData,
  type CachedProfileData,
} from "@/lib/session-cache";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [cachedSession, setCachedSession] = useState<CachedSessionData | null>(null);
  const [cachedProfile, setCachedProfile] = useState<CachedProfileData | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: profile, isLoading: profilePending } = useStudentProfile();

  // Load offline cached session on app start
  useEffect(() => {
    async function loadCache() {
      const [s, p] = await Promise.all([getCachedSession(), getCachedProfile()]);
      setCachedSession(s);
      setCachedProfile(p);
      setCacheLoaded(true);
      SplashScreen.hideAsync().catch(() => {});
    }
    loadCache();

    // Fallback timer: ensure splash screen always hides within 1.5s
    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Listen for explicit sign out events across the app
  useEffect(() => {
    const unsubscribe = subscribeAuthCache(() => {
      setCachedSession(null);
      setCachedProfile(null);
      queryClient.clear();
      queryClient.cancelQueries();
      router.replace("/(auth)/sign-in");
    });
    return unsubscribe;
  }, [router]);

  // Update offline cache when fresh online data arrives, or clear on sign-out
  useEffect(() => {
    if (session) {
      saveCachedSession(session as any);
      setCachedSession(session as any);
    } else if (session === null && !sessionPending) {
      setCachedSession(null);
      setCachedProfile(null);
      saveCachedSession(null);
      saveCachedProfile(null);
      queryClient.clear();
    }
  }, [session, sessionPending]);

  useEffect(() => {
    if (profile) {
      saveCachedProfile(profile as any);
      setCachedProfile(profile as any);
    }
  }, [profile]);

  const effectiveSession = session || cachedSession;
  const effectiveUser = (session?.user || cachedSession?.user) as any;
  const effectiveProfile = profile || cachedProfile;

  const isPending = sessionPending || (effectiveUser?.role === "student" && profilePending);

  // If the server is unreachable, useSession might hang forever in isPending state.
  // We'll force a timeout after 3 seconds to fall back to offline cached session.
  useEffect(() => {
    if (sessionPending) {
      const timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionPending]);

  useEffect(() => {
    if (!cacheLoaded) return;
    if (isPending && !timeoutReached && !effectiveSession) return;

    const inAuthGroup = segments[0] === "(auth)";
    const path = segments.join("/");

    // If no session exists (neither online nor cached from a previous login)
    if (!effectiveSession) {
      if (!inAuthGroup) {
        router.replace("/(auth)/sign-in");
      }
      return;
    }

    if (effectiveUser) {
      if (effectiveUser.requiresPasswordChange && path !== "(auth)/reset-password") {
        router.replace("/(auth)/reset-password");
      } else if (
        !effectiveUser.requiresPasswordChange &&
        effectiveUser.role === "student" &&
        effectiveProfile &&
        !effectiveProfile.deviceBound &&
        path !== "(auth)/device-binding"
      ) {
        router.replace("/(auth)/device-binding");
      } else if (
        !effectiveUser.requiresPasswordChange &&
        (effectiveUser.role !== "student" || (effectiveProfile && effectiveProfile.deviceBound))
      ) {
        if (inAuthGroup) {
          router.replace("/(tabs)");
        }
      }
    } else if (!inAuthGroup) {
      router.replace("/(auth)/sign-in");
    }
  }, [
    cacheLoaded,
    effectiveSession,
    effectiveUser,
    effectiveProfile,
    isPending,
    timeoutReached,
    segments,
    router,
  ]);

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
