import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { useCompleteOnboarding } from "@/hooks/use-auth";
import z from "zod";
import { IconShieldCheck, IconLoader2 } from "@tabler/icons-react";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const getErrorMessages = (errors: readonly unknown[] | undefined) =>
  (errors ?? []).flatMap((error) => {
    if (typeof error === "string") return [error];
    if (error && typeof error === "object" && "message" in error) {
      const message = error.message;
      return typeof message === "string" ? [message] : [];
    }
    return [];
  });

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const completeOnboardingMutation = useCompleteOnboarding();

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
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
          }
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
    },
    validators: {
      onChange: z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }),
    },
  });

  return (
    <div className="flex h-screen w-full bg-background items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <IconShieldCheck className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set Your Password</h1>
          <p className="text-muted-foreground mt-2">
            For security reasons, you must change your temporary password before accessing your account.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="currentPassword"
            children={(field) => {
              const errors = getErrorMessages(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Current Password (Temporary)</Label>
                  <PasswordInput
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {errors.length ? <p className="text-[13px] text-destructive">{errors.join(", ")}</p> : null}
                </div>
              );
            }}
          />

          <form.Field
            name="newPassword"
            children={(field) => {
              const errors = getErrorMessages(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>New Password</Label>
                  <PasswordInput
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {errors.length ? <p className="text-[13px] text-destructive">{errors.join(", ")}</p> : null}
                </div>
              );
            }}
          />

          <form.Field
            name="confirmPassword"
            children={(field) => {
              const errors = getErrorMessages(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Confirm New Password</Label>
                  <PasswordInput
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {errors.length ? <p className="text-[13px] text-destructive">{errors.join(", ")}</p> : null}
                </div>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full mt-6">
                {isSubmitting ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Update Password
              </Button>
            )}
          />
        </form>
      </div>
    </div>
  );
}
