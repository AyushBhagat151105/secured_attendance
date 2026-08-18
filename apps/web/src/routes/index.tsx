import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { IconLoader2 } from "@tabler/icons-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();
      
      if (!session.data) {
        throw redirect({ to: "/login", replace: true });
      }

      console.log("DEBUG - Session data:", session.data);
      const role = (session.data.user as { role?: string }).role;
      console.log("DEBUG - Evaluated role:", role);

      if (role === "admin" || role === "super_admin") {
        throw redirect({ to: "/admin", replace: true });
      }
      
      if (role === "teacher") {
        throw redirect({ to: "/dashboard", replace: true });
      }
      
      // Student or other roles
      throw redirect({ to: "/download-app", replace: true });
    } catch (e) {
      if (isRedirect(e)) {
        throw e;
      }
      // If any other error (e.g. network failure), redirect to login
      throw redirect({ to: "/login", replace: true });
    }
  },
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <IconLoader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading workspace...</p>
      </div>
    </div>
  );
}
