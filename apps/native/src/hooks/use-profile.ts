import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "../api/attendance";
import { authClient } from "../lib/auth-client";

export const profileKeys = {
  all: ["profile"] as const,
  student: () => [...profileKeys.all, "student"] as const,
};

export function useStudentProfile() {
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  
  return useQuery({
    queryKey: profileKeys.student(),
    queryFn: attendanceApi.getProfile,
    enabled: !!user && user.role === "student",
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
