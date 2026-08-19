import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { IconCalendarEvent, IconUsersGroup, IconQrcode, IconClockPlay, IconArrowRight, IconChalkboard } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTodaySchedule, useStartSession } from "@/hooks/use-teacher";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    const user = session.data.user as { role?: string; requiresPasswordChange?: boolean };
    if (user.requiresPasswordChange) {
      throw redirect({ to: "/reset-password" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  // Fetch Dashboard Data (Today's Schedule & Active Session)
  const { data: dashboardData, isLoading } = useTodaySchedule();

  // Mutation to start a new session
  const startSessionMutation = useStartSession();

  const hasActiveSession = !!dashboardData?.activeSession;
  const schedule = dashboardData?.schedule || [];

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Welcome back, {session?.user.name}
          </p>
        </div>
        {hasActiveSession ? (
          <Button 
            size="lg" 
            className="h-11 px-8 gap-2 font-medium bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate({ to: `/session/${dashboardData.activeSession!.id}` as any })}
          >
            <IconQrcode className="h-5 w-5" />
            Resume Active Session
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Today's Schedule (takes up 2 columns on lg screens) */}
        <Card className="shadow-none border border-border bg-card lg:col-span-2 flex flex-col">
          <CardHeader className="pb-4 border-b border-border">
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
          <CardContent className="p-0 flex-1">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : schedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <IconCalendarEvent className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-foreground text-lg">No classes scheduled</h3>
                <p className="text-sm text-muted-foreground mt-1">You don't have any sessions assigned for today.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {schedule.map((entry) => {
                  const isActive = dashboardData?.activeSession?.subjectId === entry.subject.id;
                  
                  return (
                    <div key={entry.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center min-w-20 px-3 py-2 bg-muted rounded-md border border-border">
                          <span className="text-sm font-medium">{entry.startTime}</span>
                          <span className="text-xs text-muted-foreground">to</span>
                          <span className="text-sm font-medium">{entry.endTime}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{entry.subject.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {entry.type}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                            <IconChalkboard className="h-4 w-4" />
                            Room {entry.room.name} • Div: {entry.divisions.map((d: any) => d.division.name).join(", ")}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        disabled={startSessionMutation.isPending || (hasActiveSession && !isActive)}
                        onClick={() => {
                          startSessionMutation.mutate(entry.id, {
                            onSuccess: (data) => navigate({ to: `/session/${data.id}` as any })
                          });
                        }}
                        variant={isActive ? "secondary" : "default"}
                        className="w-full sm:w-auto shrink-0"
                      >
                        {isActive ? (
                          <>
                            <IconArrowRight className="h-4 w-4 mr-2" />
                            Active
                          </>
                        ) : (
                          <>
                            <IconClockPlay className="h-4 w-4 mr-2" />
                            Start Session
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Quick Stats / Recent Activity */}
        <Card className="shadow-none border border-border bg-card">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <IconUsersGroup className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Recent Attendance</CardTitle>
                <CardDescription>Overview of recent sessions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-md bg-muted/30">
              <IconUsersGroup className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <h3 className="font-medium text-foreground">No recent data</h3>
              <p className="text-sm text-muted-foreground mt-1">Start a session to collect attendance data.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
