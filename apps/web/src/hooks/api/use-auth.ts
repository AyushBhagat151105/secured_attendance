import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { unwrapEden } from "@/lib/fetch-utils";

export const useCompleteOnboarding = () => {
  return useMutation({
    mutationFn: () =>
      unwrapEden((apiClient.api as any)["auth-custom"]["complete-onboarding"].patch()),
    onSuccess: () => {
      toast.success("Account setup complete!");
    },
    onError: (err) => toast.error(err.message),
  });
};
