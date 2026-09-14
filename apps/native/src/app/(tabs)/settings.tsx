import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { authClient, SERVER_URL } from "@/lib/auth-client";
import { clearAllCachedAuth } from "@/lib/session-cache";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { useAppTheme } from "@/contexts/app-theme-context";
import { getPendingScansCount, syncPendingAttendance } from "@/lib/offline-sync";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
  const { bottomInset } = useResponsive();

  const [signingOut, setSigningOut] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    getPendingScansCount().then(setOfflineCount);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncPendingAttendance();
      const remaining = await getPendingScansCount();
      setOfflineCount(remaining);
      Alert.alert(
        "Offline Sync",
        synced > 0
          ? `Successfully synchronized ${synced} attendance record(s)!`
          : "All pending scans are already up to date.",
      );
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      Alert.alert("Sync Error", errorObj.message || "Failed to sync offline scans.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await clearAllCachedAuth();
            await authClient.signOut();
          } finally {
            router.replace("/(auth)/sign-in");
          }
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const serverUrl = SERVER_URL;

  return (
    <Container scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: Math.max(bottomInset, 16) + 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text maxFontSizeMultiplier={1.2} style={styles.screenHeading}>
          SYSTEM SETTINGS
        </Text>

        {/* Security Section */}
        <SectionHeader title="SECURITY" />
        <Card variant="bone" style={styles.groupedCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(auth)/reset-password")}
            style={styles.row}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: PALETTE.matchaCream, borderColor: isDark ? colors.border : PALETTE.inkBlack }]}>
                <Ionicons name="lock-closed-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Update Password</Text>
            </View>
            <Ionicons name="chevron-forward-sharp" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(auth)/device-binding")}
            style={styles.row}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: PALETTE.bubblegumPink, borderColor: isDark ? colors.border : PALETTE.inkBlack }]}>
                <Ionicons name="phone-portrait-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Hardware Binding Details</Text>
            </View>
            <Ionicons name="chevron-forward-sharp" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Offline Queue Section */}
        <SectionHeader title="OFFLINE STORAGE" style={{ marginTop: 20 }} />
        <Card variant="bone" style={styles.groupedCard}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: PALETTE.butteryYellow, borderColor: isDark ? colors.border : PALETTE.inkBlack }]}>
                <Ionicons name="cloud-offline-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Queued Scans</Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  {offlineCount} scan{offlineCount === 1 ? "" : "s"} waiting to sync
                </Text>
              </View>
            </View>

            <Button
              label={isSyncing ? "SYNCING..." : "SYNC NOW"}
              variant="accent"
              size="sm"
              loading={isSyncing}
              disabled={offlineCount === 0 || isSyncing}
              onPress={handleManualSync}
            />
          </View>
        </Card>

        {/* App Info Section */}
        <SectionHeader title="APPLICATION" style={{ marginTop: 20 }} />
        <Card variant="bone" style={styles.groupedCard}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons
                  name="information-sharp"
                  size={18}
                  color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
                />
              </View>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>App Version</Text>
            </View>
            <Badge label={`V${appVersion}`} variant="neutral" size="sm" />
          </View>

          {/* Never show Server Gateway on production or preview builds */}
          {__DEV__ && (
            <>
              <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                        borderColor: isDark ? colors.border : PALETTE.inkBlack,
                      },
                    ]}
                  >
                    <Ionicons
                      name="server-sharp"
                      size={18}
                      color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
                    />
                  </View>
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Server Gateway (Dev Only)</Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontFamily: FONTS.mono,
                    color: colors.textMuted,
                    maxWidth: 160,
                  }}
                >
                  {serverUrl}
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Sign Out Button */}
        <Button
          label="SIGN OUT"
          variant="destructive"
          size="lg"
          loading={signingOut}
          onPress={handleSignOut}
          icon={<Ionicons name="log-out-sharp" size={18} color={PALETTE.boneWhite} />}
          style={{ marginTop: 24 }}
        />
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
  groupedCard: {
    paddingVertical: 6,
    paddingHorizontal: 0,
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
    gap: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.boneWhite,
    borderWidth: BORDERS.hairline,
    borderColor: PALETTE.inkBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: FONTS.body,
    color: PALETTE.inkBlack,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.6)",
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(26,26,26,0.1)",
    marginHorizontal: 16,
  },
});
