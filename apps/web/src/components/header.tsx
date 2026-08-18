import { Link, useRouterState } from "@tanstack/react-router";
import { IconShieldCheck } from "@tabler/icons-react";

import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouterState();

  // Do not render header on login or download-app pages
  if (
    isPending ||
    !session ||
    router.location.pathname === "/login" ||
    router.location.pathname === "/download-app" ||
    (session.user as { role?: string }).role === "student"
  ) {
    return null;
  }

  const role = (session.user as { role?: string }).role;
  
  // Define links based on role
  const links = [];
  
  if (role === "admin" || role === "super_admin") {
    links.push(
      { to: "/admin", label: "Overview", exact: true },
      { to: "/admin/users", label: "Users" }
    );
  } else if (role === "teacher") {
    links.push({ to: "/dashboard", label: "Dashboard", exact: true });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center transition-transform group-hover:scale-105">
              <IconShieldCheck className="text-primary-foreground h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight hidden sm:inline-block">CHARUSAT</span>
          </Link>
          
          <nav className="flex items-center gap-1 text-sm font-medium">
            {links.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="px-3 py-2 rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-accent [&.active]:bg-accent [&.active]:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
