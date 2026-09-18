import { Text, View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { authClient } from "@/lib/auth-client";
import { useStudentProfile } from "@/hooks/api/use-profile";
import { useAttendanceStats } from "@/hooks/api/use-attendance-history";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const { data: profile, refetch: refetchProfile } = useStudentProfile();
  const { data: stats, refetch: refetchStats } = useAttendanceStats();
  const { bottomInset } = useResponsive();
  const { colors, isDark } = useAppTheme();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProfile, refetchStats]);

  const user = session?.user as { name?: string; email?: string } | undefined;
  const name = typeof user?.name === "string" ? user.name : "Student";
  const email = typeof user?.email === "string" ? user.email : "";
  const initials =
    typeof name === "string" && name.trim().length > 0
      ? name
          .trim()
          .split(" ")
          .map((w: string) => w.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "ST";

  const overallPct = stats?.overallPercentage ? Math.round(stats.overallPercentage) : 0;
  const deviceBound = profile?.deviceBound ?? false;
  const deviceModel = profile?.deviceModel || "Primary Phone";

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
        <Text maxFontSizeMultiplier={1.2} style={styles.screenHeading}>
          STUDENT PROFILE
        </Text>

        {/* Student Identity Card */}
        <Card variant="bone" style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[styles.nameText, { color: colors.textPrimary }]}
          >
            {name.toUpperCase()}
          </Text>

          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[styles.emailText, { color: colors.textSecondary }]}
          >
            {email}
          </Text>

          <View style={styles.roleTagRow}>
            <Badge label="STUDENT VERIFIED" variant="live" size="sm" />
            <Badge label={profile?.rollNumber || "ID: ACTIVE"} variant="neutral" size="sm" />
          </View>
        </Card>

        {/* Hardware Security Card */}
        <SectionHeader title="SECURITY STATUS" style={{ marginTop: 20 }} />
        <Card variant="lilac" style={styles.securityCard}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={styles.securityIconBox}>
              <Ionicons
                name={deviceBound ? "shield-checkmark-sharp" : "shield-outline"}
                size={22}
                color={deviceBound ? PALETTE.pureBlack : PALETTE.firecrackerRed}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text style={styles.securityTitle}>
                  {deviceBound ? "DEVICE BOUND" : "DEVICE NOT BOUND"}
                </Text>
                <Badge
                  label={deviceBound ? "SECURE" : "ACTION REQ"}
                  variant={deviceBound ? "present" : "missed"}
                  size="sm"
                />
              </View>

              <Text style={styles.securitySub}>
                {deviceBound
                  ? `Registered to ${deviceModel}. Attendance is locked to this hardware.`
                  : "Device binding is required to mark proxy-free attendance."}
              </Text>
            </View>
          </View>
        </Card>

        {/* Attendance Statistics Strip */}
        <SectionHeader title="ACADEMIC METRICS" style={{ marginTop: 20 }} />
        <View style={styles.statsRow}>
          <StatCard
            label="Day Streak"
            value={stats?.streak || 0}
            variant="bone"
            badgeText="STREAK"
            icon={<Text style={{ fontSize: 16 }}>🔥</Text>}
          />
          <StatCard
            label="Overall"
            value={overallPct}
            unit="%"
            variant="bone"
            badgeText={overallPct >= 75 ? "SAFE" : "LOW"}
            icon={
              <Ionicons
                name="pie-chart-sharp"
                size={16}
                color={isDark ? PALETTE.boneWhite : PALETTE.inkBlack}
              />
            }
          />
        </View>

        {/* Institutional Attribution Footer */}
        <View style={styles.profileFooter}>
          <Text style={[styles.profileFooterInst, { color: colors.textMuted }]}>
            CHARUSAT • CMPICA DEPARTMENT
          </Text>
          <Text style={[styles.profileFooterDev, { color: colors.textMuted }]}>
            Engineered with precision by{" "}
            <Text style={{ fontWeight: "700", color: isDark ? PALETTE.hiVisYellow : PALETTE.inkBlack }}>
              Ayush Bhagat
            </Text>
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  screenHeading: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  identityCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.full,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "900",
    fontFamily: FONTS.mono,
    color: PALETTE.pureBlack,
  },
  nameText: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.65)",
    marginBottom: 12,
  },
  roleTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  securityCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  securityIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.boneWhite,
    letterSpacing: 0.4,
  },
  securitySub: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "rgba(249, 245, 242, 0.8)",
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  profileFooter: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
    alignItems: "center",
    gap: 4,
  },
  profileFooterInst: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    letterSpacing: 0.8,
  },
  profileFooterDev: {
    fontSize: 11,
    fontFamily: FONTS.body,
  },
});
