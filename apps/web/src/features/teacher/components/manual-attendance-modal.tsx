import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const { data: rosterData, isLoading } = useTimetableRoster(open ? entry?.id : null);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                Manual Attendance
                {entry && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {entry.type}
                  </span>
                )}
              </DialogTitle>
              {entry && (
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-foreground">{entry.subject?.name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <IconChalkboard className="h-4 w-4 text-muted-foreground" />
                    Room {entry.room?.name}
                  </span>
                  <span>•</span>
                  <span>
                    {format12Hour(entry.startTime)} - {format12Hour(entry.endTime)}
                  </span>
                </DialogDescription>
              )}
            </div>

            {/* Quick Stats Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border self-start sm:self-auto">
              <IconUsers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">
                {presentCount} / {totalCount}
              </span>
              <span className="text-xs text-muted-foreground">({percentage}%)</span>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <IconSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roll no or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex rounded-md border border-border p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                    filterMode === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("present")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                    filterMode === "present"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Present ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("absent")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                    filterMode === "absent"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Absent ({totalCount - presentCount})
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={markAllPresent}
              >
                <IconUserCheck className="h-3.5 w-3.5 text-emerald-600" />
                All Present
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={markAllAbsent}
              >
                <IconUserX className="h-3.5 w-3.5 text-red-600" />
                All Absent
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Student Roster Table Area */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <IconUsers className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No students found</p>
              {searchQuery && <p className="text-xs mt-1">Try adjusting your search query</p>}
            </div>
          ) : (
            filteredStudents.map((student: any) => {
              const isPresent = presentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-3.5 px-6 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                    isPresent
                      ? "hover:bg-emerald-500/5 bg-background"
                      : "bg-red-500/[0.02] hover:bg-red-500/5 opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm font-bold min-w-16 text-foreground bg-muted px-2 py-1 rounded-md text-center border border-border">
                      {student.rollNumber || "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.enrollmentNo || student.email} • {student.divisionName}
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                        isPresent
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25"
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          Present
                        </>
                      ) : (
                        <>
                          <IconX className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
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

        <DialogFooter className="p-4 px-6 border-t border-border flex flex-row items-center justify-between sm:justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Clicking any student row toggles their attendance status.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || totalCount === 0}
              className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitMutation.isPending ? "Saving..." : `Submit Attendance (${presentCount} Present)`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
