import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { signUpSchema, type SignUpSchema } from "@secured_attendance/validators";

import { authClient } from "@/lib/auth-client";
import { IconLoader2 } from "@tabler/icons-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import { Field, FieldLabel, FieldError } from "./ui/field";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate({
    from: "/login",
  });
  const { isPending } = authClient.useSession();

  const form = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (value: SignUpSchema) => {
    await authClient.signUp.email(
      {
        email: value.email,
        password: value.password,
        name: value.name,
      },
      {
        onSuccess: () => {
          toast.success("Account created successfully");
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Create Account</h1>
        <p className="text-muted-foreground">Sign up for a new administrative account.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name} className="font-medium">Full Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="John Doe"
                className="h-11 bg-background"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
              <FieldLabel htmlFor={field.name} className="font-medium">Password</FieldLabel>
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
          className="w-full h-11 text-base font-medium mt-4"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button onClick={onSwitchToSignIn} className="font-semibold text-primary hover:underline">
          Sign in
        </button>
      </div>
    </div>
  );
}
