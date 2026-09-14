import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Container } from "@/components/container";
import { useAttendanceHistory, useAttendanceStats } from "@/hooks/api/use-attendance-history";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";
import { useAppTheme } from "@/contexts/app-theme-context";

interface HistorySessionItem {
  id: string | number;
  status: string;
  date: string;
  session?: {
    subject?: { name?: string };
    room?: { name?: string };
  };
}

interface SubjectStatItem {
  subjectId?: string | number;
  subjectName?: string;
  percentage: number;
  attended: number;
  total: number;
}

export default function HistoryScreen() {
  const [viewMode, setViewMode] = useState<"recent" | "subjects">("recent");
  const { bottomInset } = useResponsive();
  const { colors, isDark } = useAppTheme();

  const {
    data: historyData,
    isLoading: historyLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchHistory,
  } = useAttendanceHistory();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAttendanceStats();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchHistory(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchHistory, refetchStats]);

  const historyItems = historyData?.pages.flatMap((page) => page.items) || [];
  const subjectStats = stats?.bySubject || [];

  const overallPercentage = stats?.overallPercentage ? Math.round(stats.overallPercentage) : 0;

  const renderHistoryItem = ({ item }: { item: HistorySessionItem }) => {
    const isPresent = item.status === "PRESENT";
    const date = new Date(item.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const time = new Date(item.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <Card variant="bone" style={styles.historyCard}>
        <View style={styles.historyCardRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
              style={[styles.subjectName, { color: colors.textPrimary }]}
            >
              {item.session?.subject?.name || "Subject"}
            </Text>
            <View style={styles.historyMetaRow}>
              <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                {date.toUpperCase()}
              </Text>
              <Text style={[styles.historyDot, { color: colors.textMuted }]}>•</Text>
              <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{time}</Text>
              {item.session?.room?.name && (
                <>
                  <Text style={[styles.historyDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {item.session.room.name}
                  </Text>
                </>
              )}
            </View>
          </View>

          <Badge
            label={isPresent ? "PRESENT" : "MISSED"}
            variant={isPresent ? "present" : "missed"}
            icon={
              <Ionicons
                name={isPresent ? "checkmark-sharp" : "close-sharp"}
                size={12}
                color={isPresent ? PALETTE.pureBlack : PALETTE.boneWhite}
              />
            }
          />
        </View>
      </Card>
    );
  };

  const renderSubjectStat = ({ item }: { item: SubjectStatItem }) => {
    const percentage = Math.round(item.percentage);
    const isSafe = percentage >= 75;
    const isWarning = percentage >= 60 && percentage < 75;

    let progressColor: string = PALETTE.matchaCream;
    if (isWarning) progressColor = PALETTE.butteryYellow;
    if (!isSafe && !isWarning) progressColor = PALETTE.firecrackerRed;

    return (
      <Card variant="bone" style={styles.subjectCard}>
        <View style={styles.subjectCardHeader}>
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[styles.subjectCardTitle, { color: colors.textPrimary }]}
          >
            {item.subjectName || "Subject"}
          </Text>
          <Badge
            label={isSafe ? "SAFE" : "AT RISK"}
            variant={isSafe ? "present" : "missed"}
            size="sm"
          />
        </View>

        {/* Monospace progress bar */}
        <View
          style={[
            styles.progressBarWrapper,
            {
              backgroundColor: colors.divider,
              borderColor: isDark ? colors.border : PALETTE.inkBlack,
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(Math.max(percentage, 5), 100)}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>

        <View style={styles.subjectCardFooter}>
          <Text style={[styles.ratioText, { color: colors.textSecondary }]}>
            {item.attended} OF {item.total} CLASSES ATTENDED
          </Text>
          <Text
            style={[
              styles.percentNumber,
              { color: isSafe ? colors.textPrimary : PALETTE.firecrackerRed },
            ]}
          >
            {percentage}%
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <Container scroll={false} padded={false}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: Math.max(bottomInset, 16) + 20,
        }}
      >
        {/* Header Title */}
        <View style={styles.headerArea}>
          <Text maxFontSizeMultiplier={1.2} style={styles.screenHeading}>
            ATTENDANCE LOG
          </Text>

          {/* Segmented Control Pills */}
          <View
            style={[
              styles.segmentContainer,
              {
                backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
                borderColor: isDark ? colors.border : PALETTE.inkBlack,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewMode("recent")}
              style={[styles.segmentTab, viewMode === "recent" && styles.segmentTabActive]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  { color: isDark ? colors.textPrimary : PALETTE.inkBlack },
                  viewMode === "recent" && styles.segmentTabTextActive,
                ]}
              >
                RECENT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewMode("subjects")}
              style={[styles.segmentTab, viewMode === "subjects" && styles.segmentTabActive]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  { color: isDark ? colors.textPrimary : PALETTE.inkBlack },
                  viewMode === "subjects" && styles.segmentTabTextActive,
                ]}
              >
                BY SUBJECT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overall Status Banner */}
        <Card variant="lilac" style={styles.overallBanner}>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <View>
              <Text style={styles.overallBannerLabel}>OVERALL RECORD</Text>
              <Text style={styles.overallBannerValue}>{overallPercentage}%</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Badge
                label={overallPercentage >= 75 ? "MEETS REQUIREMENT" : "BELOW 75% TARGET"}
                variant={overallPercentage >= 75 ? "present" : "warning"}
              />
              <Text style={styles.overallBannerSub}>STREAK: {stats?.streak || 0} DAYS 🔥</Text>
            </View>
          </View>
        </Card>

        {/* Content Area */}
        {viewMode === "recent" ? (
          historyLoading && !refreshing ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={PALETTE.boneWhite} />
            </View>
          ) : historyItems.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="time-outline" size={28} color={PALETTE.hiVisYellow} />}
              title="NO RECORDINGS YET"
              description="You have not marked attendance for any sessions yet."
            />
          ) : (
            <FlashList
              data={historyItems}
              renderItem={renderHistoryItem}
              keyExtractor={(item: HistorySessionItem, index: number) =>
                item.id?.toString() || index.toString()
              }
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              contentContainerStyle={{ paddingBottom: 24 }}
              onEndReached={() => {
                if (hasNextPage) fetchNextPage();
              }}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={PALETTE.boneWhite}
                  colors={[PALETTE.duskViolet]}
                />
              }
              ListFooterComponent={() =>
                isFetchingNextPage ? (
                  <ActivityIndicator
                    size="small"
                    color={PALETTE.boneWhite}
                    style={{ marginVertical: 16 }}
                  />
                ) : null
              }
            />
          )
        ) : statsLoading && !refreshing ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={PALETTE.boneWhite} />
          </View>
        ) : subjectStats.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="book-outline" size={28} color={PALETTE.hiVisYellow} />}
            title="NO SUBJECT DATA"
            description="Subject performance records will appear here once attendance is registered."
          />
        ) : (
          <FlashList
            data={subjectStats}
            renderItem={renderSubjectStat}
            keyExtractor={(item: SubjectStatItem, index: number) =>
              item.subjectId?.toString() || index.toString()
            }
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PALETTE.boneWhite}
                colors={[PALETTE.duskViolet]}
              />
            }
          />
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    marginBottom: 14,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: PALETTE.boneWhite,
    borderRadius: RADIUS.full,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
  },
  segmentTabActive: {
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.pureBlack,
  },
  segmentTabText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.inkBlack,
    letterSpacing: 0.5,
  },
  segmentTabTextActive: {
    color: PALETTE.pureBlack,
    fontWeight: "800",
  },
  overallBanner: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  overallBannerLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: "rgba(249, 245, 242, 0.75)",
    letterSpacing: 0.5,
  },
  overallBannerValue: {
    fontSize: 26,
    fontWeight: "900",
    fontFamily: FONTS.mono,
    color: PALETTE.boneWhite,
    marginTop: 2,
  },
  overallBannerSub: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.hiVisYellow,
    marginTop: 4,
  },
  historyCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  historyCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectName: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    marginBottom: 4,
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyMetaText: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    fontWeight: "600",
    color: "rgba(26,26,26,0.65)",
  },
  historyDot: {
    fontSize: 10,
    color: "rgba(26,26,26,0.4)",
  },
  subjectCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  subjectCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  subjectCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    flex: 1,
    paddingRight: 10,
  },
  progressBarWrapper: {
    height: 10,
    backgroundColor: "rgba(26,26,26,0.1)",
    borderRadius: RADIUS.full,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.inkBlack,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: RADIUS.full,
  },
  subjectCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratioText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.65)",
  },
  percentNumber: {
    fontSize: 14,
    fontWeight: "900",
    fontFamily: FONTS.mono,
  },
  loadingWrapper: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
