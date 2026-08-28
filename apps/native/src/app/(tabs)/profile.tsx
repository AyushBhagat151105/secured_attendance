import { Text, View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { authClient } from "@/lib/auth-client";
import { useStudentProfile } from "@/hooks/api/use-profile";
import { useAttendanceStats } from "@/hooks/api/use-attendance-history";
import { useRouter } from "expo-router";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  success: "#10b981",
  successBg: "rgba(16, 185, 129, 0.15)",
  destructive: "#ef4444",
  destructiveBg: "rgba(239, 68, 68, 0.15)",
  secondary: "#f3f4f6",
};

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useStudentProfile();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAttendanceStats();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProfile, refetchStats]);

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

  const user = session?.user as any;
  const name = user?.name || "Student";
  const email = user?.email || "";
  const initials = name
    .split(" ")
    .map((w: string) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const overallPct = stats?.overallPercentage ? Math.round(stats.overallPercentage) : null;
  const deviceBound = profile?.deviceBound ?? false;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
      }
    >
      {/* Avatar & Identity */}
      <View style={styles.heroSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.nameText}>{name}</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={[styles.badge, deviceBound ? styles.badgeSuccess : styles.badgeDestructive]}>
          <Ionicons
            name={deviceBound ? "shield-checkmark" : "shield-outline"}
            size={12}
            color={deviceBound ? COLORS.success : COLORS.destructive}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.badgeText, { color: deviceBound ? COLORS.success : COLORS.destructive }]}>
            {deviceBound ? "Device Bound" : "Not Bound"}
          </Text>
        </View>
      </View>

      {/* Stats Card */}
      {statsLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : overallPct !== null ? (
        <View style={styles.card}>
          <View style={styles.statRow}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(79, 70, 229, 0.1)" }]}>
              <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Overall Attendance</Text>
              <Text style={[styles.statValue, { color: overallPct >= 75 ? COLORS.success : COLORS.destructive }]}>
                {overallPct}%
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Profile Details */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACADEMIC INFO</Text>
        <View style={styles.card}>
          {profileLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 16 }} />
          ) : (
            <>
              <InfoRow icon="id-card-outline" label="Enrollment No." value={profile?.enrollmentNumber || "—"} />
              <View style={styles.divider} />
              <InfoRow icon="school-outline" label="Program" value={profile?.programCode || "—"} />
              <View style={styles.divider} />
              <InfoRow icon="people-outline" label="Division" value={profile?.division || "—"} />
              <View style={styles.divider} />
              <InfoRow icon="phone-portrait-outline" label="Device" value={profile?.deviceName || "—"} />
            </>
          )}
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={signingOut}>
          {signingOut ? (
            <ActivityIndicator size="small" color={COLORS.destructive} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.destructive} style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.muted} style={{ marginRight: 12 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(79, 70, 229, 0.3)",
    marginBottom: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 28,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  badgeSuccess: { backgroundColor: COLORS.successBg },
  badgeDestructive: { backgroundColor: COLORS.destructiveBg },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingBox: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: 20,
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
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 46,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    maxWidth: "50%",
    textAlign: "right",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.destructiveBg,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.destructive,
  },
});
