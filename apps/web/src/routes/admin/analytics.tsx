import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminAnalytics } from "@/hooks/api/use-reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconAlertTriangle, IconUsers, IconCalendarEvent, IconPercentage, IconMapPin } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsRoute,
});

function AdminAnalyticsRoute() {
  const { data, isLoading, error } = useAdminAnalytics();

  if (isLoading) return <div className="p-8">Loading analytics...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load analytics.</div>;
  if (!data) return null;

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Program Analytics</h1>
        <p className="text-muted-foreground text-lg">
          Overview of system-wide attendance health.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activeSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <IconPercentage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.averageAttendance}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendances Marked</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalAttendances}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-red-600 flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5" />
          Below Threshold Alerts (&lt; 75%)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.alerts.length === 0 ? (
            <p className="text-muted-foreground">No recent sessions with below 75% attendance.</p>
          ) : (
            data.alerts.map((alert: any) => (
              <Card key={alert.sessionId} className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-red-800 dark:text-red-400">
                    {alert.subjectName}
                  </CardTitle>
                  <CardDescription className="text-red-600/80">
                    {new Date(alert.date).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold text-red-700 dark:text-red-500">{alert.percentage}%</span>
                      <span className="text-sm text-red-600/80">{alert.presentCount} / {alert.expectedCount} Present</span>
                    </div>
                    <Link to="/admin/map/$sessionId" params={{ sessionId: alert.sessionId }} className="w-full">
                      <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/50">
                        <IconMapPin className="mr-2 h-4 w-4" />
                        View GPS Map
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
