import type {
  CachedSessionData,
  CachedProfileData,
  CachedUser,
} from "./session-cache";

export type SessionGateStatus =
  | "LOADING"
  | "UNAUTHENTICATED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "DEVICE_BINDING_REQUIRED"
  | "DEVICE_MISMATCH"
  | "AUTHORIZED";

export interface SessionGateResult {
  status: SessionGateStatus;
  user: CachedUser | null;
  profile: CachedProfileData | null;
  currentDeviceId: string | null;
  isOffline: boolean;
  isLoading: boolean;
}

export interface ResolveGateParams {
  cacheLoaded: boolean;
  isPending: boolean;
  timeoutReached: boolean;
  effectiveSession: CachedSessionData | null;
  effectiveProfile: CachedProfileData | null;
  currentDeviceId: string | null;
}

export function resolveSessionGateStatus(params: ResolveGateParams): SessionGateStatus {
  const {
    cacheLoaded,
    isPending,
    timeoutReached,
    effectiveSession,
    effectiveProfile,
    currentDeviceId,
  } = params;

  if (!cacheLoaded) {
    return "LOADING";
  }

  if (isPending && !timeoutReached && !effectiveSession) {
    return "LOADING";
  }

  if (!effectiveSession) {
    return "UNAUTHENTICATED";
  }

  const effectiveUser = effectiveSession.user;

  if (effectiveUser?.requiresPasswordChange) {
    return "PASSWORD_CHANGE_REQUIRED";
  }

  if (effectiveUser?.role === "student" && effectiveProfile) {
    if (!effectiveProfile.deviceBound) {
      return "DEVICE_BINDING_REQUIRED";
    }

    if (
      currentDeviceId &&
      effectiveProfile.deviceId &&
      effectiveProfile.deviceId !== currentDeviceId
    ) {
      return "DEVICE_MISMATCH";
    }

    return "AUTHORIZED";
  }

  return "AUTHORIZED";
}
