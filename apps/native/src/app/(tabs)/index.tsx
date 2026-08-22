import { Text, View, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Container } from "@/components/container";
import { useTodaySchedule } from "@/hooks/use-schedule";
import { useAttendanceStats } from "@/hooks/use-attendance-history";
import { authClient } from "@/lib/auth-client";
import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  success: "#10b981",
  orange: "#f97316",
};

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const { data: schedule, isLoading: scheduleLoading } = useTodaySchedule();
  const { data: stats, isLoading: statsLoading } = useAttendanceStats();
  const router = useRouter();

  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "Student";
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const renderScheduleItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.subjectName}>{item.subject.name}</Text>
        <View style={styles.rowInfo}>
          <Ionicons name="time-outline" size={14} color={COLORS.muted} />
          <Text style={styles.infoText}>{item.startTime} - {item.endTime}</Text>
        </View>
        <View style={styles.rowDetails}>
          <View style={styles.rowInfo}>
            <Ionicons name="location-outline" size={14} color={COLORS.muted} />
            <Text style={styles.infoText}>{item.room.name}</Text>
          </View>
          <View style={[styles.rowInfo, { marginLeft: 12 }]}>
            <Ionicons name="person-outline" size={14} color={COLORS.muted} />
            <Text style={styles.infoText}>{item.teacher.name}</Text>
          </View>
        </View>
      </View>
      
      {item.activeSession && (
        <TouchableOpacity 
          onPress={() => router.push("/(tabs)/scan")}
          style={[styles.scanButton, { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8 }]}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Scan</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Container style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.greetingText}>Hi, {firstName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
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
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                <Text style={{ fontSize: 20 }}>🔥</Text>
              </View>
              <Text style={styles.statValue}>{stats?.streak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statBox}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="pie-chart" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>
                {stats?.overallPercentage ? Math.round(stats.overallPercentage) : 0}%
              </Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
          </View>
        )}
      </View>

      {/* Schedule Section */}
      <View style={styles.scheduleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
        </View>
        
        <View style={styles.listContainer}>
          {scheduleLoading ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : schedule && schedule.length > 0 ? (
            <FlatList
              data={schedule}
              renderItem={renderScheduleItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={48} color={COLORS.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyStateTitle}>No Classes Today</Text>
              <Text style={styles.emptyStateSub}>Take a break or check your upcoming schedule.</Text>
            </View>
          )}
        </View>
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
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateText: {
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  statsLoading: {
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    paddingRight: 8,
  },
  subjectName: {
    color: COLORS.foreground,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowDetails: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 32,
  },
  emptyStateTitle: {
    color: COLORS.foreground,
    fontWeight: '500',
    fontSize: 18,
    marginBottom: 4,
  },
  emptyStateSub: {
    color: COLORS.muted,
    textAlign: 'center',
  },
});
