import { createFileRoute } from "@tanstack/react-router";
import { IconCalendarEvent, IconUsersGroup, IconQrcode } from "@tabler/icons-react";

import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome back, {session?.user.name}
          </p>
        </div>
        <Button size="lg" className="h-11 px-8 gap-2 font-medium">
          <IconQrcode className="h-5 w-5" />
          Start Session
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="shadow-none border border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <IconCalendarEvent className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Today's Schedule</CardTitle>
                <CardDescription>Your upcoming classes for the day</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-md bg-muted/30">
              <IconCalendarEvent className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-foreground">No classes scheduled</h3>
              <p className="text-sm text-muted-foreground mt-1">You don't have any sessions assigned for today.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <IconUsersGroup className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Recent Attendance</CardTitle>
                <CardDescription>Overview of your recently closed sessions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-md bg-muted/30">
              <IconUsersGroup className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-foreground">No recent data</h3>
              <p className="text-sm text-muted-foreground mt-1">Start a session to collect attendance data.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
