import { useState } from "react";
import { Text, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInSchema } from "@secured_attendance/validators";
import { Ionicons } from "@expo/vector-icons";

import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { getDeviceFingerprint } from "@/lib/device";
import {
  clearAllCachedAuth,
  saveCachedSession,
  saveCachedProfile,
  type CachedSessionData,
} from "@/lib/session-cache";
import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PALETTE, FONTS, RADIUS, BORDERS } from "@/lib/theme";
import { useAppTheme } from "@/contexts/app-theme-context";
import { queryClient } from "../_layout";

export default function SignInScreen() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignInSchema) {
    setError(null);
    const trimmedEmail = data.email.trim().toLowerCase();
    const rawPassword = data.password;

    await authClient.signIn.email(
      {
        email: trimmedEmail,
        password: rawPassword,
      },
      {
        onError(err) {
          const rawMsg = (err.error?.message || "").toLowerCase();
          const code = (err.error?.code || "").toLowerCase();

          if (
            !rawMsg ||
            rawMsg.includes("fetch") ||
            rawMsg.includes("network") ||
            rawMsg.includes("failed to fetch")
          ) {
            setError(
              "No network connection. Please connect to campus WiFi or mobile data to sign in.",
            );
          } else if (
            rawMsg.includes("invalid password") ||
            rawMsg.includes("invalid email or password") ||
            rawMsg.includes("credential") ||
            code.includes("invalid_password")
          ) {
            setError("Incorrect email or password. Please verify and try again.");
          } else if (rawMsg.includes("user not found") || code.includes("user_not_found")) {
            setError("No student account found with this email. Contact your college admin.");
          } else {
            setError(err.error?.message || "Failed to sign in. Please check your credentials.");
          }
        },
        async onSuccess() {
          try {
            // 1. Fetch fresh session and cache it for offline support
            const [sessionRes, profileRes, device] = await Promise.all([
              authClient.getSession(),
              apiClient.get("/api/student/profile").catch(() => null),
              getDeviceFingerprint(),
            ]);

            if (sessionRes?.data) {
              await saveCachedSession(sessionRes.data as unknown as CachedSessionData);
            }

            const p = profileRes?.data;
            if (p) {
              await saveCachedProfile(p);
            }

            // 2. Hardware ID check: verify this device matches the bound phone
            if (p?.deviceBound && p?.deviceId && p.deviceId !== device.id) {
              await clearAllCachedAuth();
              await authClient.signOut();
              setError(
                `Account locked: Your profile is bound to ${p.deviceModel || "another phone"}. You cannot log in from this device. Contact your admin to rebind.`,
              );
              return;
            }

            // 3. Invalidate queries so tabs load fresh data
            await queryClient.invalidateQueries();

            // 4. Navigate immediately to target screen
            const user = sessionRes?.data?.user as
              { role?: string; requiresPasswordChange?: boolean } | undefined;
            if (user?.requiresPasswordChange) {
              router.replace("/(auth)/reset-password");
            } else if (user?.role === "student" && p && !p.deviceBound) {
              router.replace("/(auth)/device-binding");
            } else {
              router.replace("/(tabs)");
            }
          } catch (navErr) {
            console.error("Navigation after sign-in error:", navErr);
            router.replace("/(tabs)");
          }
        },
      },
    );
  }

  return (
    <Container scroll={true}>
      <View style={styles.contentWrapper}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandIconBox}>
            <Ionicons name="shield-checkmark-sharp" size={32} color={PALETTE.pureBlack} />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={styles.brandTitle}>
            SECURED ATTENDANCE
          </Text>
          <Text style={styles.brandSubtitle}>STUDENT ACCESS PORTAL</Text>
        </View>

        {/* Login Card */}
        <Card variant="bone" style={styles.loginCard}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-sharp" size={16} color={PALETTE.pureWhite} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>COLLEGE EMAIL</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                        borderColor: isDark ? colors.border : PALETTE.inkBlack,
                        color: colors.textPrimary,
                      },
                      errors.email && { borderColor: PALETTE.firecrackerRed },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="student@charusat.edu.in"
                    placeholderTextColor={isDark ? "rgba(249,245,242,0.4)" : "rgba(26,26,26,0.4)"}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
                </View>
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>PASSWORD</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <PasswordInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? PALETTE.darkNested : PALETTE.boneWhite,
                        borderColor: isDark ? colors.border : PALETTE.inkBlack,
                        color: colors.textPrimary,
                      },
                      errors.password && { borderColor: PALETTE.firecrackerRed },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? "rgba(249,245,242,0.4)" : "rgba(26,26,26,0.4)"}
                    editable={!isSubmitting}
                  />
                  {errors.password && (
                    <Text style={styles.fieldError}>{errors.password.message}</Text>
                  )}
                </View>
              )}
            />
          </View>

          <View style={styles.forgotRow}>
            <Link href="/(auth)/reset-password" asChild>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text
                  style={[
                    styles.forgotText,
                    { color: isDark ? PALETTE.hiVisYellow : "rgba(26,26,26,0.7)" },
                  ]}
                >
                  FORGOT PASSWORD?
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Button
            label="SIGN IN TO PORTAL"
            variant="accent"
            size="lg"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit, (fieldErrors) => {
              const firstMsg = fieldErrors.email?.message || fieldErrors.password?.message;
              if (firstMsg) setError(firstMsg);
            })}
            icon={<Ionicons name="arrow-forward-sharp" size={18} color={PALETTE.pureBlack} />}
            iconPosition="right"
            style={{ width: "100%", marginTop: 8 }}
          />
        </Card>

        {/* Security Note Footer */}
        <View style={styles.securityFooter}>
          <Ionicons name="lock-closed-sharp" size={12} color="rgba(249, 245, 242, 0.7)" />
          <Text style={styles.securityFooterText}>PROXY PREVENTION ACTIVE • HARDWARE BOUND</Text>
        </View>
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
  brandHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandIconBox: {
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
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: FONTS.display,
    color: PALETTE.boneWhite,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: PALETTE.hiVisYellow,
    letterSpacing: 1,
    marginTop: 4,
  },
  loginCard: {
    padding: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PALETTE.firecrackerRed,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: PALETTE.pureWhite,
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
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
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: "rgba(26,26,26,0.7)",
    letterSpacing: 0.3,
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  securityFooterText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: FONTS.mono,
    color: "rgba(249, 245, 242, 0.75)",
    letterSpacing: 0.5,
  },
});
