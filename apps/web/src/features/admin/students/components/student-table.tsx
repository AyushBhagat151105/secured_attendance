import { useEffect, useState } from "react";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDeviceMobile,
  IconDeviceMobileCheck,
  IconDots,
  IconEye,
  IconKey,
  IconRefresh,
  IconSchool,
  IconTrash,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSuspendUser, useUpdateUser, useUsers } from "@/hooks/api/use-admin-users";
import { cn } from "@/lib/utils";
import type { StudentFilterState } from "./student-filters";

import { ChangePasswordDialog } from "./change-password-dialog";
import { DeviceRebindDialog } from "../../users/components/device-rebind-dialog";
import { DeleteUserAlert } from "../../users/components/delete-user-alert";

const PAGE_SIZE = 20;

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  createdAt: string | Date;
  banned?: boolean;
  studentProfile?: {
    id: string;
    enrollmentNo: string;
    status: string;
    rollNumber?: string | null;
    admissionYear?: number | null;
    programCode: string;
    deviceBound: boolean;
    deviceModel?: string | null;
    deviceId?: string | null;
    divisionId?: string | null;
    division?: {
      id: string;
      name: string;
      programSemester?: {
        id: string;
        semester: number;
        program?: { id: string; name: string; code: string; shortName?: string | null };
        academicYear?: { id: string; name: string; isCurrent?: boolean };
      };
    };
  } | null;
}

interface StudentTableProps {
  filters: StudentFilterState;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSelectStudent: (id: string) => void;
}

