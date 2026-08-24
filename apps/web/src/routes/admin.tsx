import React from "react";
import { IconChartBar, IconLayoutDashboard, IconShield, IconUsers } from "@tabler/icons-react";
import { Link, Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    const user = session.data.user as { role?: string; requiresPasswordChange?: boolean };
    const role = user.role;
    if (!role || !["admin", "super_admin"].includes(role)) {
      throw redirect({ to: "/" });
    }
    if (user.requiresPasswordChange) {
      throw redirect({ to: "/reset-password" });
    }
    return { session: session.data };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { session } = Route.useRouteContext();
  const user = session.user as { name: string; email: string; image?: string; role?: string };

  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean).slice(1);

  return (
    <SidebarProvider>
      <AppSidebar user={{ name: user.name, email: user.email, avatar: user.image ?? "" }} />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/admin">Admin</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {pathSegments.length === 0 && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}

              {pathSegments.map((segment, index) => {
                const isLast = index === pathSegments.length - 1;
                // If the segment is long (like a UUID), just say "Details"
                const formatted =
                  segment.length > 20
                    ? "Details"
                    : segment
                        .split("-")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");

                const path = `/admin/${pathSegments.slice(0, index + 1).join("/")}`;
                const isNonClickable = ["/admin/academic", "/admin/map"].includes(path);

                return (
                  <React.Fragment key={segment + index}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{formatted}</BreadcrumbPage>
                      ) : isNonClickable ? (
                        <span className="text-muted-foreground">{formatted}</span>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={path as any}>{formatted}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
