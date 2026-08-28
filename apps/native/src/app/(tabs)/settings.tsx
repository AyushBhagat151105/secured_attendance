import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { env } from "@secured_attendance/env/native";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  destructive: "#ef4444",
  destructiveBg: "rgba(239, 68, 68, 0.1)",
  secondary: "#f3f4f6",
};

export default function SettingsScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await authClient.signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? "—";
  const serverUrl = env.EXPO_PUBLIC_SERVER_URL;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Account Section */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => router.push("/(auth)/reset-password")}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(79, 70, 229, 0.1)" }]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.rowLabel}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={handleSignOut} disabled={signingOut}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.destructiveBg }]}>
              {signingOut ? (
                <ActivityIndicator size="small" color={COLORS.destructive} />
              ) : (
                <Ionicons name="log-out-outline" size={18} color={COLORS.destructive} />
              )}
            </View>
            <Text style={[styles.rowLabel, { color: COLORS.destructive }]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* App Section */}
      <Text style={styles.sectionLabel}>APP</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.muted} />
            </View>
            <Text style={styles.rowLabel}>App Version</Text>
          </View>
          <Text style={styles.rowValue}>{appVersion}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="server-outline" size={18} color={COLORS.muted} />
            </View>
            <Text style={styles.rowLabel}>Server URL</Text>
          </View>
          <Text style={styles.rowValue} numberOfLines={1}>{serverUrl}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.muted,
    maxWidth: "40%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 62,
  },
});
