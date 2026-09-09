import { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconSearch,
  IconUserCheck,
  IconUserX,
  IconCheck,
  IconX,
  IconChalkboard,
  IconUsers,
  IconRefresh,
} from "@tabler/icons-react";
import { useTimetableRoster, useSubmitManualAttendance } from "@/hooks/api/use-manual-attendance";

interface ManualAttendanceModalProps {
  entry: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format12Hour: (timeStr: string) => string;
}

export function ManualAttendanceModal({
  entry,
  open,
  onOpenChange,
  format12Hour,
}: ManualAttendanceModalProps) {
  const { data: rosterData, isLoading, error, refetch } = useTimetableRoster(open ? entry?.id : null);
  const submitMutation = useSubmitManualAttendance();

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "present" | "absent">("all");

  const students = useMemo(() => rosterData?.students || [], [rosterData]);

  // When roster loads, default all students to Present
  useEffect(() => {
    if (students.length > 0) {
      setPresentIds(new Set(students.map((s: any) => s.id)));
    }
  }, [students]);

  const toggleStudent = (id: string) => {
    setPresentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markAllPresent = () => {
    setPresentIds(new Set(students.map((s: any) => s.id)));
  };

  const markAllAbsent = () => {
    setPresentIds(new Set());
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((student: any) => {
      const isPresent = presentIds.has(student.id);
      if (filterMode === "present" && !isPresent) return false;
      if (filterMode === "absent" && isPresent) return false;

      if (!q) return true;
      return (
        student.name.toLowerCase().includes(q) ||
        student.rollNumber.toLowerCase().includes(q) ||
        student.enrollmentNo.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, filterMode, presentIds]);

  const presentCount = presentIds.size;
  const totalCount = students.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const handleSubmit = () => {
    if (!entry) return;
    submitMutation.mutate(
      {
        timetableEntryId: entry.id,
        presentStudentIds: Array.from(presentIds),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Manual Attendance
                </SheetTitle>
                {entry && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">
                    {entry.type}
                  </span>
                )}
              </div>
              {entry && (
                <SheetDescription className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{entry.subject?.name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <IconChalkboard className="h-3.5 w-3.5" />
                    Room {entry.room?.name}
                  </span>
                  <span>•</span>
                  <span>
                    {format12Hour(entry.startTime)} - {format12Hour(entry.endTime)}
                  </span>
                </SheetDescription>
              )}
            </div>

            {/* Quick Ratio Counter Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 self-start sm:self-auto">
              <IconUsers className="h-4 w-4" />
              <span className="text-sm font-extrabold">
                {presentCount} / {totalCount}
              </span>
              <span className="text-xs font-semibold">({percentage}%)</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="space-y-3 pt-1">
            <div className="relative w-full">
              <IconSearch className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roll number, name, or enrollment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm bg-muted/30"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex rounded-lg border border-border p-1 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    filterMode === "all" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("present")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    filterMode === "present"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Present ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("absent")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    filterMode === "absent"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Absent ({totalCount - presentCount})
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted"
                  onClick={markAllPresent}
                >
                  <IconUserCheck className="h-3.5 w-3.5 text-emerald-600" />
                  All Present
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted"
                  onClick={markAllAbsent}
                >
                  <IconUserX className="h-3.5 w-3.5 text-rose-600" />
                  All Absent
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Student Roster */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm font-medium">Loading classroom roster...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-destructive">
              <IconX className="h-10 w-10 mx-auto mb-2 text-destructive opacity-80" />
              <p className="font-semibold text-base">Failed to load class roster</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {(error as any)?.message || "Server returned an error"}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <IconRefresh className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <IconUsers className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground text-base">No students found</p>
              <p className="text-xs mt-1">
                {searchQuery ? "Try searching with a different roll number or name." : "No students are enrolled in this division."}
              </p>
            </div>
          ) : (
            filteredStudents.map((student: any) => {
              const isPresent = presentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-4 px-6 flex items-center justify-between gap-4 cursor-pointer select-none transition-all ${
                    isPresent
                      ? "bg-emerald-500/[0.04] hover:bg-emerald-500/10"
                      : "bg-rose-500/[0.02] hover:bg-rose-500/5 opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm font-bold min-w-16 text-foreground bg-muted/80 px-2.5 py-1.5 rounded-lg text-center border border-border">
                      {student.rollNumber || "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <span>{student.enrollmentNo || student.email}</span>
                        <span>•</span>
                        <span>Div {student.divisionName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStudent(student.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                        isPresent
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25"
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          Present
                        </>
                      ) : (
                        <>
                          <IconX className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          Absent
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer Action Bar */}
        <SheetFooter className="p-4 px-6 border-t border-border bg-muted/30 flex flex-row items-center justify-between sm:justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitMutation.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || totalCount === 0}
            size="lg"
            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
          >
            <IconCheck className="h-4 w-4" />
            {submitMutation.isPending
              ? "Saving Attendance..."
              : `Submit Attendance (${presentCount} Present)`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
