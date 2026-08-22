import { useState, useEffect } from "react";
import { Text, View, Alert, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { apiClient } from "@/lib/api-client";
import { Container } from "@/components/container";
import { getDeviceFingerprint } from "@/lib/device";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  secondary: "#f3f4f6",
};

export default function DeviceBindingScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ id: string; name: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadDevice() {
      const info = await getDeviceFingerprint();
      setDeviceInfo(info);
    }
    loadDevice();
  }, []);

  async function handleBindDevice() {
    if (!deviceInfo) return;

    setIsLoading(true);

    try {
      // Hit the real device binding endpoint in our backend
      const { error } = await apiClient.api["auth-custom"]["device-bind"].post({
        deviceId: deviceInfo.id,
        deviceName: deviceInfo.name,
      });

      if (error) {
        throw new Error((error.value as any)?.message || "Failed to bind device");
      }

      // Success - continue to app
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Binding Failed", err.message);
      setIsLoading(false);
    }
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Ionicons name="hardware-chip" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>
          Secure Your Account
        </Text>
        <Text style={styles.subtitle}>
          Attendance can only be marked from one trusted device. Bind this device to your account now.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.deviceInfoContainer}>
          <Ionicons name="phone-portrait" size={24} color={COLORS.foreground} />
          <View style={styles.deviceInfoText}>
            <Text style={styles.deviceInfoLabel}>Current Device</Text>
            <Text style={styles.deviceInfoValue}>
              {deviceInfo ? deviceInfo.name : "Loading..."}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (isLoading || !deviceInfo) && styles.buttonDisabled]}
          onPress={handleBindDevice}
          disabled={isLoading || !deviceInfo}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Bind This Device</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          Note: This action is permanent. To change devices later, you will need approval from an administrator.
        </Text>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 24,
  },
  deviceInfoContainer: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deviceInfoText: {
    flex: 1,
  },
  deviceInfoLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  deviceInfoValue: {
    color: COLORS.foreground,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 8,
  },
});
