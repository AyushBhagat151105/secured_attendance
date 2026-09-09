import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { authClient } from "@/lib/auth-client";
import { clearAllCachedAuth, getCachedProfile } from "@/lib/session-cache";
import { Container } from "@/components/container";
import { useEffect } from "react";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  destructive: "#ef4444",
};

export default function DeviceMismatchScreen() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [boundModel, setBoundModel] = useState<string>("another phone");

  useEffect(() => {
    getCachedProfile().then((p) => {
      if (p?.deviceModel) {
        setBoundModel(p.deviceModel);
      }
    });
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await clearAllCachedAuth();
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
      router.replace("/(auth)/sign-in");
    }
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="phone-portrait-outline" size={48} color={COLORS.destructive} />
        </View>
        <Text style={styles.title}>Device Not Authorized</Text>
        <Text style={styles.subtitle}>
          Your account is registered to {boundModel}.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.warningBox}>
          <Ionicons name="shield-half" size={24} color={COLORS.destructive} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Security Policy Violation</Text>
            <Text style={styles.warningText}>
              To prevent proxy attendance, each student is strictly bound to one physical device. You cannot log into your account from another student's phone.
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            • Use your own registered phone to attend classes.
          </Text>
          <Text style={styles.infoText}>
            • If you lost or changed your phone, contact your department administrator to rebind your account.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out of This Device</Text>
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
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.destructive,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.foreground,
    lineHeight: 18,
  },
  infoSection: {
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  signOutButton: {
    backgroundColor: COLORS.destructive,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
