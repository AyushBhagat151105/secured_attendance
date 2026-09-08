import * as SecureStore from "expo-secure-store";

const CACHED_SESSION_KEY = "cached_auth_session";
const CACHED_PROFILE_KEY = "cached_student_profile";

type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

export function subscribeAuthCache(listener: AuthListener) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export interface CachedUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  requiresPasswordChange?: boolean;
}

export interface CachedSessionData {
  user: CachedUser;
  session?: {
    id: string;
    userId: string;
    expiresAt?: string | number | Date;
  };
}

export interface CachedProfileData {
  id: string;
  divisionId?: string;
  deviceBound: boolean;
  deviceId?: string;
  [key: string]: any;
}

export async function saveCachedSession(data: CachedSessionData | null) {
  try {
    if (!data) {
      await SecureStore.deleteItemAsync(CACHED_SESSION_KEY);
    } else {
      await SecureStore.setItemAsync(CACHED_SESSION_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.error("Failed to save cached session", err);
  }
}

export async function getCachedSession(): Promise<CachedSessionData | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHED_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCachedProfile(profile: CachedProfileData | null) {
  try {
    if (!profile) {
      await SecureStore.deleteItemAsync(CACHED_PROFILE_KEY);
    } else {
      await SecureStore.setItemAsync(CACHED_PROFILE_KEY, JSON.stringify(profile));
    }
  } catch (err) {
    console.error("Failed to save cached profile", err);
  }
}

export async function getCachedProfile(): Promise<CachedProfileData | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHED_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearAllCachedAuth() {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(CACHED_SESSION_KEY),
      SecureStore.deleteItemAsync(CACHED_PROFILE_KEY),
    ]);
  } catch (err) {
    console.error("Failed to delete cached auth items", err);
  }
  authListeners.forEach((l) => l());
}
