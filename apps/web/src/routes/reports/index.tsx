import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useTeacherSessionsReport, useTeacherSubjectsReport, useDeleteSession } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconDownload, IconArrowRight, IconBook2, IconClockHour4, IconPercentage, IconTrash } from "@tabler/icons-react";

export const Route = createFileRoute("/reports/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data || (session.data.user as any).role !== "teacher") {
      throw redirect({ to: "/login" });
    }
  },
  component: ReportsDashboard,
});

function ReportsDashboard() {
  const { data: subjects, isLoading: subjectsLoading } = useTeacherSubjectsReport();
  const { data: sessions, isLoading: sessionsLoading } = useTeacherSessionsReport();
  const deleteSession = useDeleteSession();

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance Reports</h1>
        <p className="text-muted-foreground text-lg">
          View subject-wise aggregates and download attendance CSV ledgers.
        </p>
      </div>

      {/* Subjects Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subject Attendance Aggregates</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subjectsLoading ? (
            <p>Loading subjects...</p>
          ) : subjects?.length === 0 ? (
            <p className="text-muted-foreground">No subjects found.</p>
          ) : (
            subjects?.map((sub: any) => (
              <Card key={sub.id} className="flex flex-col">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <IconBook2 className="h-5 w-5 text-indigo-500" />
                    {sub.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <IconPercentage className="h-5 w-5 text-muted-foreground" />
                      <span className="text-2xl font-bold">{sub.percentage}%</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Overall</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      window.open(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/teacher/reports/export/${sub.id}`, '_blank');
                    }}
                  >
                    <IconDownload className="h-4 w-4" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Closed Sessions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {sessionsLoading ? (
            <p>Loading sessions...</p>
          ) : sessions?.length === 0 ? (
            <p className="text-muted-foreground">No closed sessions found.</p>
          ) : (
            sessions?.slice(0, 10).map((session: any) => {
              const attendancePercent = session.expectedCount > 0
                ? Math.round((session.presentCount / session.expectedCount) * 100) 
                : 0;

              return (
                <Card key={session.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{session.subjectName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <IconClockHour4 className="h-4 w-4" />
                        <span>{new Date(session.startTime).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{session.roomName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{attendancePercent}%</p>
                        <p className="text-xs text-muted-foreground">
                          {session.presentCount}/{session.expectedCount} Present
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link to={"/reports/session/$sessionId"} params={{ sessionId: session.id }}>
                          <Button size="icon" variant="ghost">
                            <IconArrowRight className="h-5 w-5" />
                          </Button>
                        </Link>
                        {import.meta.env.DEV && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={deleteSession.isPending}
                              >
                                <IconTrash className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this session and all associated attendance records. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteSession.mutate(session.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
