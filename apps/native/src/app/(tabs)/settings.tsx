import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
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
import { checkAndApplyUpdates } from "@/lib/updates";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useResponsive } from "@/hooks/use-responsive";

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
  const { bottomInset } = useResponsive();

  const [signingOut, setSigningOut] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    getPendingScansCount().then(setOfflineCount);
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      await checkAndApplyUpdates(true);
    } finally {
      setCheckingUpdate(false);
    }
  };

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

  const handleOpenLink = async (url: string, label: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert("Link Error", `Could not open ${label} (${url})`);
    }
  };

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
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.matchaCream,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
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
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.bubblegumPink,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="phone-portrait-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                Hardware Binding Details
              </Text>
            </View>
            <Ionicons name="chevron-forward-sharp" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Offline Queue Section */}
        <SectionHeader title="OFFLINE STORAGE" style={{ marginTop: 20 }} />
        <Card variant="bone" style={styles.groupedCard}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.butteryYellow,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
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

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.hiVisYellow,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="cloud-download-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>System Updates</Text>
                <Text style={[styles.rowSub, { color: isDark ? "rgba(249, 245, 242, 0.85)" : colors.textMuted }]}>
                  {checkingUpdate ? "Checking server for updates..." : "Over-The-Air & APK Auto-Update"}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.linkActionBadge,
                {
                  backgroundColor: isDark ? "rgba(244, 237, 54, 0.15)" : "rgba(26, 26, 26, 0.08)",
                  borderColor: isDark ? "rgba(244, 237, 54, 0.4)" : "rgba(26, 26, 26, 0.2)",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.linkActionText,
                  { color: isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack },
                ]}
              >
                {checkingUpdate ? "CHECKING" : "CHECK"}
              </Text>
              <Ionicons name="refresh-sharp" size={13} color={isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack} />
            </View>
          </TouchableOpacity>

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
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                    Server Gateway (Dev Only)
                  </Text>
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

        {/* Institution & Developer Credits Section */}
        <SectionHeader title="INSTITUTION & DEVELOPER CREDITS" style={{ marginTop: 20 }} />
        <Card variant="bone" style={styles.groupedCard}>
          {/* Official Campus & Department Logos Showcase */}
          <View style={styles.logoBanner}>
            <View style={styles.logoBadgeContainer}>
              <View style={styles.charusatBox}>
                <Image
                  source={require("@/../assets/images/charusat-logo.png")}
                  style={styles.charusatLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.logoDivider} />
              <View style={styles.cmpicaBox}>
                <Image
                  source={require("@/../assets/images/cmpica-logo.webp")}
                  style={styles.cmpicaLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.logoHeaderTextContainer}>
              <Text style={[styles.logoHeaderTitle, { color: colors.textPrimary }]}>
                CHARUSAT • CMPICA
              </Text>
              <Text style={[styles.logoHeaderSub, { color: isDark ? "rgba(249, 245, 242, 0.85)" : colors.textMuted }]}>
                Charotar University of Science & Technology
              </Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.matchaCream,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="school-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>University</Text>
                <Text style={[styles.rowSub, { color: isDark ? "rgba(249, 245, 242, 0.85)" : colors.textMuted }]}>
                  CHARUSAT • Changa, Gujarat 388421
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.bubblegumPink,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="business-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Department</Text>
                <Text style={[styles.rowSub, { color: isDark ? "rgba(249, 245, 242, 0.85)" : colors.textMuted }]}>
                  CMPICA (Computer Applications)
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: PALETTE.hiVisYellow,
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="code-slash-sharp" size={18} color={PALETTE.pureBlack} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Lead Developer</Text>
                <Text style={[styles.rowSub, { color: isDark ? PALETTE.hiVisYellow : colors.textMuted }]}>
                  Ayush Bhagat (Solo Architect)
                </Text>
              </View>
            </View>
            <Badge label="CREATOR" variant="live" size="sm" />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Interactive GitHub Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={() =>
              handleOpenLink(
                "https://github.com/ayushbhagat151105",
                "GitHub Portfolio"
              )
            }
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? "#24292e" : PALETTE.pureBlack,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="logo-github" size={18} color={PALETTE.pureWhite} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>GitHub Portfolio</Text>
                <Text style={[styles.rowSub, { color: isDark ? "rgba(249, 245, 242, 0.9)" : colors.textMuted }]}>
                  github.com/ayushbhagat151105
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.linkActionBadge,
                {
                  backgroundColor: isDark ? "rgba(244, 237, 54, 0.15)" : "rgba(26, 26, 26, 0.08)",
                  borderColor: isDark ? "rgba(244, 237, 54, 0.4)" : "rgba(26, 26, 26, 0.2)",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.linkActionText,
                  { color: isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack },
                ]}
              >
                VIEW
              </Text>
              <Ionicons name="open-outline" size={13} color={isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Interactive Instagram Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={() =>
              handleOpenLink(
                "https://www.instagram.com/bhagat_ayush__/",
                "Instagram Profile"
              )
            }
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: "#E1306C",
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="logo-instagram" size={18} color={PALETTE.pureWhite} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Instagram</Text>
                <Text style={[styles.rowSub, { color: isDark ? "rgba(249, 245, 242, 0.9)" : colors.textMuted }]}>
                  @bhagat_ayush__
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.linkActionBadge,
                {
                  backgroundColor: isDark ? "rgba(244, 237, 54, 0.15)" : "rgba(26, 26, 26, 0.08)",
                  borderColor: isDark ? "rgba(244, 237, 54, 0.4)" : "rgba(26, 26, 26, 0.2)",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.linkActionText,
                  { color: isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack },
                ]}
              >
                FOLLOW
              </Text>
              <Ionicons name="open-outline" size={13} color={isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Interactive LinkedIn Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={() =>
              handleOpenLink(
                "https://www.linkedin.com/in/ayush-bhagat-99b7b82b3/",
                "LinkedIn Profile"
              )
            }
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: "#0A66C2",
                    borderColor: isDark ? colors.border : PALETTE.inkBlack,
                  },
                ]}
              >
                <Ionicons name="logo-linkedin" size={18} color={PALETTE.pureWhite} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>LinkedIn Profile</Text>
                <Text style={[styles.rowSub, { color: isDark ? "rgba(249, 245, 242, 0.9)" : colors.textMuted }]}>
                  linkedin.com/in/ayush-bhagat
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.linkActionBadge,
                {
                  backgroundColor: isDark ? "rgba(244, 237, 54, 0.15)" : "rgba(26, 26, 26, 0.08)",
                  borderColor: isDark ? "rgba(244, 237, 54, 0.4)" : "rgba(26, 26, 26, 0.2)",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.linkActionText,
                  { color: isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack },
                ]}
              >
                CONNECT
              </Text>
              <Ionicons name="open-outline" size={13} color={isDark ? PALETTE.hiVisYellow : PALETTE.pureBlack} />
            </View>
          </TouchableOpacity>
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
    color: PALETTE.boneWhite,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: "rgba(249, 245, 242, 0.85)",
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(249, 245, 242, 0.12)",
    marginHorizontal: 16,
  },
  logoBanner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
  },
  logoBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  charusatBox: {
    height: 38,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: PALETTE.pureWhite,
    borderRadius: RADIUS.sm,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  charusatLogo: {
    height: 22,
    width: 80,
  },
  logoDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(249, 245, 242, 0.2)",
  },
  cmpicaBox: {
    height: 38,
    width: 38,
    padding: 3,
    backgroundColor: PALETTE.pureWhite,
    borderRadius: RADIUS.sm,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  cmpicaLogo: {
    height: "100%",
    width: "100%",
  },
  logoHeaderTextContainer: {
    alignItems: "center",
  },
  logoHeaderTitle: {
    fontSize: 13,
    fontWeight: "900",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    color: PALETTE.boneWhite,
  },
  logoHeaderSub: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    marginTop: 2,
    color: "rgba(249, 245, 242, 0.85)",
  },
  linkActionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(244, 237, 54, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 237, 54, 0.4)",
  },
  linkActionText: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    letterSpacing: 0.5,
    color: PALETTE.hiVisYellow,
  },
});
