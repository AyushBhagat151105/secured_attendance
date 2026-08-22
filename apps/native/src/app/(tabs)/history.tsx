import { Text, View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Container } from "@/components/container";
import { useAttendanceHistory, useAttendanceStats } from "@/hooks/use-attendance-history";
import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  success: "#10b981",
  successBg: "rgba(16, 185, 129, 0.2)",
  warning: "#f59e0b",
  warningBg: "rgba(245, 158, 11, 0.2)",
  destructive: "#ef4444",
  destructiveBg: "rgba(239, 68, 68, 0.2)",
  secondary: "#f3f4f6",
};

export default function HistoryScreen() {
  const [viewMode, setViewMode] = useState<"recent" | "subjects">("recent");
  
  const { 
    data: historyData, 
    isLoading: historyLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAttendanceHistory();
  
  const { data: stats, isLoading: statsLoading } = useAttendanceStats();

  const historyItems = historyData?.pages.flatMap(page => page.items) || [];

  const renderHistoryItem = ({ item }: { item: any }) => {
    const isPresent = item.status === "PRESENT";
    const date = new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardContent}>
          <Text style={styles.subjectTitle}>{item.session.subject.name}</Text>
          <View style={styles.rowInfo}>
            <Text style={styles.mutedText}>{date}</Text>
            <Text style={styles.mutedText}> • {item.session.room.name}</Text>
          </View>
        </View>
        <View style={[styles.badge, isPresent ? styles.badgeSuccess : styles.badgeDestructive]}>
          <Text style={[styles.badgeText, isPresent ? styles.textSuccess : styles.textDestructive]}>
            {isPresent ? "PRESENT" : "ABSENT"}
          </Text>
        </View>
      </View>
    );
  };

  const renderSubjectStat = ({ item }: { item: any }) => {
    const percentage = Math.round(item.percentage);
    let colorStyle = styles.textSuccess;
    let bgStyle = styles.bgSuccess;
    if (percentage < 75) {
      colorStyle = styles.textWarning;
      bgStyle = styles.bgWarning;
    }
    if (percentage < 60) {
      colorStyle = styles.textDestructive;
      bgStyle = styles.bgDestructive;
    }

    return (
      <View style={styles.historyCard}>
        <View style={styles.statHeader}>
          <Text style={styles.subjectTitle} numberOfLines={1}>
            {item.subjectName}
          </Text>
          <Text style={[styles.percentageText, colorStyle]}>{percentage}%</Text>
        </View>
        
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, bgStyle, { width: `${percentage}%` }]} />
        </View>
        
        <View style={styles.statFooter}>
          <Text style={styles.mutedText}>{item.attended} Attended</Text>
          <Text style={styles.mutedText}>{item.total} Total Sessions</Text>
        </View>
      </View>
    );
  };

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Attendance</Text>
        
        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentButton, viewMode === "recent" && styles.segmentButtonActive]}
            onPress={() => setViewMode("recent")}
          >
            <Text style={[styles.segmentText, viewMode === "recent" && styles.segmentTextActive]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentButton, viewMode === "subjects" && styles.segmentButtonActive]}
            onPress={() => setViewMode("subjects")}
          >
            <Text style={[styles.segmentText, viewMode === "subjects" && styles.segmentTextActive]}>
              By Subject
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {viewMode === "recent" ? (
          historyLoading ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : historyItems.length > 0 ? (
            <FlatList
              data={historyItems}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              onEndReached={() => {
                if (hasNextPage) fetchNextPage();
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => 
                isFetchingNextPage ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16, alignSelf: 'center' }} /> : null
              }
            />
          ) : (
            <View style={styles.centerAll}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Records Yet</Text>
              <Text style={styles.emptySub}>Your attendance history will appear here.</Text>
            </View>
          )
        ) : (
          statsLoading ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : stats?.bySubject && stats.bySubject.length > 0 ? (
            <FlatList
              data={stats.bySubject}
              renderItem={renderSubjectStat}
              keyExtractor={(item) => item.subjectId}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View style={styles.centerAll}>
              <Ionicons name="pie-chart-outline" size={48} color={COLORS.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Stats Available</Text>
              <Text style={styles.emptySub}>Attend classes to see your statistics.</Text>
            </View>
          )
        )}
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
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 24,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    padding: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  segmentText: {
    fontWeight: '500',
    color: COLORS.muted,
  },
  segmentTextActive: {
    color: COLORS.foreground,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
  },
  subjectTitle: {
    color: COLORS.foreground,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mutedText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeSuccess: {
    backgroundColor: COLORS.successBg,
  },
  badgeDestructive: {
    backgroundColor: COLORS.destructiveBg,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: COLORS.success,
  },
  textWarning: {
    color: COLORS.warning,
  },
  textDestructive: {
    color: COLORS.destructive,
  },
  bgSuccess: {
    backgroundColor: COLORS.success,
  },
  bgWarning: {
    backgroundColor: COLORS.warning,
  },
  bgDestructive: {
    backgroundColor: COLORS.destructive,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentageText: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
  },
  statFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  centerAll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.foreground,
    fontWeight: '500',
    fontSize: 18,
    marginBottom: 4,
  },
  emptySub: {
    color: COLORS.muted,
    textAlign: 'center',
  },
});
