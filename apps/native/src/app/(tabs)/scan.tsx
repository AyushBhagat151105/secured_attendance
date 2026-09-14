import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useScanAttendance } from "@/hooks/api/use-attendance";
import { getDeviceFingerprint } from "@/lib/device";
import { Ionicons } from "@expo/vector-icons";
import { savePendingAttendance } from "@/lib/offline-sync";
import { NetworkStatusBadge } from "@/components/network-status-badge";
import { useQueryClient } from "@tanstack/react-query";
import { useAttendanceStats, historyKeys } from "@/hooks/api/use-attendance-history";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";
import { useAppTheme } from "@/contexts/app-theme-context";

type ScanStatus = "idle" | "processing" | "success" | "error";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastScanSuccess, setLastScanSuccess] = useState<{
    gpsOk: boolean;
    isOffline?: boolean;
  } | null>(null);

  const { mutateAsync: scanAttendance } = useScanAttendance();
  const queryClient = useQueryClient();
  const { data: stats } = useAttendanceStats();
  const router = useRouter();
  const { width, topInset } = useResponsive();
  const { colors, isDark } = useAppTheme();

  // Dynamic box size based on screen width
  const scanBoxSize = Math.min(width - 80, 280);

  // Animation for the scanning line
  const linePosition = useSharedValue(0);
  const lineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: linePosition.value }],
    };
  });

  useEffect(() => {
    if (scanStatus === "idle") {
      linePosition.value = withRepeat(
        withSequence(
          withTiming(scanBoxSize - 10, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [scanStatus, scanBoxSize]);

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: PALETTE.duskViolet }} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.stage }]}>
        <Card variant="bone" style={styles.permissionCard}>
          <View style={styles.permissionIconWrapper}>
            <Ionicons name="camera-sharp" size={36} color={PALETTE.pureBlack} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            CAMERA PERMISSION REQUIRED
          </Text>
          <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
            To mark attendance securely, we need access to your camera to scan classroom QR codes.
          </Text>
          <Button
            label="GRANT ACCESS"
            variant="accent"
            size="lg"
            onPress={requestPermission}
            icon={<Ionicons name="shield-checkmark-sharp" size={18} color={PALETTE.pureBlack} />}
            style={{ width: "100%", marginTop: 8 }}
          />
        </Card>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanStatus !== "idle") return;

    setScanStatus("processing");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // ignore
    }

    try {
      // 1. Parse QR Data
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

      // 2. Get Device Fingerprint
      const deviceInfo = await getDeviceFingerprint();

      // 3. Get GPS Location
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

      // 4. Submit Attendance
      const payloadData = {
        ...payload,
        gpsLat,
        gpsLng,
        gpsAccuracy,
        mockFlag,
        deviceFingerprint: deviceInfo.id,
      };

      try {
        const result = (await scanAttendance(payloadData)) as {
          success: boolean;
          gpsWithinGeofence: boolean;
          attendanceId: string;
        };

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // ignore
        }

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
        const err = error as { message?: string; response?: unknown; code?: string };
        const message = err.message?.toLowerCase() || "";
        const isNetworkOrTimeout =
          !err.response ||
          err.code === "ECONNABORTED" ||
          message.includes("network") ||
          message.includes("failed to fetch") ||
          message.includes("timeout");

        if (isNetworkOrTimeout) {
          await savePendingAttendance(payloadData);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // ignore
          }
          setScanStatus("success");
          setLastScanSuccess({ gpsOk: true, isOffline: true });
          setStatusMessage(
            "Saved to offline queue. Will synchronize automatically once connection restores.",
          );
        } else {
          throw error;
        }
      }
    } catch (error: unknown) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // ignore
      }
      setScanStatus("error");
      const err = error as { message?: string };
      setStatusMessage(err.message || "Failed to verify attendance QR");
    }
  };

  const handleDismissSuccess = () => {
    setScanStatus("idle");
    setStatusMessage("");
    setLastScanSuccess(null);
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanStatus === "idle" ? handleBarcodeScanned : undefined}
      />

      {/* Floating Top HUD Bar */}
      <View style={[styles.topHud, { paddingTop: Math.max(topInset, 16) }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.replace("/(tabs)")}
          style={[
            styles.backButton,
            {
              backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
              borderColor: isDark ? colors.border : PALETTE.inkBlack,
            },
          ]}
        >
          <Ionicons
            name="arrow-back-sharp"
            size={20}
            color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
          />
        </TouchableOpacity>

        <View style={styles.topHudTags}>
          <NetworkStatusBadge compact />
          <View style={styles.gpsPill}>
            <Ionicons name="location-sharp" size={12} color={PALETTE.pureBlack} />
            <Text style={styles.gpsPillText}>GPS ACTIVE</Text>
          </View>
        </View>
      </View>

      {/* Viewfinder Center Box */}
      <View style={styles.viewfinderWrapper} pointerEvents="none">
        <View style={[styles.scanBox, { width: scanBoxSize, height: scanBoxSize }]}>
          {/* Corner Brackets */}
          <View style={[styles.cornerBracket, styles.topLeft]} />
          <View style={[styles.cornerBracket, styles.topRight]} />
          <View style={[styles.cornerBracket, styles.bottomLeft]} />
          <View style={[styles.cornerBracket, styles.bottomRight]} />

          {/* Animated Laser Line */}
          {scanStatus === "idle" && <Animated.View style={[styles.laserLine, lineStyle]} />}

          {scanStatus === "processing" && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={PALETTE.hiVisYellow} />
              <Text style={styles.processingText}>VERIFYING ATTENDANCE...</Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.instructionPill,
            {
              backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
              borderColor: isDark ? colors.border : PALETTE.inkBlack,
            },
          ]}
        >
          <Ionicons
            name="scan-sharp"
            size={14}
            color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
          />
          <Text
            style={[
              styles.instructionText,
              { color: isDark ? PALETTE.boneWhite : PALETTE.pureBlack },
            ]}
          >
            ALIGN CLASSROOM QR CODE INSIDE FRAME
          </Text>
        </View>
      </View>

      {/* CELEBRATORY "PEAK" SUCCESS OVERLAY */}
      {scanStatus === "success" && (
        <View style={styles.peakModalBackdrop}>
          <Card variant="bone" style={styles.peakReceiptCard}>
            {/* Stamp Icon */}
            <View
              style={[
                styles.peakIconCircle,
                {
                  backgroundColor: lastScanSuccess?.isOffline
                    ? PALETTE.butteryYellow
                    : PALETTE.matchaCream,
                },
              ]}
            >
              <Ionicons
                name={lastScanSuccess?.isOffline ? "cloud-done-sharp" : "checkmark-done-sharp"}
                size={40}
                color={PALETTE.pureBlack}
              />
            </View>

            <Text style={[styles.peakHeading, { color: colors.textPrimary }]}>
              {lastScanSuccess?.isOffline ? "SAVED OFFLINE" : "ATTENDANCE SECURED!"}
            </Text>

            <View style={styles.streakNoticePill}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={styles.streakNoticeText}>STREAK ACTIVE: {stats?.streak || 1} DAYS</Text>
            </View>

            <Text style={[styles.peakMessage, { color: colors.textSecondary }]}>
              {statusMessage}
            </Text>

            <View style={[styles.receiptDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.receiptDetailsRow}>
              <View style={{ gap: 4 }}>
                <Text style={[styles.receiptDetailLabel, { color: colors.textMuted }]}>
                  TIMESTAMP
                </Text>
                <Text style={[styles.receiptDetailValue, { color: colors.textPrimary }]}>
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <View style={{ gap: 4, alignItems: "flex-end" }}>
                <Text style={[styles.receiptDetailLabel, { color: colors.textMuted }]}>
                  VERIFICATION
                </Text>
                <Badge
                  label={lastScanSuccess?.isOffline ? "CACHED" : "GPS VERIFIED"}
                  variant={lastScanSuccess?.isOffline ? "offline" : "present"}
                  size="sm"
                />
              </View>
            </View>

            <Button
              label="DONE & RETURN HOME"
              variant="accent"
              size="lg"
              onPress={handleDismissSuccess}
              style={{ width: "100%", marginTop: 20 }}
            />
          </Card>
        </View>
      )}

      {/* Error Feedback Overlay */}
      {scanStatus === "error" && (
        <View style={styles.peakModalBackdrop}>
          <Card variant="alert" style={styles.peakReceiptCard}>
            <View style={[styles.peakIconCircle, { backgroundColor: PALETTE.boneWhite }]}>
              <Ionicons name="close-sharp" size={38} color={PALETTE.firecrackerRed} />
            </View>

            <Text style={[styles.peakHeading, { color: PALETTE.boneWhite }]}>SCAN FAILED</Text>

            <Text style={[styles.peakMessage, { color: PALETTE.boneWhite }]}>{statusMessage}</Text>

            <Button
              label="TRY AGAIN"
              variant="primary"
              size="md"
              onPress={() => setScanStatus("idle")}
              style={{ width: "100%", marginTop: 18 }}
            />
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.pureBlack,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: PALETTE.duskViolet,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  permissionCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    padding: 24,
  },
  permissionIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "rgba(26, 26, 26, 0.75)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  topHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.boneWhite,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  topHudTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.pureBlack,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
  },
  viewfinderWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    position: "relative",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  cornerBracket: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: PALETTE.hiVisYellow,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: RADIUS.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: RADIUS.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: RADIUS.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: RADIUS.md,
  },
  laserLine: {
    height: 3,
    backgroundColor: PALETTE.hiVisYellow,
    shadowColor: PALETTE.hiVisYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  processingText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.hiVisYellow,
    letterSpacing: 0.5,
  },
  instructionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PALETTE.boneWhite,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 24,
  },
  instructionText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
    letterSpacing: 0.4,
  },
  peakModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 17, 36, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  peakReceiptCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    padding: 24,
  },
  peakIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  peakHeading: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  streakNoticePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244, 237, 54, 0.3)",
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.pureBlack,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  streakNoticeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
  },
  peakMessage: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "rgba(26, 26, 26, 0.8)",
    textAlign: "center",
    lineHeight: 18,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "rgba(26,26,26,0.15)",
    width: "100%",
    marginVertical: 14,
  },
  receiptDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  receiptDetailLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.6)",
  },
  receiptDetailValue: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.inkBlack,
  },
});
