import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordSchema } from "@secured_attendance/validators";
import { Ionicons } from "@expo/vector-icons";

import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { saveCachedSession, type CachedSessionData } from "@/lib/session-cache";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function ResetPasswordScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { data: session } = authClient.useSession();
  const user = session?.user as { requiresPasswordChange?: boolean } | undefined;
  const requiresPasswordChange = !!user?.requiresPasswordChange;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword") || "";
  const hasMinLength = newPasswordValue.length >= 8;

  async function onSubmit(data: ResetPasswordSchema) {
    setError(null);

    await authClient.changePassword(
      {
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: false,
      },
      {
        onError(err) {
          const rawMsg = (err.error?.message || "").toLowerCase();
          if (rawMsg.includes("invalid password") || rawMsg.includes("incorrect")) {
            setError("Your current password is incorrect. Please verify and try again.");
          } else if (rawMsg.includes("too short") || rawMsg.includes("characters")) {
            setError("New password must be at least 8 characters long.");
          } else {
            setError(err.error?.message || "Failed to update password. Please try again.");
          }
        },
        async onSuccess() {
          try {
            await new Promise((resolve) => setTimeout(resolve, 300));

            if (requiresPasswordChange) {
              try {
                await apiClient.patch("/api/auth-custom/complete-onboarding");
              } catch (patchErr: unknown) {
                const errObj = patchErr as {
                  response?: { data?: { message?: string } };
                  message?: string;
                };
                setError(
                  errObj.response?.data?.message ||
                    errObj.message ||
                    "Failed to finalize account status",
                );
                return;
              }
            }

            const freshSession = await authClient.getSession();
            if (freshSession?.data) {
              await saveCachedSession(freshSession.data as unknown as CachedSessionData);
            }

            Alert.alert("Password Updated", "Your password has been changed successfully.", [
              {
                text: "OK",
                onPress: () => {
                  if (requiresPasswordChange) {
                    router.replace("/(tabs)");
                  } else {
                    router.back();
                  }
                },
              },
            ]);
          } catch {
            setError("An unexpected error occurred. Please try again.");
          }
        },
      },
    );
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setIsLoggingOut(false);
          router.replace("/(auth)/sign-in");
        },
        onError: () => {
          setIsLoggingOut(false);
          router.replace("/(auth)/sign-in");
        },
      },
    });
  }

  const isLoading = isSubmitting || isLoggingOut;

  return (
    <Container scroll={true}>
      {!requiresPasswordChange && (
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
            <Ionicons name="key-sharp" size={32} color={PALETTE.pureBlack} />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>
            UPDATE PASSWORD
          </Text>
          <Text style={styles.subtitle}>
            Choose a strong password to protect your account and attendance credentials.
          </Text>
        </View>

        <Card variant="bone" style={styles.card}>
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-sharp" size={16} color={PALETTE.pureWhite} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>CURRENT PASSWORD</Text>
            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, value } }) => (
                <View>
                  <PasswordInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                        borderColor: isDark ? colors.border : PALETTE.inkBlack,
                        color: colors.textPrimary,
                      },
                      errors.currentPassword && { borderColor: PALETTE.firecrackerRed },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? "rgba(249,245,242,0.4)" : "rgba(26,26,26,0.4)"}
                    editable={!isLoading}
                  />
                  {errors.currentPassword && (
                    <Text style={styles.fieldError}>{errors.currentPassword.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>NEW PASSWORD</Text>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, value } }) => (
                <View>
                  <PasswordInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                        borderColor: isDark ? colors.border : PALETTE.inkBlack,
                        color: colors.textPrimary,
                      },
                      errors.newPassword && { borderColor: PALETTE.firecrackerRed },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="At least 8 characters"
                    placeholderTextColor={isDark ? "rgba(249,245,242,0.4)" : "rgba(26,26,26,0.4)"}
                    editable={!isLoading}
                  />
                  {errors.newPassword && (
                    <Text style={styles.fieldError}>{errors.newPassword.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          <View style={styles.requirementRow}>
            <Ionicons
              name={hasMinLength ? "checkmark-circle-sharp" : "ellipse-outline"}
              size={14}
              color={hasMinLength ? colors.textPrimary : colors.textMuted}
            />
            <Text
              style={[
                styles.requirementText,
                { color: colors.textMuted },
                hasMinLength && { color: colors.textPrimary, fontWeight: "700" },
              ]}
            >
              Minimum 8 characters
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>CONFIRM NEW PASSWORD</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <View>
                  <PasswordInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                        borderColor: isDark ? colors.border : PALETTE.inkBlack,
                        color: colors.textPrimary,
                      },
                      errors.confirmPassword && { borderColor: PALETTE.firecrackerRed },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Re-enter new password"
                    placeholderTextColor={isDark ? "rgba(249,245,242,0.4)" : "rgba(26,26,26,0.4)"}
                    editable={!isLoading}
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          <Button
            label={isSubmitting ? "UPDATING PASSWORD..." : "SAVE NEW PASSWORD"}
            variant="accent"
            size="lg"
            loading={isSubmitting}
            disabled={isLoading}
            onPress={handleSubmit(onSubmit)}
            icon={<Ionicons name="shield-checkmark-sharp" size={18} color={PALETTE.pureBlack} />}
            style={{ width: "100%", marginTop: 12 }}
          />

          <Button
            label={requiresPasswordChange ? "CANCEL & SIGN OUT" : "CANCEL"}
            variant="ghost"
            size="md"
            disabled={isLoading}
            onPress={requiresPasswordChange ? handleLogout : () => router.back()}
            style={{
              width: "100%",
              marginTop: 10,
              borderColor: colors.border,
            }}
            labelStyle={{ color: colors.textPrimary }}
          />
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
    fontSize: 20,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "rgba(249, 245, 242, 0.8)",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 290,
  },
  card: {
    padding: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PALETTE.firecrackerRed,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: PALETTE.pureWhite,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: FONTS.mono,
    color: PALETTE.inkBlack,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  inputBox: {
    height: 48,
    borderWidth: BORDERS.default,
    borderColor: PALETTE.inkBlack,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: PALETTE.inkBlack,
    backgroundColor: PALETTE.boneWhite,
  },
  fieldError: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: PALETTE.firecrackerRed,
    marginTop: 4,
    fontWeight: "600",
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    marginTop: -4,
  },
  requirementText: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.6)",
  },
});
