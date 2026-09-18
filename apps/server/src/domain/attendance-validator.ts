import { QrTokenManager } from "./qr-token-manager";

export interface ScanContext {
  userId: string;
  studentProfileId: string;
  studentStatus?: string;
  divisionId: string | null;
  deviceBound: boolean;
  boundDeviceId: string | null;
  detectedFingerprint?: string;
  mockFlag?: boolean;
  session: {
    id: string;
    status: string;
    createdAt: Date;
    sessionSecret: string | Uint8Array;
    sessionDivisions: Array<{ divisionId: string }>;
    room: {
      building: {
        name: string;
        gpsLat: number | null;
        gpsLng: number | null;
        radiusMeters: number;
      };
    };
  };
  token: {
    nonce: string;
    signature: string;
    expiresAt: number;
    tokenFoundInCacheOrDb: boolean;
    tokenDbExpired: boolean;
  };
  attendanceAlreadyMarked: boolean;
  gps: {
    lat?: number;
    lng?: number;
    accuracy?: number;
  };
  isOfflineSync?: boolean;
  scannedAt?: number;
  isCloned?: boolean;
}

export type RejectionReason =
  | "STUDENT_SUSPENDED"
  | "MOCK_LOCATION"
  | "CLONED_ENVIRONMENT"
  | "NO_DIVISION"
  | "DEVICE_REQUIRED"
  | "DEVICE_MISMATCH"
  | "SESSION_INACTIVE"
  | "OFFLINE_WINDOW_EXPIRED"
  | "NOT_ENROLLED"
  | "QR_EXPIRED"
  | "INVALID_SIGNATURE"
  | "ALREADY_MARKED"
  | "INVALID_TOKEN"
  | "GPS_REQUIRED"
  | "BUILDING_GEOFENCE_MISSING"
  | "OUTSIDE_GEOFENCE";

export interface AnomalyPayload {
  type: "GEOFENCE_VIOLATION" | "DEVICE_MISMATCH";
  severity: "LOW" | "MEDIUM" | "HIGH";
  details: Record<string, any>;
}

export interface VerificationVerdict {
  outcome: "ACCEPTED" | "REJECTED";
  rejectionReason?: RejectionReason;
  clientMessage?: string;
  errorCode?: "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND";
  distanceMeters?: number;
  effectiveRadius?: number;
  anomalyFlags: string[];
  anomaliesToReport: AnomalyPayload[];
  auditRejectionDetails?: Record<string, any>;
}

export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaP = p2 - p1;
  const deltaLon = lon2 - lon1;
  const deltaLambda = (deltaLon * Math.PI) / 180;
  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MAX_OFFLINE_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

