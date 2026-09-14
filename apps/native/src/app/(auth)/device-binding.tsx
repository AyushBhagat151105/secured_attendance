import { useState, useEffect } from "react";
import { Text, View, Alert, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { clearAllCachedAuth } from "@/lib/session-cache";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDeviceFingerprint } from "@/lib/device";
import * as LocalAuthentication from "expo-local-authentication";
import { useQueryClient } from "@tanstack/react-query";
import { useStudentProfile, profileKeys } from "@/hooks/api/use-profile";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function DeviceBindingScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ id: string; name: string } | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useAppTheme();
  const { data: profile } = useStudentProfile();

  const isAlreadyBound = !!profile?.deviceBound;
  const boundModel = profile?.deviceModel || deviceInfo?.name || "Registered Phone";
  const boundId = profile?.deviceId || deviceInfo?.id || "N/A";
  const isCurrentDeviceMatch = !profile?.deviceId || (deviceInfo?.id && profile?.deviceId === deviceInfo.id);

  useEffect(() => {
    async function loadDevice() {
      const info = await getDeviceFingerprint();
      setDeviceInfo(info);
    }
    loadDevice();
  }, []);

  async function handleBindDevice() {
    if (!deviceInfo) return;

    setIsLoading(true);

    try {
      // 1. Biometric Check
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to bind your attendance device",
          cancelLabel: "Cancel",
          disableDeviceFallback: false,
        });
        if (!authResult.success) {
          setIsLoading(false);
          return;
        }
      }

      // 2. Hit the real device binding endpoint
      try {
        await apiClient.post("/api/auth-custom/device-bind", {
          deviceId: deviceInfo.id,
          deviceName: deviceInfo.name,
          biometricEnabled: hasHardware && isEnrolled,
        });
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        throw new Error(errorObj.response?.data?.message || errorObj.message || "Failed to bind device", { cause: err });
      }

      // Refetch profile cache so it gets the new deviceBound status
      await queryClient.refetchQueries({ queryKey: profileKeys.student() });

      // Continue to app
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      Alert.alert("Device Binding Failed", errorObj.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setIsLoading(true);
    try {
      await clearAllCachedAuth();
      await authClient.signOut();
    } finally {
      setIsLoading(false);
      router.replace("/(auth)/sign-in");
    }
  }

  return (
    <Container scroll={true}>
      {isAlreadyBound && (
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: isDark ? PALETTE.darkCard : PALETTE.boneWhite,
                borderColor: isDark ? colors.border : PALETTE.inkBlack,
              },
            ]}
          >
            <Ionicons
              name="arrow-back-sharp"
              size={20}
              color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons
              name={isAlreadyBound ? "shield-checkmark-sharp" : "hardware-chip-sharp"}
              size={36}
              color={PALETTE.pureBlack}
            />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>
            {isAlreadyBound ? "HARDWARE SECURITY DETAILS" : "DEVICE SECURITY BINDING"}
          </Text>
          <Text style={styles.subtitle}>
            {isAlreadyBound
              ? "Your attendance credentials are cryptographically locked to this smartphone."
              : "Attendance is strictly cryptographically locked to one student phone to prevent proxy attendance."}
          </Text>
        </View>

        <Card variant="bone" style={styles.card}>
          {isAlreadyBound ? (
            <>
              <View style={styles.deviceInfoContainer}>
                <View
                  style={[
                    styles.phoneIconCircle,
                    {
                      backgroundColor: PALETTE.matchaCream,
                      borderColor: isDark ? colors.border : PALETTE.inkBlack,
                    },
                  ]}
                >
                  <Ionicons name="phone-portrait-sharp" size={24} color={PALETTE.pureBlack} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceLabel, { color: colors.textMuted }]}>REGISTERED MODEL</Text>
                  <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                    {boundModel}
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    <Badge label="DEVICE BOUND & ACTIVE" variant="present" size="sm" />
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>DEVICE FINGERPRINT</Text>
                <Text numberOfLines={1} style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {boundId}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>BIOMETRICS STATUS</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {profile?.biometricEnabled ? "Biometric Auth Active" : "Hardware Signature Only"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>DEVICE VERIFICATION</Text>
                <Text style={[styles.detailValue, { color: isCurrentDeviceMatch ? PALETTE.matchaCream : PALETTE.firecrackerRed }]}>
                  {isCurrentDeviceMatch ? "✓ Matches Active Phone" : "⚠️ Device Mismatch"}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <Button
                label="BACK TO SETTINGS"
                variant="accent"
                size="lg"
                onPress={() => router.back()}
                icon={<Ionicons name="arrow-back-sharp" size={18} color={PALETTE.pureBlack} />}
                style={{ width: "100%", marginVertical: 6 }}
              />

              <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                Notice: To rebind to a new phone (in case of loss or replacement), contact your department administrator.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.deviceInfoContainer}>
                <View
                  style={[
                    styles.phoneIconCircle,
                    {
                      backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                      borderColor: isDark ? colors.border : PALETTE.inkBlack,
                    },
                  ]}
                >
                  <Ionicons
                    name="phone-portrait-sharp"
                    size={24}
                    color={isDark ? PALETTE.boneWhite : PALETTE.pureBlack}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceLabel, { color: colors.textMuted }]}>DETECTED HARDWARE</Text>
                  <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                    {deviceInfo ? deviceInfo.name : "Detecting device..."}
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    <Badge label="READY TO BIND" variant="live" size="sm" />
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <Button
                label={isLoading ? "VERIFYING & BINDING..." : "BIND THIS DEVICE NOW"}
                variant="accent"
                size="lg"
                loading={isLoading}
                disabled={isLoading || !deviceInfo}
                onPress={handleBindDevice}
                icon={<Ionicons name="shield-checkmark-sharp" size={18} color={PALETTE.pureBlack} />}
                style={{ width: "100%", marginTop: 8 }}
              />

              <Button
                label="CANCEL & SIGN OUT"
                variant="ghost"
                size="md"
                disabled={isLoading}
                onPress={handleLogout}
                style={{
                  width: "100%",
                  marginTop: 8,
                  marginBottom: 4,
                  borderColor: colors.border,
                }}
                labelStyle={{ color: colors.textPrimary }}
              />

              <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                Note: This device will become your registered attendance device. To swap phones later, contact your department administrator.
              </Text>
            </>
          )}
        </Card>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    borderWidth: BORDERS.default,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.hiVisYellow,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.pureBlack,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "rgba(249, 245, 242, 0.8)",
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 300,
  },
  card: {
    padding: 20,
  },
  deviceInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  phoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: BORDERS.default,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    letterSpacing: 0.5,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: FONTS.display,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailKey: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: FONTS.mono,
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 8,
  },
});
