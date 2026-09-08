import prisma from "@secured_attendance/db";
import { logger } from "../lib/logger";

const MAX_PLAUSIBLE_SPEED_KMH = 1000;

// Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface AnomalyParams {
  userId: string;
  type: "IMPOSSIBLE_TRAVEL" | "DEVICE_MISMATCH" | "GEOFENCE_VIOLATION";
  severity: "LOW" | "MEDIUM" | "HIGH";
  details: Record<string, any>;
}

export async function reportAnomaly(params: AnomalyParams) {
  try {
    const anomaly = await prisma.anomalyAlert.create({
      data: {
        userId: params.userId,
        type: params.type,
        severity: params.severity,
        details: params.details,
      },
    });
    logger.warn("Anomaly logged", { type: params.type, userId: params.userId, id: anomaly.id });
    return anomaly;
  } catch (error) {
    logger.error("Failed to log anomaly", { error, params });
  }
}

/**
 * Checks if the new attendance submission implies impossible travel.
 * If yes, it logs an anomaly and returns true.
 */
export async function checkImpossibleTravel(
  studentProfileId: string,
  userId: string,
  currentLat: number,
  currentLng: number,
  currentTime: Date,
): Promise<boolean> {
  const lastAttendance = await prisma.attendance.findFirst({
    where: {
      studentProfileId,
      gpsLat: { not: null },
      gpsLng: { not: null },
      timestamp: { lt: currentTime },
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  if (!lastAttendance || lastAttendance.gpsLat === null || lastAttendance.gpsLng === null) {
    return false;
  }

  const distanceKm = calculateDistance(
    lastAttendance.gpsLat,
    lastAttendance.gpsLng,
    currentLat,
    currentLng,
  );

  const timeDiffHours =
    (currentTime.getTime() - lastAttendance.timestamp.getTime()) / (1000 * 60 * 60);

  if (timeDiffHours <= 0) return false;

  const speedKmh = distanceKm / timeDiffHours;

  if (speedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
    await reportAnomaly({
      userId,
      type: "IMPOSSIBLE_TRAVEL",
      severity: "HIGH",
      details: {
        distanceKm: Math.round(distanceKm),
        timeDiffHours: timeDiffHours.toFixed(2),
        speedKmh: Math.round(speedKmh),
        previousLocation: { lat: lastAttendance.gpsLat, lng: lastAttendance.gpsLng },
        currentLocation: { lat: currentLat, lng: currentLng },
      },
    });
    return true;
  }

  return false;
}
