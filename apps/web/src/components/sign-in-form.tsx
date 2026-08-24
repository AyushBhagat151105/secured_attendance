import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { signInSchema, type SignInSchema } from "@secured_attendance/validators";

import { authClient } from "@/lib/auth-client";
import { IconLoader2 } from "@tabler/icons-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import { Field, FieldLabel, FieldError } from "./ui/field";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const navigate = useNavigate({
    from: "/login",
  });
  const { isPending } = authClient.useSession();

  const form = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (value: SignInSchema) => {
    await authClient.signIn.email(
      {
        email: value.email,
        password: value.password,
      },
      {
        onSuccess: () => {
          toast.success("Sign in successful");
          // Hard redirect to let __root and index sort out the role-based routing
          window.location.href = "/";
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Enter your credentials to access your account.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name} className="font-medium">Email address</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                placeholder="name@charusat.edu.in"
                className="h-11 bg-background"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={field.name} className="font-medium">Password</FieldLabel>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                {...field}
                id={field.name}
                placeholder="••••••••"
                className="h-11 bg-background"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium mt-2"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button onClick={onSwitchToSignUp} className="font-semibold text-primary hover:underline">
          Sign up
        </button>
      </div>
    </div>
  );
}