export class AttendanceValidator {
  static evaluate(context: ScanContext, currentTime: number = Date.now()): VerificationVerdict {
    const {
      divisionId,
      deviceBound,
      boundDeviceId,
      detectedFingerprint,
      mockFlag,
      session,
      token,
      attendanceAlreadyMarked,
      gps,
      isOfflineSync,
    } = context;

    const anomalyFlags: string[] = [];
    const anomaliesToReport: AnomalyPayload[] = [];

    if (isOfflineSync) {
      anomalyFlags.push("offline_sync");
    }

    if (context.studentStatus === "suspended") {
      return {
        outcome: "REJECTED",
        rejectionReason: "STUDENT_SUSPENDED",
        errorCode: "FORBIDDEN",
        clientMessage: "Account is suspended. Contact administration.",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (mockFlag) {
      return {
        outcome: "REJECTED",
        rejectionReason: "MOCK_LOCATION",
        errorCode: "BAD_REQUEST",
        clientMessage: "Location error",
        anomalyFlags,
        anomaliesToReport,
        auditRejectionDetails: { reason: "mock_location" },
      };
    }

    if (context.isCloned) {
      anomaliesToReport.push({
        type: "DEVICE_MISMATCH",
        severity: "HIGH",
        details: {
          reason: "cloned_environment_detected",
        },
      });
      return {
        outcome: "REJECTED",
        rejectionReason: "CLONED_ENVIRONMENT",
        errorCode: "FORBIDDEN",
        clientMessage:
          "Cloned application environments are prohibited. Please use the primary app on your authorized device.",
        anomalyFlags: [...anomalyFlags, "cloned_app_detected"],
        anomaliesToReport,
        auditRejectionDetails: { reason: "cloned_environment_detected" },
      };
    }

    if (!divisionId) {
      return {
        outcome: "REJECTED",
        rejectionReason: "NO_DIVISION",
        errorCode: "BAD_REQUEST",
        clientMessage: "You are not assigned to any division",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (deviceBound && boundDeviceId) {
      if (!detectedFingerprint) {
        return {
          outcome: "REJECTED",
          rejectionReason: "DEVICE_REQUIRED",
          errorCode: "FORBIDDEN",
          clientMessage: "Device fingerprint is required",
          anomalyFlags,
          anomaliesToReport,
        };
      }
      if (boundDeviceId !== detectedFingerprint) {
        anomaliesToReport.push({
          type: "DEVICE_MISMATCH",
          severity: "HIGH",
          details: {
            reason: "device_mismatch",
            expected: boundDeviceId,
            received: detectedFingerprint,
          },
        });
        return {
          outcome: "REJECTED",
          rejectionReason: "DEVICE_MISMATCH",
          errorCode: "FORBIDDEN",
          clientMessage: "This device is not authorized for your account",
          anomalyFlags,
          anomaliesToReport,
          auditRejectionDetails: { reason: "device_mismatch" },
        };
      }
    }

    if (!isOfflineSync && session.status !== "active") {
      return {
        outcome: "REJECTED",
        rejectionReason: "SESSION_INACTIVE",
        errorCode: "BAD_REQUEST",
        clientMessage: "This session is no longer active",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (isOfflineSync) {
      const sessionAgeMs = currentTime - session.createdAt.getTime();
      if (sessionAgeMs > MAX_OFFLINE_SYNC_WINDOW_MS) {
        return {
          outcome: "REJECTED",
          rejectionReason: "OFFLINE_WINDOW_EXPIRED",
          errorCode: "BAD_REQUEST",
          clientMessage: "Offline attendance sync window (24 hours) has expired for this session.",
          anomalyFlags,
          anomaliesToReport,
        };
      }
    }

    const isEnrolled = session.sessionDivisions.some((sd) => sd.divisionId === divisionId);
    if (!isEnrolled) {
      return {
        outcome: "REJECTED",
        rejectionReason: "NOT_ENROLLED",
        errorCode: "FORBIDDEN",
        clientMessage: "You are not enrolled in this class",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (isOfflineSync) {
      if (!context.scannedAt) {
        return {
          outcome: "REJECTED",
          rejectionReason: "QR_EXPIRED",
          errorCode: "BAD_REQUEST",
          clientMessage: "Scan timestamp is required for offline sync verification.",
          anomalyFlags,
          anomaliesToReport,
        };
      }

      if (context.scannedAt > token.expiresAt + 30_000) {
        return {
          outcome: "REJECTED",
          rejectionReason: "QR_EXPIRED",
          errorCode: "BAD_REQUEST",
          clientMessage: "QR code has expired. Please scan the current code.",
          anomalyFlags,
          anomaliesToReport,
        };
      }

      if (context.scannedAt < session.createdAt.getTime() - 60_000) {
        return {
          outcome: "REJECTED",
          rejectionReason: "QR_EXPIRED",
          errorCode: "BAD_REQUEST",
          clientMessage: "Scan timestamp precedes session creation.",
          anomalyFlags,
          anomaliesToReport,
        };
      }
    } else if (currentTime > token.expiresAt) {
      return {
        outcome: "REJECTED",
        rejectionReason: "QR_EXPIRED",
        errorCode: "BAD_REQUEST",
        clientMessage: "QR code has expired. Please scan the current code.",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    const isSignatureValid = QrTokenManager.verifySignature(
      session.id,
      token.nonce,
      token.expiresAt,
      token.signature,
      session.sessionSecret,
    );

    if (!isSignatureValid) {
      return {
        outcome: "REJECTED",
        rejectionReason: "INVALID_SIGNATURE",
        errorCode: "BAD_REQUEST",
        clientMessage: "Invalid QR code",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (attendanceAlreadyMarked) {
      return {
        outcome: "REJECTED",
        rejectionReason: "ALREADY_MARKED",
        errorCode: "BAD_REQUEST",
        clientMessage: "You have already marked attendance for this session",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (!token.tokenFoundInCacheOrDb) {
      return {
        outcome: "REJECTED",
        rejectionReason: "INVALID_TOKEN",
        errorCode: "BAD_REQUEST",
        clientMessage: "Invalid token",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (!isOfflineSync && token.tokenDbExpired) {
      return {
        outcome: "REJECTED",
        rejectionReason: "QR_EXPIRED",
        errorCode: "BAD_REQUEST",
        clientMessage: "QR code has expired. Please scan the current code.",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    if (gps.lat === undefined || gps.lng === undefined) {
      return {
        outcome: "REJECTED",
        rejectionReason: "GPS_REQUIRED",
        errorCode: "BAD_REQUEST",
        clientMessage: "GPS location is required to mark attendance",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    const {
      gpsLat: buildingLat,
      gpsLng: buildingLng,
      radiusMeters: allowedRadius,
      name: buildingName,
    } = session.room.building;
    if (buildingLat === null || buildingLng === null) {
      return {
        outcome: "REJECTED",
        rejectionReason: "BUILDING_GEOFENCE_MISSING",
        errorCode: "BAD_REQUEST",
        clientMessage: "Building geofence not configured. Contact your administrator.",
        anomalyFlags,
        anomaliesToReport,
      };
    }

    const distance = getDistanceInMeters(gps.lat, gps.lng, buildingLat, buildingLng);
    const gpsTolerance = Math.min(Math.max(gps.accuracy || 20, 15), 45);
    const effectiveRadius = allowedRadius + gpsTolerance;
    const isWithinGeofence = distance <= effectiveRadius;

    if (!isWithinGeofence) {
      const distanceMetersRounded = Math.round(distance);
      anomaliesToReport.push({
        type: "GEOFENCE_VIOLATION",
        severity: "MEDIUM",
        details: {
          reason: "gps_outside_geofence",
          distanceMeters: distanceMetersRounded,
          allowedRadius,
          gpsAccuracy: gps.accuracy,
          studentGps: { lat: gps.lat, lng: gps.lng },
          buildingGps: { lat: buildingLat, lng: buildingLng },
          buildingName,
        },
      });

      return {
        outcome: "REJECTED",
        rejectionReason: "OUTSIDE_GEOFENCE",
        errorCode: "BAD_REQUEST",
        clientMessage: `Location outside classroom (Detected ~${distanceMetersRounded}m from ${buildingName}, allowed radius is ${allowedRadius}m). Move closer to windows or retry GPS.`,
        distanceMeters: distanceMetersRounded,
        effectiveRadius,
        anomalyFlags,
        anomaliesToReport,
        auditRejectionDetails: {
          distanceMeters: distanceMetersRounded,
          allowedRadius,
          gpsAccuracy: gps.accuracy,
        },
      };
    }

    return {
      outcome: "ACCEPTED",
      distanceMeters: Math.round(distance),
      effectiveRadius,
      anomalyFlags,
      anomaliesToReport,
    };
  }
}
