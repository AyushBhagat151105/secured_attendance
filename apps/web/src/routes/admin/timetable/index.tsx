import { createFileRoute } from "@tanstack/react-router";
import { useTimetableEntries } from "@/features/admin/timetable/queries/timetable.queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/timetable/")({
  component: TimetableRoute,
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function TimetableRoute() {
  const { data: entries, isLoading } = useTimetableEntries();

  // Group by Day
  const groupedByDay = DAYS.map((day, index) => ({
    day,
    entries: entries?.filter((e) => e.dayOfWeek === index) || [],
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Timetable Overview</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupedByDay.map(({ day, entries: dayEntries }) => (
            <Card key={day} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{day}</CardTitle>
                <CardDescription>{dayEntries.length} classes scheduled</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-2">
                {dayEntries.length > 0 ? (
                  dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border p-3 text-sm flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-primary">{entry.subject?.code}</span>
                        <Badge variant="outline">{entry.type}</Badge>
                      </div>
                      <div className="text-muted-foreground flex justify-between">
                        <span>
                          {entry.startTime} - {entry.endTime}
                        </span>
                        <span>{entry.room?.name || "No Room"}</span>
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {entry.divisions.map((d) => (
                          <Badge key={d.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {d.division.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                    Free Day
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
