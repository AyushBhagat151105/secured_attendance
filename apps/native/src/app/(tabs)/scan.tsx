import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Card, Spinner, Surface } from "heroui-native";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { useScanAttendance } from "@/hooks/use-attendance";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { mutateAsync: scanAttendance } = useScanAttendance();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-background">
        <Text className="text-foreground text-center mb-4">We need your permission to show the camera.</Text>
        <Button onPress={requestPermission}>
          <Button.Label>Grant Permission</Button.Label>
        </Button>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (!isScanning || isProcessing) return;
    
    setIsScanning(false);
    setIsProcessing(true);

    try {
      // 1. Parse QR Data
      const payload = JSON.parse(data);
      if (!payload.sessionId || !payload.nonce || !payload.signature || !payload.expiresAt) {
        throw new Error("Invalid QR Code format");
      }

      // 2. Get GPS Location
      let gpsLat: number | undefined;
      let gpsLng: number | undefined;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        gpsLat = location.coords.latitude;
        gpsLng = location.coords.longitude;
      }

      // 3. Submit Attendance
      const result = await scanAttendance({
        ...payload,
        gpsLat,
        gpsLng,
      }) as { success: boolean; gpsWithinGeofence: boolean; attendanceId: string };

      if (result.gpsWithinGeofence) {
        Alert.alert("Success", "Attendance marked successfully!");
      } else {
        Alert.alert("Success", "Attendance marked, but you appear to be outside the classroom. This has been flagged.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to process QR code");
    } finally {
      setIsProcessing(false);
      // Wait a moment before allowing another scan
      setTimeout(() => setIsScanning(true), 3000);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <View className="flex-1 bg-black/40 justify-center items-center">
          {/* Target Box */}
          <View className="w-64 h-64 border-2 border-primary rounded-xl overflow-hidden relative">
            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            
            {isProcessing && (
              <View className="flex-1 justify-center items-center bg-black/60">
                <Spinner color="primary" />
                <Text className="text-white mt-2 font-medium">Processing...</Text>
              </View>
            )}
          </View>
          <Text className="text-white mt-8 text-lg font-medium shadow-md">
            Position QR Code within the frame
          </Text>
        </View>
      </CameraView>
    </View>
  );
}
