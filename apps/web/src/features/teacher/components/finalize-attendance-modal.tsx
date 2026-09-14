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
  IconCheck,
  IconX,
  IconQrcode,
  IconUserCheck,
  IconUsers,
  IconRefresh,
} from "@tabler/icons-react";
import { useSessionRoster, useFinalizeSession } from "@/hooks/api/use-manual-attendance";
import { useNavigate } from "@tanstack/react-router";

interface FinalizeAttendanceModalProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinalizeAttendanceModal({
  sessionId,
  open,
  onOpenChange,
}: FinalizeAttendanceModalProps) {
  const navigate = useNavigate();
  const { data: rosterData, isLoading, error, refetch } = useSessionRoster(open ? sessionId : null);
  const finalizeMutation = useFinalizeSession();

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [initialQrIds, setInitialQrIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "absent" | "present">("all");

  const students = useMemo(() => rosterData?.students || [], [rosterData]);

  // When roster data loads from server, seed initial present set from QR scans
  useEffect(() => {
    if (students.length > 0) {
      const scanned = new Set<string>();
      const currentPresent = new Set<string>();

      for (const s of students) {
        if (s.status === "present_qr") {
          scanned.add(s.id);
          currentPresent.add(s.id);
        } else if (s.status === "present_manual") {
          currentPresent.add(s.id);
        }
      }

      setInitialQrIds(scanned);
      setPresentIds(currentPresent);
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

  const totalCount = students.length;
  const presentCount = presentIds.size;
  const absentCount = totalCount - presentCount;
  const manualOverridesCount = Array.from(presentIds).filter((id) => !initialQrIds.has(id)).length;
  const qrPresentCount = Array.from(presentIds).filter((id) => initialQrIds.has(id)).length;

  const handleFinalize = () => {
    finalizeMutation.mutate(
      {
        sessionId,
        presentStudentIds: Array.from(presentIds),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          navigate({ to: `/reports/session/${sessionId}` as any });
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
          <div>
            <SheetTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Review & Finalize Attendance
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground mt-1">
              Verify students who scanned the dynamic QR code. Click any row to toggle between
              Present and Absent.
            </SheetDescription>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <span className="text-2xl font-extrabold">{qrPresentCount}</span>
              <span className="text-xs font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <IconQrcode className="h-3.5 w-3.5" />
                Via QR
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <span className="text-2xl font-extrabold">{manualOverridesCount}</span>
              <span className="text-xs font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <IconUserCheck className="h-3.5 w-3.5" />
                Manual
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
              <span className="text-2xl font-extrabold">{absentCount}</span>
              <span className="text-xs font-semibold uppercase tracking-wider mt-0.5">Absent</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="space-y-3 pt-1">
            <div className="relative w-full">
              <IconSearch className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roll number or student name..."
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
                    filterMode === "all"
                      ? "bg-background shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({totalCount})
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
                  Absent ({absentCount})
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
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted"
                onClick={markAllPresent}
              >
                <IconUserCheck className="h-3.5 w-3.5 text-emerald-600" />
                Mark All Present
              </Button>
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
              <p className="font-semibold text-base">Failed to load student roster</p>
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
                {searchQuery
                  ? "Try searching with a different roll number or name."
                  : "No students are enrolled in this division."}
              </p>
            </div>
          ) : (
            filteredStudents.map((student: any) => {
              const isPresent = presentIds.has(student.id);
              const wasScannedViaQr = initialQrIds.has(student.id);
              const isManualOverride = isPresent && !wasScannedViaQr;

              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-4 px-6 flex items-center justify-between gap-4 cursor-pointer select-none transition-all ${
                    isPresent
                      ? isManualOverride
                        ? "bg-amber-500/[0.05] hover:bg-amber-500/10"
                        : "bg-emerald-500/[0.04] hover:bg-emerald-500/10"
                      : "bg-rose-500/[0.02] hover:bg-rose-500/5 opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm font-bold min-w-16 text-foreground bg-muted/80 px-2.5 py-1.5 rounded-lg text-center border border-border">
                      {student.rollNumber || "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <span>{student.enrollmentNo || student.email}</span>
                        <span>•</span>
                        <span>Div {student.divisionName}</span>
                        {student.scannedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {new Date(student.scannedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        )}
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
                          ? isManualOverride
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25"
                      }`}
                    >
                      {isPresent ? (
                        isManualOverride ? (
                          <>
                            <IconUserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            Present (Manual)
                          </>
                        ) : (
                          <>
                            <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Present (QR)
                          </>
                        )
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
            disabled={finalizeMutation.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Back to QR Screen
          </Button>

          <Button
            onClick={handleFinalize}
            disabled={finalizeMutation.isPending}
            size="lg"
            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
          >
            <IconCheck className="h-4 w-4" />
            {finalizeMutation.isPending
              ? "Closing Session..."
              : `Confirm & Close Session (${presentCount} Present)`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
