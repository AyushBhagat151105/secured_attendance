import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PALETTE, FONTS, RADIUS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

interface ScanSuccessModalProps {
  isOffline?: boolean;
  statusMessage: string;
  streak: number;
  onDismiss: () => void;
}

export function ScanSuccessModal({
  isOffline,
  statusMessage,
  streak,
  onDismiss,
}: ScanSuccessModalProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.backdrop}>
      <Card variant="bone" style={styles.card}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isOffline
                ? PALETTE.butteryYellow
                : PALETTE.matchaCream,
            },
          ]}
        >
          <Ionicons
            name={isOffline ? "cloud-done-sharp" : "checkmark-done-sharp"}
            size={40}
            color={PALETTE.pureBlack}
          />
        </View>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {isOffline ? "SAVED OFFLINE" : "ATTENDANCE SECURED!"}
        </Text>

        <View style={styles.streakNoticePill}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <Text style={styles.streakNoticeText}>STREAK ACTIVE: {streak} DAYS</Text>
        </View>

        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {statusMessage}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.detailsRow}>
          <View style={{ gap: 4 }}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              TIMESTAMP
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <View style={{ gap: 4, alignItems: "flex-end" }}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              VERIFICATION
            </Text>
            <Badge
              label={isOffline ? "CACHED" : "GPS VERIFIED"}
              variant={isOffline ? "offline" : "present"}
              size="sm"
            />
          </View>
        </View>

        <Button
          label="DONE & RETURN HOME"
          variant="accent"
          size="lg"
          onPress={onDismiss}
          style={{ width: "100%", marginTop: 20 }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 17, 36, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "900",
    fontFamily: FONTS.display,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  streakNoticePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244, 237, 54, 0.15)",
    borderWidth: 1,
    borderColor: PALETTE.hiVisYellow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  streakNoticeText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.hiVisYellow,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 13,
    fontFamily: FONTS.body,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: FONTS.mono,
  },
});
