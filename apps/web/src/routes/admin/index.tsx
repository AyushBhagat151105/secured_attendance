import {
  IconUsers,
  IconChartBar,
  IconShield,
  IconClock,
  IconCircleCheck,
  IconCircleDashed,
  IconCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAdminAnalytics } from "@/hooks/api/use-reports";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBuildings } from "@/hooks/api/use-admin-campus";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { data: buildings, isLoading: buildingsLoading } = useBuildings();
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();

  const missingBuildings = !buildingsLoading && buildings && buildings.length === 0;

  const statCards = [
    {
      title: "Total Sessions",
      description: "Recorded in the system",
      icon: IconClock,
      value: analytics ? analytics.overview.totalSessions : "—",
      trend: "Manage in Timetable →",
      href: "/admin/timetable",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Active Sessions",
      description: "Currently ongoing",
      icon: IconClock,
      value: analytics ? analytics.overview.activeSessions : "—",
      trend: "Real-time updates",
      href: null,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Average Attendance",
      description: "Program-wide average",
      icon: IconChartBar,
      value: analytics ? `${analytics.overview.averageAttendance}%` : "—",
      trend: "View Analytics →",
      href: "/admin/analytics",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Anomalies",
      description: "Below threshold (<75%)",
      icon: IconAlertTriangle,
      value: analytics ? analytics.alerts.length : "—",
      trend: "Review Alerts →",
      href: "/admin/analytics",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Overview</h1>
        <p className="text-muted-foreground text-lg">CHARUSAT Secured Attendance</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="shadow-none border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">{card.value}</div>
              <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {card.href ? (
                  <Link to={card.href} className="flex items-center hover:underline">
                    {card.trend}
                  </Link>
                ) : (
                  <span>{card.trend}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={missingBuildings}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle className="text-xl text-rose-500 flex items-center gap-2">
              <IconShield className="h-5 w-5" />
              Action Required: Campus Setup
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-foreground/90">
              Welcome to the Admin Dashboard! It looks like there are no buildings or geofences
              configured in the system.
              <br />
              <br />
              Teachers cannot take attendance without valid building geofences. You must set up your
              campus first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate({ to: "/admin/campus" })}>Set up Campus Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
