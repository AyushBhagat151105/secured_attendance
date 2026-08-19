import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/api/auth";

export const useCompleteOnboarding = () => {
  return useMutation({
    mutationFn: authApi.completeOnboarding,
    onSuccess: () => {
      toast.success("Account setup complete!");
    },
    onError: (err) => toast.error(err.message),
  });
};
