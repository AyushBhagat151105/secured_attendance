import { Text, View, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Container } from "@/components/container";
import { useTodaySchedule } from "@/hooks/api/use-schedule";
import { useAttendanceStats } from "@/hooks/api/use-attendance-history";
import { authClient } from "@/lib/auth-client";
import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { syncPendingAttendance, getPendingScansCount } from "@/lib/offline-sync";
import { NetworkStatusBadge } from "@/components/network-status-badge";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  success: "#10b981",
  orange: "#f97316",
  destructive: "#ef4444",
};

function format12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr = "0", mStr = "0"] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getStudentSlotStatus(startTime: string, endTime: string) {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [sh = 0, sm = 0] = startTime.split(":").map(Number);
  const [eh = 0, em = 0] = endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (currentMins > endMins) return "ENDED";
  if (currentMins >= startMins && currentMins <= endMins) return "LIVE_SLOT";
  return "UPCOMING";
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const { data: schedule, isLoading: scheduleLoading, refetch: refetchSchedule } = useTodaySchedule();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAttendanceStats();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkAndSync = useCallback(async () => {
    try {
      const synced = await syncPendingAttendance();
      if (synced > 0) {
        await Promise.all([refetchSchedule(), refetchStats()]);
      }
    } catch {
      // ignore
    } finally {
      const count = await getPendingScansCount();
      setPendingCount(count);
    }
  }, [refetchSchedule, refetchStats]);

  useEffect(() => {
    checkAndSync();
  }, [checkAndSync]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkAndSync();
      await Promise.all([refetchSchedule(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [checkAndSync, refetchSchedule, refetchStats]);

  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "Student";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const renderScheduleItem = ({ item }: { item: any }) => {
    const slotStatus = getStudentSlotStatus(item.startTime, item.endTime);

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.subjectName}>{item.subject?.name || "Unknown Subject"}</Text>
          <View style={styles.rowInfo}>
            <Ionicons name="time-outline" size={14} color={COLORS.muted} />
            <Text style={styles.infoText}>
              {format12Hour(item.startTime)} - {format12Hour(item.endTime)}
            </Text>
          </View>
          <View style={styles.rowDetails}>
            <View style={[styles.rowInfo, { marginRight: 12 }]}>
              <Ionicons name="location-outline" size={14} color={COLORS.muted} />
              <Text style={styles.infoText}>{item.room?.name || "No Room"}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Ionicons name="person-outline" size={14} color={COLORS.muted} />
              <Text style={styles.infoText}>{item.teacher?.name || "Unknown Teacher"}</Text>
            </View>
          </View>
        </View>

        {item.attendanceStatus === "PRESENT" ? (
          <View
            style={[
              styles.scanButton,
              {
                backgroundColor: COLORS.success + "20",
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: COLORS.success, fontWeight: "600", fontSize: 12 }}>Present</Text>
          </View>
        ) : item.attendanceStatus === "ABSENT" ? (
          <View
            style={[
              styles.scanButton,
              {
                backgroundColor: COLORS.destructive + "20",
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={COLORS.destructive}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: COLORS.destructive, fontWeight: "600", fontSize: 12 }}>Missed</Text>
          </View>
        ) : item.activeSession ? (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/scan")}
            style={[
              styles.scanButton,
              { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center" },
            ]}
          >
            <Ionicons name="qr-code-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={{ color: "white", fontWeight: "600", fontSize: 13 }}>Scan</Text>
          </TouchableOpacity>
        ) : slotStatus === "ENDED" ? (
          <View
            style={[
              styles.scanButton,
              { backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 6 },
            ]}
          >
            <Text style={{ color: COLORS.muted, fontWeight: "600", fontSize: 11 }}>Class Ended</Text>
          </View>
        ) : slotStatus === "LIVE_SLOT" ? (
          <View
            style={[
              styles.scanButton,
              { backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 6 },
            ]}
          >
            <Text style={{ color: "#d97706", fontWeight: "600", fontSize: 11 }}>In Session</Text>
          </View>
        ) : (
          <View
            style={[
              styles.scanButton,
              { backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 6 },
            ]}
          >
            <Text style={{ color: "#3b82f6", fontWeight: "600", fontSize: 11 }}>Upcoming</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Container style={styles.container} scroll={false}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.greetingText}>Hi, {firstName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <NetworkStatusBadge />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
            </View>
          </View>
        </View>

        {/* Streak & Stats Card */}
        {statsLoading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(249, 115, 22, 0.2)" }]}>
                <Text style={{ fontSize: 20 }}>🔥</Text>
              </View>
              <Text style={styles.statValue}>{stats?.streak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statBox}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                <Ionicons name="pie-chart" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>
                {stats?.overallPercentage ? Math.round(stats.overallPercentage) : 0}%
              </Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
          </View>
        )}

        {pendingCount > 0 && (
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              backgroundColor: "#fef3c7",
              borderColor: "#f59e0b",
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="cloud-offline-outline" size={20} color="#b45309" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#b45309", fontWeight: "600", fontSize: 13 }}>
                {pendingCount} attendance scan{pendingCount > 1 ? "s" : ""} saved offline
              </Text>
              <Text style={{ color: "#92400e", fontSize: 11 }}>
                Pull down or tap to sync when your connection is restored
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Schedule Section */}
      <View style={styles.scheduleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
        </View>

        <View style={styles.listContainer}>
          {scheduleLoading && !refreshing ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlashList
              data={schedule || []}
              renderItem={renderScheduleItem}
              keyExtractor={(item: any, index: number) => item.id?.toString() || index.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[{ paddingBottom: 20 }, (!schedule || schedule.length === 0) && { flex: 1 }]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={48}
                    color={COLORS.muted}
                    style={{ marginBottom: 12 }}
                  />
                  <Text style={styles.emptyStateTitle}>No Classes Today</Text>

                  <Text style={styles.emptyStateSub}>
                    Take a break or check your upcoming schedule.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Below-75% Attendance Warnings */}
        {stats && (() => {
          const warnings = (stats.bySubject || []).filter((s: any) => s.percentage < 75);
          if (warnings.length === 0) return null;
          return (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ Attendance Alerts</Text>
              {warnings.map((subj: any, idx: number) => {
                const pct = Math.round(subj.percentage);
                const needed = Math.ceil(75 - pct);
                return (
                  <View key={subj.subjectId || idx} style={styles.warningRow}>
                    <Text style={styles.warningSubject} numberOfLines={1}>{subj.subjectName}</Text>
                    <Text style={styles.warningDetail}>{pct}% — need {needed}% more</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  dateText: {
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 18,
  },
  statsLoading: {
    height: 96,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scheduleSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  listContainer: {
    flex: 1,
    minHeight: 300,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  subjectName: {
    color: COLORS.foreground,
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rowDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 14,
    marginLeft: 4,
  },
  scanButton: {
    borderRadius: 9999,
  },
  centerAll: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 32,
  },
  emptyStateTitle: {
    color: COLORS.foreground,
    fontWeight: "500",
    fontSize: 18,
    marginBottom: 4,
  },
  emptyStateSub: {
    color: COLORS.muted,
    textAlign: "center",
  },
  warningCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ea580c",
    marginBottom: 8,
  },
  warningRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  warningSubject: {
    fontSize: 13,
    color: "#9a3412",
    flex: 1,
    marginRight: 8,
  },
  warningDetail: {
    fontSize: 13,
    fontWeight: "500",
    color: "#c2410c",
  }
});

