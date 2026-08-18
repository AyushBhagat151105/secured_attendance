import { IconUsers, IconChartBar, IconShield, IconClock, IconCircleCheck, IconCircleDashed, IconCircle } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

// Static stat cards — will be replaced with real data in Phase 3+
const statCards = [
  {
    title: "Total Users",
    description: "Registered in the system",
    icon: IconUsers,
    value: "—",
    trend: "Manage in Users →",
    href: "/admin/users",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Active Sessions",
    description: "Currently ongoing",
    icon: IconClock,
    value: "—",
    trend: "Session management in Phase 4",
    href: null,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Attendance Today",
    description: "Records submitted",
    icon: IconChartBar,
    value: "—",
    trend: "Reports in Phase 6",
    href: null,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    title: "Anomalies",
    description: "Unreviewed alerts",
    icon: IconShield,
    value: "—",
    trend: "Anomaly dashboard in Phase 7",
    href: null,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

const phases = [
  { name: "Phase 1: Foundation & Data Model", status: "completed" },
  { name: "Phase 2: User Management & Import", status: "completed" },
  { name: "Phase 3: Academic Structure & Timetable", status: "current" },
  { name: "Phase 4: Session & QR System", status: "upcoming" },
  { name: "Phase 5: Attendance Submission (Mobile)", status: "upcoming" },
  { name: "Phase 6: Reports & Analytics", status: "upcoming" },
  { name: "Phase 7: Anomaly Detection & Audit", status: "upcoming" },
];

function AdminDashboard() {
  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Overview</h1>
        <p className="text-muted-foreground text-lg">
          CHARUSAT Secured Attendance
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="shadow-none border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-none border border-border bg-card max-w-3xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Implementation Tracker</CardTitle>
          <CardDescription>Track the development phases for the attendance system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase, i) => (
              <div key={i} className="flex items-center gap-4">
                {phase.status === "completed" ? (
                  <IconCircleCheck className="h-5 w-5 text-emerald-500" />
                ) : phase.status === "current" ? (
                  <IconCircleDashed className="h-5 w-5 text-indigo-500 animate-[spin_4s_linear_infinite]" />
                ) : (
                  <IconCircle className="h-5 w-5 text-muted-foreground/30" />
                )}
                <span className={`font-medium ${
                  phase.status === "completed" ? "text-foreground line-through opacity-70" :
                  phase.status === "current" ? "text-foreground" :
                  "text-muted-foreground"
                }`}>
                  {phase.name}
                </span>
                {phase.status === "current" && (
                  <span className="bg-indigo-500/10 text-indigo-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wider">In Progress</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
