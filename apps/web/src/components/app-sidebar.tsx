import * as React from "react";
import {
  IconChartBar,
  IconLayoutDashboard,
  IconShield,
  IconUsers,
  IconShieldCheck,
  IconBook,
  IconMapPin,
  IconCalendarTime,
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/admin",
      icon: <IconLayoutDashboard />,
      isActive: true,
    },
    {
      title: "Management",
      url: "#",
      icon: <IconUsers />,
      items: [
        {
          title: "Users",
          url: "/admin/users",
        },
      ],
    },
    {
      title: "Academic",
      url: "#",
      icon: <IconBook />,
      items: [
        {
          title: "Programs",
          url: "/admin/academic/programs",
        },
        {
          title: "Subjects",
          url: "/admin/academic/subjects",
        },
        {
          title: "Academic Years",
          url: "/admin/academic/years",
        },
        {
          title: "Divisions & Batches",
          url: "/admin/academic/divisions",
        },
      ],
    },
    {
      title: "Campus",
      url: "#",
      icon: <IconMapPin />,
      items: [
        {
          title: "Buildings & Rooms",
          url: "/admin/campus",
        },
      ],
    },
    {
      title: "Timetable",
      url: "#",
      icon: <IconCalendarTime />,
      items: [
        {
          title: "Weekly View",
          url: "/admin/timetable",
        },
        {
          title: "Bulk Import",
          url: "/admin/timetable/import",
        },
      ],
    },
    {
      title: "Reports",
      url: "#",
      icon: <IconChartBar />,
      items: [
        {
          title: "Analytics",
          url: "/admin/analytics",
        },
        {
          title: "Export Data",
          url: "/admin/export",
        },
      ],
    },
    {
      title: "Security & Audit",
      url: "#",
      icon: <IconShield />,
      items: [
        {
          title: "Anomalies",
          url: "/admin/anomalies",
        },
        {
          title: "Audit Logs",
          url: "/admin/audit-logs",
        },
      ],
    },
  ],
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string };
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-accent">
              <a href="/admin">
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg border border-border bg-card p-1 shadow-xs">
                  <img
                    src="/assets/cmpica-logo.webp"
                    alt="CMPICA Logo"
                    className="size-7 object-contain rounded"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold tracking-tight text-foreground">CHARUSAT</span>
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    CMPICA Admin Portal
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/60 p-2">
        <div className="px-2 py-1.5 rounded-md bg-accent/40 border border-border/50 flex flex-col gap-1.5 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-[11px]">Attendance System</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold tracking-wide">
              CMPICA
            </span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <p className="text-[10px] text-muted-foreground">
              Lead Dev: <span className="font-semibold text-foreground">Ayush Bhagat</span>
            </p>
            <div className="flex items-center gap-1.5">
              <a
                href="https://github.com/ayushbhagat151105"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-accent"
                title="GitHub: ayushbhagat151105"
              >
                <IconBrandGithub className="size-3.5" />
              </a>
              <a
                href="https://www.instagram.com/bhagat_ayush__/"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-pink-500 transition-colors p-0.5 rounded hover:bg-accent"
                title="Instagram: @bhagat_ayush__"
              >
                <IconBrandInstagram className="size-3.5" />
              </a>
              <a
                href="https://www.linkedin.com/in/ayush-bhagat-99b7b82b3/"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-blue-500 transition-colors p-0.5 rounded hover:bg-accent"
                title="LinkedIn: ayush-bhagat"
              >
                <IconBrandLinkedin className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
