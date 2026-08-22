import { useState } from "react";
import { Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleResetPassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    await authClient.changePassword(
      {
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      },
      {
        onError(error) {
          Alert.alert("Frontend Error!", `changePassword failed: ${error.error?.message || "Unknown error"}. Because this failed, complete-onboarding will NEVER be called!`);
          setError(error.error?.message || "Failed to change password");
          setIsLoading(false);
        },
        async onSuccess() {
          try {
            // Give expoClient time to finish writing the new session cookie to SecureStore
            // because plugin hooks in Better Auth are sometimes not fully awaited before resolving.
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Hit our custom endpoint to clear the requiresPasswordChange flag
            Alert.alert("Success!", "changePassword succeeded! Now calling complete-onboarding API...");
            const res = await apiClient.api["auth-custom"]["complete-onboarding"].patch();

            if (res.error) {
              Alert.alert("API Error!", `complete-onboarding failed: ${JSON.stringify(res.error)}`);
              setError(`Failed to complete onboarding: ${JSON.stringify(res.error)}`);
              setIsLoading(false);
              return;
            }

            // Refresh the session to update the requiresPasswordChange flag in the client
            await authClient.getSession({
              fetchOptions: {
                onSuccess: () => {
                  setIsLoading(false);
                },
                onError: () => {
                  setIsLoading(false);
                }
              }
            });

          } catch (err) {
            Alert.alert("Crash!", "Something crashed while calling complete-onboarding.");
            setError("Failed to complete onboarding");
            setIsLoading(false);
          }
        },
      }
    );
  }

  async function handleLogout() {
    setIsLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setIsLoading(false);
          router.replace("/sign-in");
        },
        onError: () => {
          setIsLoading(false);
          router.replace("/sign-in");
        }
      }
    });
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Password</Text>
        <Text style={styles.subtitle}>
          For your security, please choose a new password before continuing.
        </Text>
      </View>

      <View style={styles.card}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <PasswordInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <PasswordInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <PasswordInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={styles.logoutButtonText}>Logout & Try Again</Text>
        </TouchableOpacity>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
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
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 0,
  },
  logoutButtonText: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: '600',
  },
});
