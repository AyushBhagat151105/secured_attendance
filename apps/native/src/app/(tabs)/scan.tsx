import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useScanAttendance } from "@/hooks/api/use-attendance";
import { useAttendanceStats, historyKeys } from "@/hooks/api/use-attendance-history";
import { getDeviceFingerprint, detectClonedEnvironment } from "@/lib/device";
import { savePendingAttendance } from "@/lib/offline-sync";
import { useResponsive } from "@/hooks/use-responsive";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { Button } from "@/components/ui/button";

import { CameraPermissionCard } from "@/components/scanner/camera-permission-card";
import { ScanTopHud } from "@/components/scanner/scan-top-hud";
import { ScanViewfinder } from "@/components/scanner/scan-viewfinder";
import { ScanSuccessModal } from "@/components/scanner/scan-success-modal";
import { ScanErrorModal } from "@/components/scanner/scan-error-modal";

type ScanStatus = "idle" | "processing" | "success" | "error";

export default function ScanScreen() {
  const cloneCheck = detectClonedEnvironment();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastScanSuccess, setLastScanSuccess] = useState<{
    gpsOk: boolean;
    isOffline?: boolean;
  } | null>(null);
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);

  const { mutateAsync: scanAttendance } = useScanAttendance();
  const queryClient = useQueryClient();
  const { data: stats } = useAttendanceStats();
  const router = useRouter();
  const { width, topInset } = useResponsive();

  const scanBoxSize = Math.min(width - 80, 280);

  const handleSetZoom = (level: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setZoom(level);
  };

  const handleToggleTorch = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setTorch((prev) => !prev);
  };

  const handleBarcodeScanned = async (scanningResult: {
    data: string;
    bounds?: { origin: { x: number; y: number }; size: { width: number; height: number } };
  }) => {
    if (scanStatus !== "idle") return;

    const data = scanningResult.data;
    const bounds = scanningResult.bounds;

    if (bounds?.size?.width && bounds.size.width < scanBoxSize * 0.4 && zoom < 0.2) {
      setZoom(0.25);
      try {
        Haptics.selectionAsync();
      } catch {}
    }

    setScanStatus("processing");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    try {
      let payload;
      try {
        const rawPayload = JSON.parse(data);
        payload = {
          sessionId: rawPayload.sessionId || rawPayload.s,
          nonce: rawPayload.nonce || rawPayload.n,
          signature: rawPayload.signature || rawPayload.sig,
          expiresAt: rawPayload.expiresAt || rawPayload.e,
        };

        if (!payload.sessionId || !payload.nonce || !payload.signature || !payload.expiresAt) {
          throw new Error("Invalid format");
        }
      } catch (e) {
        throw new Error("Unrecognized attendance QR code format", { cause: e });
      }

      const deviceInfo = await getDeviceFingerprint();

      let gpsLat: number | undefined;
      let gpsLng: number | undefined;
      let gpsAccuracy: number | undefined;
      let mockFlag = false;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        gpsLat = location.coords.latitude;
        gpsLng = location.coords.longitude;
        gpsAccuracy = location.coords.accuracy ?? undefined;
        mockFlag = location.mocked ?? false;
      }

      const payloadData = {
        ...payload,
        gpsLat,
        gpsLng,
        gpsAccuracy,
        mockFlag,
        deviceFingerprint: deviceInfo.id,
        isCloned: cloneCheck.isCloned,
      };

      try {
        const result = (await scanAttendance(payloadData)) as {
          success: boolean;
          gpsWithinGeofence: boolean;
          attendanceId: string;
        };

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}

        setScanStatus("success");
        setLastScanSuccess({ gpsOk: !!result.gpsWithinGeofence });

        queryClient.invalidateQueries({ queryKey: historyKeys.stats() });
        queryClient.invalidateQueries({ queryKey: historyKeys.history() });

        const pct = stats?.overallPercentage
          ? `Overall: ${Math.round(stats.overallPercentage)}%`
          : "";
        if (result.gpsWithinGeofence) {
          setStatusMessage(`Attendance confirmed inside classroom area! ${pct}`);
        } else {
          setStatusMessage(`Attendance recorded, but GPS verified outside geofence. ${pct}`);
        }
      } catch (error: unknown) {
        const err = error as { message?: string; response?: unknown; code?: string; status?: number };
        const message = err.message?.toLowerCase() || "";
        const isNetworkOrTimeout =
          !err.status &&
          !err.response &&
          (err.code === "ECONNABORTED" ||
            err.code === "ERR_NETWORK" ||
            message.includes("network") ||
            message.includes("failed to fetch") ||
            message.includes("timeout") ||
            message.includes("connection"));

        if (isNetworkOrTimeout) {
          await savePendingAttendance(payloadData);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          setScanStatus("success");
          setLastScanSuccess({ gpsOk: true, isOffline: true });
          setStatusMessage("Saved to offline queue. Will synchronize automatically once connection restores.");
        } else {
          throw error;
        }
      }
    } catch (error: unknown) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setScanStatus("error");
      const err = error as { message?: string };
      setStatusMessage(err.message || "Failed to verify attendance QR");
    }
  };

  const handleDismissSuccess = () => {
    setScanStatus("idle");
    setStatusMessage("");
    setLastScanSuccess(null);
    setZoom(0);
    setTorch(false);
    router.replace("/(tabs)");
  };

  if (cloneCheck.isCloned) {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedCard}>
          <View style={styles.blockedIconCircle}>
            <Ionicons name="shield-half-sharp" size={32} color={PALETTE.pureWhite} />
          </View>
          <Text style={styles.blockedTitle}>CLONED APP DETECTED</Text>
          <Text style={styles.blockedDesc}>
            Dual space, parallel apps, and cloned virtual sandboxes are strictly prohibited by campus anti-proxy policy.
          </Text>
          {cloneCheck.reason ? (
            <Text style={styles.blockedReason}>{cloneCheck.reason}</Text>
          ) : null}
          <Text style={styles.blockedSub}>
            Please launch the official Secured Attendance app from your primary device profile to mark attendance.
          </Text>
          <Button
            label="RETURN TO DASHBOARD"
            variant="primary"
            size="md"
            onPress={() => router.replace("/(tabs)")}
            style={{ marginTop: 20, width: "100%" }}
          />
        </View>
      </View>
    );
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: PALETTE.duskViolet }} />;
  }

  if (!permission.granted) {
    return <CameraPermissionCard onRequestPermission={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        zoom={zoom}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanStatus === "idle" ? handleBarcodeScanned : undefined}
      />

      <ScanTopHud
        topInset={topInset}
        torch={torch}
        onBack={() => router.replace("/(tabs)")}
        onToggleTorch={handleToggleTorch}
      />

      <ScanViewfinder
        scanBoxSize={scanBoxSize}
        scanStatus={scanStatus}
        zoom={zoom}
        onSetZoom={handleSetZoom}
      />

      {scanStatus === "success" && (
        <ScanSuccessModal
          isOffline={lastScanSuccess?.isOffline}
          statusMessage={statusMessage}
          streak={stats?.streak || 1}
          onDismiss={handleDismissSuccess}
        />
      )}

      {scanStatus === "error" && (
        <ScanErrorModal
          statusMessage={statusMessage}
          onRetry={() => setScanStatus("idle")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.pureBlack,
  },
  blockedContainer: {
    flex: 1,
    backgroundColor: PALETTE.duskViolet,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  blockedCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: PALETTE.boneWhite,
    borderRadius: RADIUS.lg,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.inkBlack,
    padding: 24,
    alignItems: "center",
  },
  blockedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.firecrackerRed,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.inkBlack,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  blockedDesc: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: PALETTE.inkBlack,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 8,
  },
  blockedReason: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: PALETTE.firecrackerRed,
    textAlign: "center",
    marginBottom: 12,
  },
  blockedSub: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.65)",
    textAlign: "center",
    lineHeight: 15,
  },
});
