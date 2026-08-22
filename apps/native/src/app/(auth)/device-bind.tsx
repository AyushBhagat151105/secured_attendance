import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";

import { authClient } from "@/lib/auth-client";
import { getDeviceFingerprint } from "@/lib/device";
import { Container } from "@/components/container";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  destructive: "#ef4444",
};

export default function DeviceBindScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  async function handleBindDevice() {
    setIsLoading(true);
    setError(null);

    try {
      const fingerprint = await getDeviceFingerprint();
      
      const res = await authClient.$fetch("/api/auth-custom/device-bind", {
        method: "POST",
        body: {
          deviceId: fingerprint.id,
          deviceName: fingerprint.name,
        }
      });
      
      if (res.error) {
        setError(res.error.message || "Failed to bind device");
        setIsLoading(false);
        return;
      }

      // To clear the query cache and redirect properly, we can trigger a re-render
      // or navigate directly. Since _layout checks the query cache, let's navigate to home 
      // but invalidate queries there if needed. For now, pushing to tabs should work.
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Failed to bind device");
      setIsLoading(false);
    }
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Secure Your Device</Text>
        <Text style={styles.subtitle}>
          Attendance can only be marked from a single registered device. Bind this device to your account to continue.
        </Text>
      </View>

      <View style={styles.card}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Once bound, you will not be able to mark attendance from any other phone unless authorized by an administrator.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleBindDevice} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Bind This Device</Text>
          )}
        </TouchableOpacity>
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
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
    gap: 16,
  },
  errorText: {
    color: COLORS.destructive,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
