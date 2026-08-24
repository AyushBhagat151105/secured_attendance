import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCompleteOnboarding } from "@/hooks/api/use-auth";
import { resetPasswordSchema, type ResetPasswordSchema } from "@secured_attendance/validators";
import { IconShieldCheck, IconLoader2 } from "@tabler/icons-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const completeOnboardingMutation = useCompleteOnboarding();

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (value: ResetPasswordSchema) => {
    try {
      let changeFailed = false;
      await authClient.changePassword(
        {
          newPassword: value.newPassword,
          currentPassword: value.currentPassword,
          revokeOtherSessions: true,
        },
        {
          onError: (ctx) => {
            changeFailed = true;
            toast.error(ctx.error.message || "Failed to change password");
          },
        },
      );

      if (changeFailed) return;

      await completeOnboardingMutation.mutateAsync();

      toast.success("Password changed successfully!");

      // Force reload to get updated session data and trigger root redirects
      window.location.href = "/";
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    }
  };

  return (
    <div className="flex h-screen w-full bg-background items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <IconShieldCheck className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set Your Password</h1>
          <p className="text-muted-foreground mt-2">
            For security reasons, you must change your temporary password before accessing your
            account.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Current Password (Temporary)</FieldLabel>
                <PasswordInput {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
                <PasswordInput {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Confirm New Password</FieldLabel>
                <PasswordInput {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full mt-6">
            {form.formState.isSubmitting ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
