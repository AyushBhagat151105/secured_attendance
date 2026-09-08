import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInSchema } from "@secured_attendance/validators";

import { authClient } from "@/lib/auth-client";
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

export default function SignInScreen() {
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

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

    await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
      },
      {
        onError(error) {
          const rawMsg = error.error?.message || "";
          if (
            !rawMsg ||
            rawMsg.toLowerCase().includes("fetch") ||
            rawMsg.toLowerCase().includes("network")
          ) {
            setError(
              "No internet connection. Please connect to WiFi or mobile data to sign in for the first time.",
            );
          } else {
            setError(rawMsg || "Failed to sign in. Please verify your email and password.");
          }
        },
        onSuccess() {
          // If successful, the layout should auto-redirect to device binding if needed,
          // or we can redirect directly here.
          // For now, _layout handles the initial session change redirect.
        },
      },
    );
  }

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to mark your attendance</Text>
      </View>

      <View style={styles.card}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <>
                <TextInput
                  style={[styles.input, errors.email && { borderColor: COLORS.destructive }]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="student@charusat.edu.in"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
                {errors.email && <Text style={styles.errorTextSmall}>{errors.email.message}</Text>}
              </>
            )}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <>
                <PasswordInput
                  style={[styles.input, errors.password && { borderColor: COLORS.destructive }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Password"
                  placeholderTextColor={COLORS.muted}
                  editable={!isSubmitting}
                />
                {errors.password && (
                  <Text style={styles.errorTextSmall}>{errors.password.message}</Text>
                )}
              </>
            )}
          />
        </View>

        <View style={styles.forgotPasswordContainer}>
          <Link href={"/(auth)/reset-password" as any} asChild>
            <TouchableOpacity hitSlop={10}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
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
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
    padding: 8,
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
});
