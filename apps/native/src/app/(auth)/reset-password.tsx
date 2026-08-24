import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordSchema } from "@secured_attendance/validators";

import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { Container } from "@/components/container";
import { PasswordInput } from "@/components/ui/password-input";

const COLORS = {
  background: "#ffffff",
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#4f46e5",
  foreground: "#111827",
  muted: "#6b7280",
  destructive: "#ef4444",
};

export default function ResetPasswordScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordSchema) {
    setError(null);

    await authClient.changePassword(
      {
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: false,
      },
      {
        onError(error) {
          Alert.alert(
            "Frontend Error!",
            `changePassword failed: ${error.error?.message || "Unknown error"}. Because this failed, complete-onboarding will NEVER be called!`,
          );
          setError(error.error?.message || "Failed to change password");
        },
        async onSuccess() {
          try {
            // Give expoClient time to finish writing the new session cookie to SecureStore
            // because plugin hooks in Better Auth are sometimes not fully awaited before resolving.
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Hit our custom endpoint to clear the requiresPasswordChange flag
            Alert.alert(
              "Success!",
              "changePassword succeeded! Now calling complete-onboarding API with Axios...",
            );

            try {
              await apiClient.patch("/api/auth-custom/complete-onboarding");
            } catch (err: any) {
              Alert.alert(
                "API Error!",
                `complete-onboarding failed: ${err.response?.status || err.message}`,
              );
              setError(`Failed to complete onboarding: ${err.response?.status || err.message}`);
              return;
            }

            // Refresh the session to update the requiresPasswordChange flag in the client
            await authClient.getSession();
          } catch (err) {
            Alert.alert("Crash!", "Something crashed while calling complete-onboarding.");
            setError("Failed to complete onboarding");
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
          router.replace("/(auth)/sign-in" as any);
        },
        onError: () => {
          setIsLoggingOut(false);
          router.replace("/(auth)/sign-in" as any);
        },
      },
    });
  }

  const isLoading = isSubmitting || isLoggingOut;

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Password</Text>
        <Text style={styles.subtitle}>
          For your security, please choose a new password before continuing.
        </Text>
      </View>

      <View style={styles.card}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { onChange, value } }) => (
              <>
                <PasswordInput
                  style={[
                    styles.input,
                    errors.currentPassword && { borderColor: COLORS.destructive },
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted}
                  editable={!isLoading}
                />
                {errors.currentPassword && (
                  <Text style={styles.errorTextSmall}>{errors.currentPassword.message}</Text>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <>
                <PasswordInput
                  style={[styles.input, errors.newPassword && { borderColor: COLORS.destructive }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted}
                  editable={!isLoading}
                />
                {errors.newPassword && (
                  <Text style={styles.errorTextSmall}>{errors.newPassword.message}</Text>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <>
                <PasswordInput
                  style={[
                    styles.input,
                    errors.confirmPassword && { borderColor: COLORS.destructive },
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted}
                  editable={!isLoading}
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorTextSmall}>{errors.confirmPassword.message}</Text>
                )}
              </>
            )}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={COLORS.muted} />
          ) : (
            <Text style={styles.logoutButtonText}>Logout & Try Again</Text>
          )}
        </TouchableOpacity>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  errorText: {
    color: COLORS.destructive,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 8,
  },
  errorTextSmall: {
    color: COLORS.destructive,
    fontSize: 12,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.foreground,
    backgroundColor: COLORS.background,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 0,
  },
  logoutButtonText: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: "600",
  },
});
