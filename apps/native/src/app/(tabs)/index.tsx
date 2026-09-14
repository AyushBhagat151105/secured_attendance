import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Container } from "@/components/container";
import { useTodaySchedule } from "@/hooks/api/use-schedule";
import { useAttendanceStats } from "@/hooks/api/use-attendance-history";
import { authClient } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { syncPendingAttendance, getPendingScansCount } from "@/lib/offline-sync";
import { NetworkStatusBadge } from "@/components/network-status-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";
import { useAppTheme } from "@/contexts/app-theme-context";

function format12Hour(timeStr?: string | null): string {
  if (!timeStr || typeof timeStr !== "string") return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getStudentSlotStatus(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime || typeof startTime !== "string" || typeof endTime !== "string") {
    return "UPCOMING";
  }
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startParts = startTime.split(":");
  const endParts = endTime.split(":");
  if (startParts.length < 2 || endParts.length < 2) return "UPCOMING";
  const sh = parseInt(startParts[0], 10) || 0;
  const sm = parseInt(startParts[1], 10) || 0;
  const eh = parseInt(endParts[0], 10) || 0;
  const em = parseInt(endParts[1], 10) || 0;
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (currentMins > endMins) return "ENDED";
  if (currentMins >= startMins && currentMins <= endMins) return "LIVE_SLOT";
  return "UPCOMING";
}

interface SubjectAttendanceWarning {
  subjectId?: string | number;
  subjectName?: string;
  percentage: number;
}

interface ScheduleCardItem {
  id?: string | number;
  startTime?: string | null;
  endTime?: string | null;
  attendanceStatus?: string | null;
  activeSession?: boolean | null;
  subject?: { name?: string | null } | null;
  room?: { name?: string | null } | null;
  teacher?: { name?: string | null } | null;
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const { data: schedule, isLoading: scheduleLoading, refetch: refetchSchedule } = useTodaySchedule();
  const { data: stats, refetch: refetchStats } = useAttendanceStats();
  const router = useRouter();
  const { bottomInset } = useResponsive();
  const { colors, isDark } = useAppTheme();

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
  const firstName =
    typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim().split(" ")[0]
      : "Student";

  const todayReceipt = new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  const overallPercentage = stats?.overallPercentage ? Math.round(stats.overallPercentage) : 0;
  const lowAttendanceSubjects: SubjectAttendanceWarning[] = (stats?.bySubject || []).filter(
    (s: SubjectAttendanceWarning) => s.percentage < 75,
  );

  const scheduleList: ScheduleCardItem[] = Array.isArray(schedule) ? (schedule as ScheduleCardItem[]) : [];