export function StudentTable({
  filters,
  selectedIds,
  onSelectionChange,
  onSelectStudent,
}: StudentTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Automatically reset to page 1 whenever search, filters, or page size change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.programCode, filters.academicYearId, filters.semester, filters.divisionId, pageSize]);

  // Dialog states for single row actions
  const [passwordUser, setPasswordUser] = useState<{ id: string; name: string; email: string } | null>(
    null,
  );
  const [rebindUser, setRebindUser] = useState<{ id: string; name: string } | null>(null);
  const [deleteUser, setDeleteUser] = useState<{ id: string; name: string } | null>(null);

  const updateUser = useUpdateUser();

  const queryParams = {
    page,
    limit: pageSize,
    role: "student" as const,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.programCode ? { programCode: filters.programCode } : {}),
    ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
    ...(filters.semester !== "" ? { semester: filters.semester } : {}),
    ...(filters.divisionId ? { divisionId: filters.divisionId } : {}),
  };

  const { data, isLoading, isError } = useUsers(queryParams);

  const students = ((data?.users as unknown) as StudentRow[]) ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const allOnPageSelected =
    students.length > 0 && students.every((s) => selectedIds.includes(s.id));
  const someOnPageSelected =
    students.some((s) => selectedIds.includes(s.id)) && !allOnPageSelected;

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      // Remove all students on this page from selectedIds
      const pageIds = new Set(students.map((s) => s.id));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      // Add all students on this page to selectedIds
      const current = new Set(selectedIds);
      students.forEach((s) => current.add(s.id));
      onSelectionChange(Array.from(current));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleToggleStatus = (student: StudentRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = student.studentProfile?.status;
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    updateUser.mutate({
      id: student.id,
      body: { status: nextStatus },
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "suspended":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all students"
                  />
                </TableHead>
                <TableHead className="min-w-[220px]">Student</TableHead>
                <TableHead className="min-w-[130px]">Enrollment No</TableHead>
                <TableHead className="min-w-[80px]">Roll No</TableHead>
                <TableHead className="min-w-[160px]">Program & Class</TableHead>
                <TableHead className="min-w-[100px]">Division</TableHead>
                <TableHead className="min-w-[150px]">Hardware Device</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-4 mx-auto rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                    <TableCell><Skeleton className="size-8 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-destructive">
                    Failed to load students. Please try again.
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconSchool className="size-8 text-muted-foreground/50" />
                      <p className="font-medium text-foreground">No students match your filter criteria</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your program, semester, division, or search query.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => {
                  const profile = student.studentProfile;
                  const isSelected = selectedIds.includes(student.id);
                  const programName =
                    profile?.division?.programSemester?.program?.shortName ||
                    profile?.division?.programSemester?.program?.name ||
                    profile?.programCode;
                  const semester = profile?.division?.programSemester?.semester;

                  return (
                    <TableRow
                      key={student.id}
                      onClick={() => onSelectStudent(student.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/40",
                        isSelected && "bg-primary/5 hover:bg-primary/10",
                      )}
                    >
                      {/* Checkbox Column */}
                      <TableCell
                        className="text-center"
                        onClick={(e) => handleToggleSelectRow(student.id, e)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          aria-label={`Select ${student.name}`}
                        />
                      </TableCell>

                      {/* Student Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 border border-border">
                            <AvatarImage src={student.image ?? undefined} alt={student.name} />
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                              {student.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate">
                            <span className="font-medium text-foreground text-xs sm:text-sm block truncate">
                              {student.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {student.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Enrollment Number */}
                      <TableCell>
                        {profile?.enrollmentNo ? (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted border border-border/80 text-foreground">
                            {profile.enrollmentNo}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Roll Number */}
                      <TableCell>
                        <span className="font-mono text-xs text-foreground font-medium">
                          {profile?.rollNumber ?? "—"}
                        </span>
                      </TableCell>

                      {/* Program & Semester */}
                      <TableCell>
                        <span className="text-xs font-medium text-foreground">
                          {programName}
                          {semester ? ` - Sem ${semester}` : ""}
                        </span>
                      </TableCell>

                      {/* Division */}
                      <TableCell>
                        {profile?.division?.name ? (
                          <Badge variant="outline" className="text-xs font-semibold">
                            {profile.division.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Hardware Device */}
                      <TableCell>
                        {profile?.deviceBound ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <IconDeviceMobileCheck className="size-3.5" />
                            <span className="truncate max-w-[130px]">
                              {profile.deviceModel || "Device Bound"}
                            </span>
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                          >
                            Unbound
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider",
                            getStatusBadge(profile?.status),
                          )}
                        >
                          {profile?.status || "active"}
                        </span>
                      </TableCell>

                      {/* Single Row Actions */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 rounded-full hover:bg-muted"
                            >
                              <IconDots className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                              Student Options
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => onSelectStudent(student.id)}
                              className="gap-2 text-xs"
                            >
                              <IconEye className="size-4" />
                              View Full Scores & Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setPasswordUser({
                                  id: student.id,
                                  name: student.name,
                                  email: student.email,
                                })
                              }
                              className="gap-2 text-xs"
                            >
                              <IconKey className="size-4" />
                              Change Password
                            </DropdownMenuItem>

                            {profile?.deviceBound && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setRebindUser({ id: student.id, name: student.name })
                                }
                                className="gap-2 text-xs text-amber-600"
                              >
                                <IconRefresh className="size-4" />
                                Reset Device Binding
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={(e) => handleToggleStatus(student, e)}
                              className="gap-2 text-xs"
                            >
                              {profile?.status === "suspended" ? (
                                <>
                                  <IconUserCheck className="size-4 text-emerald-500" />
                                  Reactivate Student
                                </>
                              ) : (
                                <>
                                  <IconUserX className="size-4 text-amber-500" />
                                  Suspend Student
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                setDeleteUser({ id: student.id, name: student.name })
                              }
                              className="gap-2 text-xs text-destructive"
                            >
                              <IconTrash className="size-4" />
                              Delete Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {(!isLoading && students.length > 0) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border/70 bg-card text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, pagination.total || 0)} to{" "}
                {Math.min(page * pageSize, pagination.total || 0)} of{" "}
                <strong className="text-foreground font-semibold">{pagination.total || 0}</strong> students
              </span>

              <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-border/60">
                <span className="text-[11px]">Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page <= 1 || isLoading}
                className="h-8 w-8 p-0"
                title="First page"
              >
                <IconChevronsLeft className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="h-8 gap-1 text-xs px-2.5"
              >
                <IconChevronLeft className="size-3.5" />
                Previous
              </Button>

              <span className="px-2 font-medium text-foreground text-xs whitespace-nowrap">
                Page {page} of {Math.max(1, pagination.totalPages)}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || isLoading}
                className="h-8 gap-1 text-xs px-2.5"
              >
                Next
                <IconChevronRight className="size-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(pagination.totalPages)}
                disabled={page >= pagination.totalPages || isLoading}
                className="h-8 w-8 p-0"
                title="Last page"
              >
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Row-Action Dialogs */}
      {passwordUser && (
        <ChangePasswordDialog
          userId={passwordUser.id}
          userName={passwordUser.name}
          userEmail={passwordUser.email}
          open={Boolean(passwordUser)}
          onOpenChange={(open) => !open && setPasswordUser(null)}
        />
      )}

      {rebindUser && (
        <DeviceRebindDialog
          userId={rebindUser.id}
          userName={rebindUser.name}
          open={Boolean(rebindUser)}
          onOpenChange={(open) => !open && setRebindUser(null)}
        />
      )}

      {deleteUser && (
        <DeleteUserAlert
          userId={deleteUser.id}
          userName={deleteUser.name}
          open={Boolean(deleteUser)}
          onOpenChange={(open) => !open && setDeleteUser(null)}
        />
      )}
    </>
  );
}
