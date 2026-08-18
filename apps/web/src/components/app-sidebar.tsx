import * as React from "react"
import { IconChartBar, IconLayoutDashboard, IconShield, IconUsers, IconShieldCheck, IconBook, IconMapPin, IconCalendarTime } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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
          title: "Attendance",
          url: "/admin/attendance",
        },
        {
          title: "Anomalies",
          url: "/admin/anomalies",
        },
      ],
    },
  ],
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: { name: string; email: string; avatar: string } }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconShieldCheck className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">CHARUSAT</span>
                  <span className="truncate text-xs text-muted-foreground">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
