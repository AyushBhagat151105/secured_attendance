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
  Easing 
} from "react-native-reanimated";
import { useScanAttendance } from "@/hooks/use-attendance";
import { getDeviceFingerprint } from "@/lib/device";
import { Ionicons } from "@expo/vector-icons";

type ScanStatus = "idle" | "processing" | "success" | "error";

const COLORS = {
  background: "#ffffff",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  secondary: "#f3f4f6",
  success: "#10b981",
  destructive: "#ef4444",
};

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { mutateAsync: scanAttendance } = useScanAttendance();

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
          withTiming(250, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite
        true // reverse
      );
    }
  }, [scanStatus]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.iconWrapper}>
          <Ionicons name="camera" size={40} color={COLORS.foreground} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSubtitle}>
          We need access to your camera to scan attendance QR codes in your classroom.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanStatus !== "idle") return;
    
    setScanStatus("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Parse QR Data
      let payload;
      try {
        payload = JSON.parse(data);
        if (!payload.sessionId || !payload.nonce || !payload.signature || !payload.expiresAt) {
          throw new Error("Invalid format");
        }
      } catch (e) {
        throw new Error("Invalid or unrecognised QR code.");
      }

      // 2. Get Device Fingerprint
      const deviceInfo = await getDeviceFingerprint();

      // 3. Get GPS Location
      let gpsLat: number | undefined;
      let gpsLng: number | undefined;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        gpsLat = location.coords.latitude;
        gpsLng = location.coords.longitude;
      }

      // 4. Submit Attendance
      const result = await scanAttendance({
        ...payload,
        gpsLat,
        gpsLng,
        deviceFingerprint: deviceInfo.id,
      }) as { success: boolean; gpsWithinGeofence: boolean; attendanceId: string };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanStatus("success");
      
      if (result.gpsWithinGeofence) {
        setStatusMessage("Attendance marked successfully!");
      } else {
        setStatusMessage("Marked, but GPS was outside the classroom area.");
      }

    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScanStatus("error");
      setStatusMessage(error.message || "Failed to process QR code");
    } finally {
      // Auto-reset after a few seconds
      setTimeout(() => {
        setScanStatus("idle");
        setStatusMessage("");
      }, 3500);
    }
  };

  const isScanning = scanStatus === "idle";

  return (
    <View style={styles.container}>
      {/* 
        Only keep the camera active when idle to save battery/perf, 
        but leaving it rendered prevents flicker. We just stop processing events.
      */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
      >
        <View style={styles.overlayContainer}>
          
          <View style={styles.topTextContainer}>
            <Text style={styles.topTitle}>Scan to Attend</Text>
            <Text style={styles.topSubtitle}>
              Point your camera at the QR code displayed by your teacher
            </Text>
          </View>

          {/* Scanner Reticle */}
          {scanStatus === "idle" && (
            <View style={styles.reticleContainer}>
              {/* Corners */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              
              {/* Scanning Line */}
              <View style={styles.scanningLineContainer}>
                <Animated.View style={[lineStyle, styles.scanningLine]} />
              </View>
            </View>
          )}

          {/* Overlays */}
          {scanStatus === "processing" && (
            <View style={styles.statusBoxDark}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.statusTextProcessing}>Verifying...</Text>
            </View>
          )}

          {scanStatus === "success" && (
            <View style={styles.statusBoxSuccess}>
              <View style={styles.statusIconWrapper}>
                <Ionicons name="checkmark" size={48} color="white" />
              </View>
              <Text style={styles.statusTitle}>Success!</Text>
              <Text style={styles.statusSubtitle}>{statusMessage}</Text>
            </View>
          )}

          {scanStatus === "error" && (
            <View style={styles.statusBoxError}>
              <View style={styles.statusIconWrapper}>
                <Ionicons name="close" size={48} color="white" />
              </View>
              <Text style={styles.statusTitle}>Failed</Text>
              <Text style={styles.statusSubtitle}>{statusMessage}</Text>
            </View>
          )}

        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.secondary,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTextContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  topSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  reticleContainer: {
    width: 256,
    height: 256,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanningLineContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: '100%',
    overflow: 'hidden',
  },
  scanningLine: {
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  statusBoxDark: {
    width: 256,
    height: 256,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusTextProcessing: {
    color: '#ffffff',
    marginTop: 16,
    fontWeight: '500',
    fontSize: 18,
  },
  statusBoxSuccess: {
    width: 256,
    height: 256,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusBoxError: {
    width: 256,
    height: 256,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusIconWrapper: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: 14,
  },
});
