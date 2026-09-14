import { useState, useEffect, useMemo } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useStudentProfile } from "@/hooks/api/use-profile";
import { getDeviceFingerprint } from "@/lib/device";
import {
  getCachedSession,
  getCachedProfile,
  saveCachedSession,
  saveCachedProfile,
  subscribeAuthCache,
  type CachedSessionData,
  type CachedProfileData,
  type CachedUser,
} from "@/lib/session-cache";
import {
  resolveSessionGateStatus,
  type SessionGateStatus,
  type SessionGateResult,
} from "@/lib/session-gate";

export {
  resolveSessionGateStatus,
  type SessionGateStatus,
  type SessionGateResult,
};

export function useSessionGate(): SessionGateResult {
  const queryClient = useQueryClient();

  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [cachedSession, setCachedSession] = useState<CachedSessionData | null>(null);
  const [cachedProfile, setCachedProfile] = useState<CachedProfileData | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: profile, isLoading: profilePending } = useStudentProfile();

  useEffect(() => {
    async function loadCache() {
      const [s, p, device] = await Promise.all([
        getCachedSession(),
        getCachedProfile(),
        getDeviceFingerprint(),
      ]);
      setCachedSession(s);
      setCachedProfile(p);
      setCurrentDeviceId(device.id);
      setCacheLoaded(true);
      SplashScreen.hideAsync().catch(() => {});
    }
    loadCache();

    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthCache(() => {
      setCachedSession(null);
      setCachedProfile(null);
      try {
        queryClient.clear();
        queryClient.cancelQueries();
      } catch {}
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (session) {
      saveCachedSession(session as any);
      setCachedSession(session as any);
    } else if (session === null && !sessionPending) {
      setCachedSession(null);
      setCachedProfile(null);
      saveCachedSession(null);
      saveCachedProfile(null);
      try {
        queryClient.clear();
      } catch {}
    }
  }, [session, sessionPending, queryClient]);

  useEffect(() => {
    if (profile) {
      saveCachedProfile(profile as any);
      setCachedProfile(profile as any);
    }
  }, [profile]);

  useEffect(() => {
    if (sessionPending) {
      const timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionPending]);

  const effectiveSession = session || cachedSession;
  const effectiveUser = (session?.user || cachedSession?.user) as CachedUser | null;
  const effectiveProfile = profile || cachedProfile;

  const isPending = sessionPending || (effectiveUser?.role === "student" && profilePending);
  const isOffline = !session && !!cachedSession;

  const status = useMemo(() => {
    return resolveSessionGateStatus({
      cacheLoaded,
      isPending,
      timeoutReached,
      effectiveSession,
      effectiveProfile,
      currentDeviceId,
    });
  }, [
    cacheLoaded,
    isPending,
    timeoutReached,
    effectiveSession,
    effectiveProfile,
    currentDeviceId,
  ]);

  return {
    status,
    user: effectiveUser,
    profile: effectiveProfile,
    currentDeviceId,
    isOffline,
    isLoading: status === "LOADING",
  };
}
