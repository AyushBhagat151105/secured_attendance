import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAnalytics } from "@/hooks/api/use-reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  IconAlertTriangle,
  IconUsers,
  IconCalendarEvent,
  IconPercentage,
  IconMapPin,
  IconChartBar,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminKpiCard } from "@/components/admin";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsRoute,
});

function AdminAnalyticsRoute() {
  const { data, isLoading, error } = useAdminAnalytics();

  return (
    <div className="space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="Institutional Analytics"
        subtitle="Holistic performance metrics, attendance averages, and threshold compliance alerts."
        icon={<IconChartBar className="size-6 text-primary" />}
        badge={
          data?.overview ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {data.overview.averageAttendance}% Avg Health
            </span>
          ) : undefined
        }
        actions={
          <Link to="/admin/export">
            <Button variant="outline" className="gap-1.5 text-xs sm:text-sm h-9 shadow-xs">
              <IconArrowUpRight className="size-4" /> Export Reports
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          Failed to load analytics data. Please refresh or check connection.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminKpiCard
          title="Total Sessions"
          value={data?.overview?.totalSessions ?? 0}
          subtitle="All academic sessions"
          icon={IconCalendarEvent}
          color="blue"
          isLoading={isLoading}
        />
        <AdminKpiCard
          title="Active Sessions"
          value={data?.overview?.activeSessions ?? 0}
          subtitle="Currently underway"
          icon={IconUsers}
          color="emerald"
          isLoading={isLoading}
        />
        <AdminKpiCard
          title="Average Attendance"
          value={`${data?.overview?.averageAttendance ?? 0}%`}
          subtitle="Institutional compliance"
          icon={IconPercentage}
          color="indigo"
          isLoading={isLoading}
        />
        <AdminKpiCard
          title="Total Attendances"
          value={data?.overview?.totalAttendances ?? 0}
          subtitle="Verified check-ins"
          icon={IconUsers}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <IconAlertTriangle className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Below Threshold Alerts (&lt; 75%)
            </h2>
            <p className="text-xs text-muted-foreground">
              Lectures and sessions requiring administrative intervention or attendance makeup.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 rounded-xl border border-border/70 animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-full mt-4" />
              </Card>
            ))}
          </div>
        ) : !data || data.alerts.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-muted-foreground text-sm">
            No recent sessions with below 75% attendance. All cohorts are compliant.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.alerts.map((alert: any) => (
              <Card
                key={alert.sessionId}
                className="rounded-xl border border-rose-500/30 bg-rose-500/5 shadow-xs overflow-hidden"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {alert.subjectName}
                    </CardTitle>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 shrink-0">
                      {alert.percentage}%
                    </span>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    {new Date(alert.date).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <div className="flex flex-col gap-3">
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Attendance Turnout:</span>
                      <span className="font-semibold text-foreground">
                        {alert.presentCount} / {alert.expectedCount} Students
                      </span>
                    </div>
                    <Link
                      to="/admin/map/$sessionId"
                      params={{ sessionId: alert.sessionId }}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs h-8 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                      >
                        <IconMapPin className="size-3.5" />
                        View Session GPS Map
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
