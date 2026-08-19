import { apiClient } from "@/lib/api-client";

const api = apiClient.api as any;

export const authApi = {
  completeOnboarding: async () => {
    const { data, error } = await api["auth-custom"]["complete-onboarding"].patch();
    if (error) throw new Error(error.value?.message || "Failed to complete onboarding");
    return data;
  },
};
