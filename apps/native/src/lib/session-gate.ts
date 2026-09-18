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
  | "CLONED_ENVIRONMENT"
  | "AUTHORIZED";

export interface SessionGateResult {
  status: SessionGateStatus;
  user: CachedUser | null;
  profile: CachedProfileData | null;
  currentDeviceId: string | null;
  isOffline: boolean;
  isLoading: boolean;
  isCloned?: boolean;
  clonedReason?: string | null;
}

export interface ResolveGateParams {
  cacheLoaded: boolean;
  isPending: boolean;
  timeoutReached: boolean;
  effectiveSession: CachedSessionData | null;
  effectiveProfile: CachedProfileData | null;
  currentDeviceId: string | null;
  isCloned?: boolean;
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
    if (params.isCloned) {
      return "CLONED_ENVIRONMENT";
    }

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
