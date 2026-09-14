import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import {
  IconCalendarEvent,
  IconUsersGroup,
  IconQrcode,
  IconClockPlay,
  IconArrowRight,
  IconChalkboard,
  IconClipboardCheck,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState } from "react";
import { useStartSession, useTodaySchedule } from "@/hooks/api/use-teacher";
import { ManualAttendanceModal } from "@/features/teacher/components/manual-attendance-modal";

function format12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const [hStr = "0", mStr = "0"] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getSlotStatus(
  startTime: string,
  endTime: string,
  isCompleted: boolean,
  isActive: boolean,
) {
  if (isActive)
    return {
      label: "Live Now",
      badgeClass:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse",
      type: "live",
    };
  if (isCompleted)
    return {
      label: "Completed",
      badgeClass:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      type: "completed",
    };

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [sh = 0, sm = 0] = startTime.split(":").map(Number);
  const [eh = 0, em = 0] = endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (currentMins > endMins) {
    return {
      label: "Ended",
      badgeClass: "bg-muted text-muted-foreground border border-border",
      type: "ended",
    };
  }
  if (currentMins >= startMins && currentMins <= endMins) {
    return {
      label: "Current Slot",
      badgeClass:
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
      type: "current",
    };
  }
  return {
    label: "Upcoming",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    type: "upcoming",
  };
}

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
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [manualModalEntry, setManualModalEntry] = useState<any | null>(null);

  // Mutation to start a new session
  const startSessionMutation = useStartSession();

  const hasActiveSession = !!dashboardData?.activeSession;
  const schedule = dashboardData?.schedule || [];

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome back, {session?.user.name}</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <IconCalendarEvent className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Today's Schedule</CardTitle>
                  <CardDescription>Scheduled lectures and labs</CardDescription>
                </div>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-500/20 w-fit">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                (IST)
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
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any sessions assigned for today.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {schedule.map((entry: any) => {
                  const activeSess = dashboardData?.activeSession as any;
                  const isActive = activeSess?.timetableEntryId
                    ? activeSess.timetableEntryId === entry.id
                    : activeSess?.subjectId === entry.subject.id &&
                      activeSess?.roomId === entry.room.id;
                  const isCompleted = !!entry.completedSessionId;
                  const statusInfo = getSlotStatus(
                    entry.startTime,
                    entry.endTime,
                    isCompleted,
                    isActive,
                  );

                  return (
                    <div
                      key={entry.id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center min-w-28 px-3 py-2 bg-muted/60 rounded-md border border-border">
                          <span className="text-xs font-semibold text-foreground">
                            {format12Hour(entry.startTime)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground my-0.5">
                            to
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {format12Hour(entry.endTime)}
                          </span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-lg">{entry.subject.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {entry.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                            <IconChalkboard className="h-4 w-4" />
                            Room {entry.room.name} · Div:{" "}
                            {entry.divisions.map((d: any) => d.division.name).join(", ")}
                          </p>
                        </div>
                      </div>

                      {entry.completedSessionId ? (
                        <Link
                          to="/reports/session/$sessionId"
                          params={{ sessionId: entry.completedSessionId }}
                        >
                          <Button
                            variant="secondary"
                            className="w-full sm:w-auto shrink-0 border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          >
                            Completed · View Report
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
                          <Button
                            disabled={
                              startSessionMutation.isPending || (hasActiveSession && !isActive)
                            }
                            onClick={() => {
                              startSessionMutation.mutate(entry.id, {
                                onSuccess: (data: any) =>
                                  navigate({ to: `/session/${data.id}` as any }),
                                onError: (err: any) => {
                                  if (err.message.includes("GEOFENCE_NOT_CONFIGURED")) {
                                    setGeofenceError(
                                      err.message.replace("GEOFENCE_NOT_CONFIGURED: ", ""),
                                    );
                                  }
                                },
                              });
                            }}
                            variant={
                              isActive
                                ? "secondary"
                                : statusInfo.type === "ended"
                                  ? "outline"
                                  : "default"
                            }
                            className="w-full sm:w-auto shrink-0"
                          >
                            {isActive ? (
                              <>
                                <IconArrowRight className="h-4 w-4 mr-2" />
                                Active Session
                              </>
                            ) : statusInfo.type === "ended" ? (
                              <>
                                <IconClockPlay className="h-4 w-4 mr-2" />
                                Start Late Session
                              </>
                            ) : (
                              <>
                                <IconClockPlay className="h-4 w-4 mr-2" />
                                Start Session
                              </>
                            )}
                          </Button>

                          {!isActive && (
                            <Button
                              variant="outline"
                              onClick={() => setManualModalEntry(entry)}
                              className="w-full sm:w-auto shrink-0 gap-1.5 border-border hover:bg-muted"
                            >
                              <IconClipboardCheck className="h-4 w-4 text-muted-foreground" />
                              Manual
                            </Button>
                          )}
                        </div>
                      )}
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
              <p className="text-sm text-muted-foreground mt-1">
                Start a session to collect attendance data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!geofenceError} onOpenChange={() => setGeofenceError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Geofence Not Configured</DialogTitle>
            <DialogDescription className="pt-2 text-base">{geofenceError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setGeofenceError(null)}>Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualAttendanceModal
        entry={manualModalEntry}
        open={!!manualModalEntry}
        onOpenChange={(open) => !open && setManualModalEntry(null)}
        format12Hour={format12Hour}
      />
    </div>
  );
}