  return (
    <Container scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: Math.max(bottomInset, 16) + 30,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PALETTE.boneWhite}
            colors={[PALETTE.duskViolet]}
          />
        }
      >
        {/* Top Header Row */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <View
              style={[
                styles.dateReceiptPill,
                {
                  backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
                  borderColor: isDark ? colors.border : PALETTE.inkBlack,
                },
              ]}
            >
              <Ionicons
                name="calendar-sharp"
                size={12}
                color={isDark ? PALETTE.boneWhite : PALETTE.inkBlack}
              />
              <Text
                style={[
                  styles.dateReceiptText,
                  { color: isDark ? PALETTE.boneWhite : PALETTE.inkBlack },
                ]}
              >
                {todayReceipt}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.2} style={styles.greetingTitle}>
              HEY, {firstName.toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <NetworkStatusBadge compact />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatarPill}
            >
              <Text style={styles.avatarLetter}>{firstName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Metrics Row */}
        <View style={styles.statsGridRow}>
          <StatCard
            label="Day Streak"
            value={stats?.streak || 0}
            variant="lilac"
            badgeText="ACTIVE"
            icon={<Text style={{ fontSize: 18 }}>🔥</Text>}
            iconBg="rgba(244, 237, 54, 0.2)"
          />
          <StatCard
            label="Attendance"
            value={overallPercentage}
            unit="%"
            variant="bone"
            badgeText={overallPercentage >= 75 ? "SAFE" : "ALERT"}
            icon={<Ionicons name="pie-chart-sharp" size={18} color={PALETTE.pureBlack} />}
            iconBg={overallPercentage >= 75 ? PALETTE.matchaCream : PALETTE.bubblegumPink}
          />
        </View>

        {/* Attendance Risk Warning Banner */}
        {lowAttendanceSubjects.length > 0 && (
          <Card variant="alert" style={styles.warningCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ionicons name="alert-circle-sharp" size={18} color={PALETTE.boneWhite} />
              <Text style={styles.warningHeading}>ATTENDANCE WARNING</Text>
            </View>
            {lowAttendanceSubjects.map((subj: SubjectAttendanceWarning, index: number) => {
              const pct = Math.round(subj.percentage);
              const needed = Math.ceil(75 - pct);
              return (
                <View key={subj.subjectId || index} style={styles.warningRow}>
                  <Text style={styles.warningSubject} numberOfLines={1}>
                    • {subj.subjectName || "Subject"}
                  </Text>
                  <Text style={styles.warningMeta}>
                    {pct}% (need +{needed}%)
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Offline Scans Notice */}
        {pendingCount > 0 && (
          <TouchableOpacity activeOpacity={0.85} onPress={onRefresh}>
            <Card variant="yellow" style={styles.offlineCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="cloud-offline-sharp" size={24} color={PALETTE.pureBlack} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offlineTitle}>
                    {pendingCount} OFFLINE SCAN{pendingCount > 1 ? "S" : ""} QUEUED
                  </Text>
                  <Text style={styles.offlineSub}>Tap to synchronize now</Text>
                </View>
                <Ionicons name="sync-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Schedule Section Header */}
        <SectionHeader
          title="TODAY'S SCHEDULE"
          badge={scheduleList.length}
          style={{ marginTop: 20 }}
        />

        {/* Schedule Cards or Loading or Empty State */}
        {scheduleLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={PALETTE.boneWhite} />
          </View>
        ) : scheduleList.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="sunny-sharp" size={28} color={PALETTE.hiVisYellow} />}
            title="NO CLASSES TODAY"
            description="You have no scheduled lectures for today. Relax or review your attendance history."
            actionLabel="VIEW HISTORY"
            onAction={() => router.push("/(tabs)/history")}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {scheduleList.map((item: ScheduleCardItem, index: number) => {
              const slotStatus = getStudentSlotStatus(item.startTime, item.endTime);
              const isPresent = item.attendanceStatus === "PRESENT";
              const isMissed = item.attendanceStatus === "ABSENT";
              const canScan = item.activeSession && !isPresent;

              return (
                <Card
                  key={item?.id?.toString() || index.toString()}
                  variant="bone"
                  style={styles.scheduleCard}
                >
                  <View style={styles.scheduleCardTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        maxFontSizeMultiplier={1.2}
                        numberOfLines={1}
                        style={[
                          styles.subjectTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.subject?.name || "Subject"}
                      </Text>
                      <View style={styles.timeTagRow}>
                        <Ionicons name="time-sharp" size={13} color={colors.textSecondary} />
                        <Text style={[styles.timeTagText, { color: colors.textSecondary }]}>
                          {format12Hour(item.startTime)} — {format12Hour(item.endTime)}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge or Scan Action */}
                    {isPresent ? (
                      <Badge label="PRESENT" variant="present" icon={<Ionicons name="checkmark-sharp" size={12} color={PALETTE.pureBlack} />} />
                    ) : isMissed ? (
                      <Badge label="MISSED" variant="missed" icon={<Ionicons name="close-sharp" size={12} color={PALETTE.boneWhite} />} />
                    ) : canScan ? (
                      <Button
                        label="SCAN NOW"
                        variant="accent"
                        size="sm"
                        icon={<Ionicons name="qr-code-sharp" size={14} color={PALETTE.pureBlack} />}
                        onPress={() => router.push("/(tabs)/scan")}
                      />
                    ) : slotStatus === "LIVE_SLOT" ? (
                      <Badge label="IN SESSION" variant="live" />
                    ) : slotStatus === "ENDED" ? (
                      <Badge label="ENDED" variant="neutral" />
                    ) : (
                      <Badge label="UPCOMING" variant="upcoming" />
                    )}
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: colors.divider }]} />

                  <View style={styles.scheduleMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-sharp" size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.room?.name || "Hall"}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-sharp" size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.teacher?.name || "Faculty"}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 4,
  },
  dateReceiptPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: PALETTE.boneWhite,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.inkBlack,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    marginBottom: 6,
  },
  dateReceiptText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.inkBlack,
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    letterSpacing: 0.5,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarPill: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
  },
  statsGridRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  warningCard: {
    marginBottom: 14,
    paddingVertical: 12,
  },
  warningHeading: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.boneWhite,
    letterSpacing: 0.5,
  },
  warningRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  warningSubject: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: FONTS.body,
    color: PALETTE.boneWhite,
    flex: 1,
  },
  warningMeta: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.hiVisYellow,
  },
  offlineCard: {
    marginBottom: 14,
    paddingVertical: 12,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
    letterSpacing: 0.4,
  },
  offlineSub: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "rgba(0,0,0,0.7)",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  scheduleCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    marginBottom: 4,
  },
  timeTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    fontWeight: "600",
    color: "rgba(26,26,26,0.75)",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(26,26,26,0.1)",
    marginVertical: 10,
  },
  scheduleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.7)",
  },
});
