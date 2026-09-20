import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { clearAllCachedAuth, getCachedProfile, saveCachedProfile } from "@/lib/session-cache";
import { getDeviceFingerprint } from "@/lib/device";
import { profileKeys } from "@/hooks/api/use-profile";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

const REASON_PRESETS = [
  { id: "UPGRADE", label: "Upgraded to a new phone" },
  { id: "REPAIRED", label: "Phone repaired / factory reset" },
  { id: "TEMPORARY", label: "Using temporary device" },
  { id: "OTHER", label: "Other reason" },
];

export default function DeviceMismatchScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useAppTheme();

  const [boundModel, setBoundModel] = useState<string>("Registered Device");
  const [currentDevice, setCurrentDevice] = useState<{ id: string; name: string } | null>(null);

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState<string>("UPGRADE");
  const [customNote, setCustomNote] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkStatus = useCallback(
    async (showFeedback = false) => {
      if (showFeedback) setIsCheckingStatus(true);
      try {
        const [profileRes, statusRes] = await Promise.all([
          apiClient.get("/api/student/profile").catch(() => null),
          apiClient.get("/api/student/device/rebind-request/status").catch(() => null),
        ]);

        const profile = profileRes?.data;
        if (profile) {
          await saveCachedProfile(profile);
          if (profile.deviceModel) {
            setBoundModel(profile.deviceModel);
          }

          // If admin unbound the device, immediately proceed to device-binding!
          if (!profile.deviceBound) {
            await queryClient.invalidateQueries({ queryKey: profileKeys.student() });
            router.replace("/(auth)/device-binding");
            return;
          }
        }

        const statusData = statusRes?.data;
        if (statusData?.hasPending) {
          setPendingRequest(statusData.request);
          if (showFeedback) {
            Alert.alert(
              "Request Pending",
              "Your re-bind request is currently pending administrator approval. Please check back shortly.",
            );
          }
        } else {
          setPendingRequest(null);
          if (showFeedback) {
            Alert.alert(
              "Status Checked",
              "No pending requests found. You can submit a new re-bind request below.",
            );
          }
        }
      } catch (err) {
        console.error("Failed to check rebind status:", err);
      } finally {
        setIsLoadingStatus(false);
        if (showFeedback) setIsCheckingStatus(false);
      }
    },
    [queryClient, router],
  );

  useEffect(() => {
    async function init() {
      const [cached, device] = await Promise.all([
        getCachedProfile(),
        getDeviceFingerprint(),
      ]);

      if (cached?.deviceModel) {
        setBoundModel(cached.deviceModel);
      }
      setCurrentDevice(device);

      await checkStatus(false);
    }
    init();
  }, [checkStatus]);

  async function handleSubmitRequest() {
    if (!currentDevice) return;

    const presetObj = REASON_PRESETS.find((r) => r.id === selectedReason);
    let finalReason = presetObj ? presetObj.label : selectedReason;
    if (selectedReason === "OTHER" && customNote.trim()) {
      finalReason = customNote.trim();
    } else if (customNote.trim()) {
      finalReason = `${finalReason}: ${customNote.trim()}`;
    }

    if (finalReason.length < 3) {
      setErrorMessage("Please enter a valid reason for device re-binding.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const osName = Platform.OS === "android" ? "Android" : "iOS";
      const osVer = Platform.Version ? `${osName} ${Platform.Version}` : osName;

      const res = await apiClient.post("/api/student/device/rebind-request", {
        requestedDeviceId: currentDevice.id,
        requestedDeviceModel: currentDevice.name,
        requestedDeviceOs: osVer,
        reason: finalReason,
      });

      if (res.data?.success) {
        setPendingRequest(res.data.request);
        Alert.alert(
          "Request Submitted",
          "Your device re-bind request has been sent to your administrator. Once approved, you will be able to bind this phone automatically.",
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Failed to submit re-bind request";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await clearAllCachedAuth();
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
      router.replace("/(auth)/sign-in");
    }
  }

  return (
    <Container scroll={true}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="swap-horizontal-sharp" size={36} color={PALETTE.boneWhite} />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>
            DEVICE AUTHORIZATION
          </Text>
          <Text style={styles.subtitle}>
            Your account is locked to your registered phone to protect attendance integrity.
          </Text>
        </View>

        {/* Hardware Comparison Card */}
        <Card variant="bone" style={styles.deviceComparisonCard}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
            DEVICE SIGNATURE VERIFICATION
          </Text>

          <View style={styles.comparisonRow}>
            <View style={styles.deviceBox}>
              <View style={[styles.deviceIconCircle, { backgroundColor: "rgba(197, 66, 69, 0.15)" }]}>
                <Ionicons name="lock-closed-sharp" size={20} color={PALETTE.firecrackerRed} />
              </View>
              <Text style={styles.deviceRole}>REGISTERED PHONE</Text>
              <Text style={styles.deviceName} numberOfLines={2}>
                {boundModel}
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />

            <View style={styles.deviceBox}>
              <View style={[styles.deviceIconCircle, { backgroundColor: "rgba(133, 132, 189, 0.2)" }]}>
                <Ionicons name="phone-portrait-sharp" size={20} color={PALETTE.duskViolet} />
              </View>
              <Text style={styles.deviceRole}>CURRENT PHONE</Text>
              <Text style={styles.deviceName} numberOfLines={2}>
                {currentDevice?.name || "This Device"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Dynamic State: Pending or Request Form */}
        {isLoadingStatus ? (
          <Card variant="bone" style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}>
            <ActivityIndicator size="small" color={PALETTE.duskViolet} />
            <Text style={{ marginTop: 12, fontSize: 12, fontFamily: FONTS.body, color: colors.textSecondary }}>
              Checking re-bind status...
            </Text>
          </Card>
        ) : pendingRequest ? (
          /* Pending Request Status Card */
          <Card variant="bone" style={styles.card}>
            <View style={styles.pendingBadge}>
              <Ionicons name="time-sharp" size={18} color={PALETTE.boneWhite} />
              <Text style={styles.pendingBadgeText}>RE-BIND REQUEST PENDING REVIEW</Text>
            </View>

            <Text style={[styles.pendingDescription, { color: colors.textSecondary }]}>
              Your request to bind this new device has been forwarded to your department administrator.
            </Text>

            <View style={styles.requestDetailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Requested Device:</Text>
                <Text style={styles.detailValue}>{pendingRequest.requestedDeviceModel}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason:</Text>
                <Text style={styles.detailValue}>{pendingRequest.reason}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted:</Text>
                <Text style={styles.detailValue}>
                  {new Date(pendingRequest.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            <Button
              label={isCheckingStatus ? "CHECKING..." : "CHECK APPROVAL STATUS"}
              variant="primary"
              size="lg"
              loading={isCheckingStatus}
              onPress={() => checkStatus(true)}
              icon={<Ionicons name="refresh-sharp" size={18} color={PALETTE.pureBlack} />}
              style={{ width: "100%", marginTop: 14 }}
            />

            <Text style={styles.hintText}>
              Once approved, tapping "Check Approval Status" will take you directly to biometric registration.
            </Text>
          </Card>
        ) : (
          /* New Re-bind Request Form */
          <Card variant="bone" style={styles.card}>
            <Text style={styles.formTitle}>REQUEST DEVICE RE-BIND</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Switched to a new smartphone? Select a reason below to send a re-bind request to your administrator.
            </Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-sharp" size={16} color={PALETTE.boneWhite} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.presetsContainer}>
              {REASON_PRESETS.map((preset) => {
                const isSelected = selectedReason === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedReason(preset.id)}
                    style={[
                      styles.presetButton,
                      isSelected && styles.presetButtonSelected,
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={16}
                      color={isSelected ? PALETTE.inkBlack : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.presetText,
                        isSelected && styles.presetTextSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                  color: isDark ? PALETTE.boneWhite : PALETTE.inkBlack,
                  borderColor: isDark ? "rgba(255,255,255,0.15)" : "#ccc",
                },
              ]}
              placeholder="Additional details (optional)..."
              placeholderTextColor={colors.textSecondary}
              value={customNote}
              onChangeText={setCustomNote}
              multiline={true}
              numberOfLines={2}
            />

            <Button
              label={isSubmitting ? "SUBMITTING..." : "SEND RE-BIND REQUEST"}
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleSubmitRequest}
              icon={<Ionicons name="paper-plane-sharp" size={18} color={PALETTE.pureBlack} />}
              style={{ width: "100%", marginTop: 14 }}
            />
          </Card>
        )}

        {/* Fallback Action */}
        <Button
          label={isSigningOut ? "SIGNING OUT..." : "SIGN OUT OF THIS DEVICE"}
          variant="ghost"
          size="md"
          loading={isSigningOut}
          onPress={handleSignOut}
          icon={<Ionicons name="log-out-outline" size={18} color={PALETTE.boneWhite} />}
          style={{ width: "100%", marginTop: 16 }}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.duskViolet,
    borderWidth: BORDERS.heavy,
    borderColor: PALETTE.boneWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "rgba(249, 245, 242, 0.8)",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
  deviceComparisonCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deviceBox: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  deviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  deviceRole: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    textAlign: "center",
  },
  card: {
    padding: 18,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: FONTS.display,
    color: PALETTE.inkBlack,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.body,
    lineHeight: 16,
    marginBottom: 14,
  },
  presetsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  presetButtonSelected: {
    borderColor: PALETTE.inkBlack,
    backgroundColor: PALETTE.hiVisYellow,
  },
  presetText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "#444",
  },
  presetTextSelected: {
    fontWeight: "700",
    color: PALETTE.inkBlack,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: 13,
    fontFamily: FONTS.body,
    minHeight: 52,
    textAlignVertical: "top",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PALETTE.firecrackerRed,
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: PALETTE.boneWhite,
    flex: 1,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#d97706",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.boneWhite,
    letterSpacing: 0.5,
  },
  pendingDescription: {
    fontSize: 13,
    fontFamily: FONTS.body,
    lineHeight: 18,
    marginBottom: 14,
  },
  requestDetailsBox: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: RADIUS.sm,
    padding: 12,
    gap: 6,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: "#666",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: FONTS.body,
    color: PALETTE.inkBlack,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  hintText: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 15,
  },
});
