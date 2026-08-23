import { createFileRoute, Link } from "@tanstack/react-router";
import { useTeacherSessionDetail } from "@/hooks/api/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconCheck, IconX, IconMap } from "@tabler/icons-react";

export const Route = createFileRoute("/reports/session/$sessionId")({
  component: SessionDetailRoute,
});

function SessionDetailRoute() {
  const { sessionId } = Route.useParams();
  const { data, isLoading, error } = useTeacherSessionDetail(sessionId);

  if (isLoading) return <div className="p-8">Loading session details...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load session details.</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 p-4 sm:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <Link to="/reports">
            <Button variant="outline" size="icon">
              <IconArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{data.sessionInfo.subject}</h1>
            <p className="text-muted-foreground">{new Date(data.sessionInfo.date).toLocaleString()}</p>
          </div>
        </div>
        
        <Link to="/reports/map/$sessionId" params={{ sessionId }}>
          <Button variant="outline">
            <IconMap className="h-4 w-4 mr-2" />
            View Map
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-4 border-b bg-muted/50 p-3 text-sm font-medium">
              <div>Roll Number</div>
              <div className="col-span-2">Name</div>
              <div className="text-right">Status</div>
            </div>
            <div className="divide-y">
              {data.students.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No students found for this session.</div>
              ) : (
                data.students.map((student: any) => (
                  <div key={student.studentId} className="grid grid-cols-4 items-center p-3 text-sm">
                    <div className="text-muted-foreground font-mono">{student.rollNumber}</div>
                    <div className="col-span-2 font-medium">{student.name}</div>
                    <div className="text-right flex justify-end">
                      {student.status === "Present" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <IconCheck className="h-3 w-3" />
                          Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <IconX className="h-3 w-3" />
                          Absent
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
