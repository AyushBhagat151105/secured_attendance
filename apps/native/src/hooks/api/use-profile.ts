import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { authClient } from "../../lib/auth-client";

export const profileKeys = {
  all: ["profile"] as const,
  student: () => [...profileKeys.all, "student"] as const,
};

export function useStudentProfile() {
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  
  return useQuery({
    queryKey: profileKeys.student(),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/student/profile');
        return res.data;
      } catch (err: any) {
        throw new Error(err.response?.data?.message || err.message || "Failed to load profile");
      }
    },
    enabled: !!user && user.role === "student",
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
