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
  IconCheck,
  IconX,
  IconQrcode,
  IconUserCheck,
  IconUsers,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                Review & Finalize Attendance
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Verify attendees who scanned the QR code. You can click any student to override their attendance status.
              </DialogDescription>
            </div>

            {/* Quick summary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                <IconQrcode className="h-3.5 w-3.5" />
                {qrPresentCount} via QR
              </span>
              {manualOverridesCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1">
                  <IconUserCheck className="h-3.5 w-3.5" />
                  +{manualOverridesCount} Manual
                </span>
              )}
              <span className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                {absentCount} Absent
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <IconSearch className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roll no or student name..."
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
                  onClick={() => setFilterMode("absent")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                    filterMode === "absent"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Absent ({absentCount})
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
            </div>
          </div>
        </DialogHeader>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto min-h-[320px] max-h-[50vh] divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-destructive">
              <IconX className="h-10 w-10 mx-auto mb-2 text-destructive" />
              <p className="font-semibold text-base">Failed to load student roster</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {(error as any)?.message || "Server returned an error"}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <IconUsers className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No students match this filter</p>
              {searchQuery && <p className="text-xs mt-1">Try clearing your search query</p>}
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
                  className={`p-3.5 px-6 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                    isPresent
                      ? isManualOverride
                        ? "bg-amber-500/[0.04] hover:bg-amber-500/10"
                        : "bg-emerald-500/[0.03] hover:bg-emerald-500/10"
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
                        {student.scannedAt && (
                          <span className="ml-2 text-[11px] text-muted-foreground/80">
                            (Scanned at {new Date(student.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStudent(student.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                        isPresent
                          ? isManualOverride
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25"
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
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={finalizeMutation.isPending}
          >
            Back to QR Screen
          </Button>

          <Button
            onClick={handleFinalize}
            disabled={finalizeMutation.isPending}
            className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {finalizeMutation.isPending ? "Closing Session..." : `Confirm & Close Session (${presentCount} Present)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
