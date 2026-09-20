import {
  IconChartBar,
  IconShield,
  IconClock,
  IconAlertTriangle,
  IconActivity,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAdminAnalytics } from "@/hooks/api/use-reports";
import { useBuildings } from "@/hooks/api/use-admin-campus";
import { AdminPageHeader, AdminKpiCard } from "@/components/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { data: buildings, isLoading: buildingsLoading } = useBuildings();
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();

  const missingBuildings = !buildingsLoading && buildings && buildings.length === 0;

  return (
    <div className="space-y-6 min-w-0 w-full pb-10">
      <AdminPageHeader
        title="System Overview"
        subtitle="Real-time institutional attendance monitoring and campus health."
        icon={<IconActivity className="size-6 text-primary" />}
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard
          title="Total Sessions"
          value={analytics?.overview?.totalSessions ?? 0}
          subtitle="recorded in system"
          icon={IconClock}
          color="blue"
          isLoading={analyticsLoading}
          trend="Manage in Timetable →"
          href="/admin/timetable"
        />

        <AdminKpiCard
          title="Active Sessions"
          value={analytics?.overview?.activeSessions ?? 0}
          subtitle="currently ongoing"
          icon={IconClock}
          color="emerald"
          isLoading={analyticsLoading}
          trend="Real-time updates"
        />

        <AdminKpiCard
          title="Average Attendance"
          value={analytics ? `${analytics.overview.averageAttendance}%` : "0%"}
          subtitle="program-wide average"
          icon={IconChartBar}
          color="indigo"
          isLoading={analyticsLoading}
          trend="View Analytics →"
          href="/admin/analytics"
        />

        <AdminKpiCard
          title="Anomalies"
          value={analytics?.alerts?.length ?? 0}
          subtitle="below threshold (<75%)"
          icon={IconAlertTriangle}
          color="rose"
          isLoading={analyticsLoading}
          trend="Review Alerts →"
          href="/admin/analytics"
        />
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
