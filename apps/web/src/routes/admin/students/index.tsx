import { useState } from "react";
import {
  IconChecklist,
  IconClock,
  IconDeviceMobile,
  IconPlus,
  IconSchool,
  IconUpload,
  IconUserCheck,
  IconUsers,
  IconUserX,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/hooks/api/use-admin-users";
import { cn } from "@/lib/utils";

import { CreateUserDialog } from "@/features/admin/users/components/create-user-dialog";
import {
  StudentFilters,
  type StudentFilterState,
} from "@/features/admin/students/components/student-filters";
import { StudentTable } from "@/features/admin/students/components/student-table";
import { BulkActionsBar } from "@/features/admin/students/components/bulk-actions-bar";
import { StudentDetailSheet } from "@/features/admin/students/components/student-detail-sheet";

export const Route = createFileRoute("/admin/students/")({
  component: StudentsPage,
});

const defaultFilters: StudentFilterState = {
  search: "",
  programCode: "",
  academicYearId: "",
  semester: "",
  divisionId: "",
  status: "",
};

function StudentsPage() {
  const [filters, setFilters] = useState<StudentFilterState>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Overall student statistics queries for KPI cards
  const { data: allStudentsData, isLoading: allLoading } = useUsers({
    role: "student",
    limit: 1,
  });
  const { data: activeStudentsData, isLoading: activeLoading } = useUsers({
    role: "student",
    status: "active",
    limit: 1,
  });
  const { data: pendingStudentsData, isLoading: pendingLoading } = useUsers({
    role: "student",
    status: "pending",
    limit: 1,
  });
  const { data: suspendedStudentsData, isLoading: suspendedLoading } = useUsers({
    role: "student",
    status: "suspended",
    limit: 1,
  });

  const totalStudents = allStudentsData?.pagination?.total ?? 0;
  const activeStudents = activeStudentsData?.pagination?.total ?? 0;
  const pendingStudents = pendingStudentsData?.pagination?.total ?? 0;
  const suspendedStudents = suspendedStudentsData?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 min-w-0 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Student Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {totalStudents} Enrolled
            </span>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Filter by academic program, class, semester & division, review attendance scores, and
            manage credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Link
            to="/admin/users/import"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-1.5 text-xs sm:text-sm h-9 w-full sm:w-auto shrink-0 justify-center",
            )}
          >
            <IconUpload className="size-4" />
            Bulk Import
          </Link>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 text-xs sm:text-sm h-9 w-full sm:w-auto shrink-0 justify-center shadow-xs"
          >
            <IconPlus className="size-4" />
            New Student
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-border/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Students</span>
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-500">
              <IconUsers className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {allLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalStudents}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">in database</span>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-border/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active & Scanning</span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
              <IconUserCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {activeLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeStudents}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">device bound</span>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-border/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Activation</span>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
              <IconDeviceMobile className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {pendingLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {pendingStudents}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">awaiting phone</span>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-border/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Suspended</span>
            <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-500">
              <IconUserX className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {suspendedLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {suspendedStudents}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">access revoked</span>
          </div>
        </Card>
      </div>

      {/* Academic Filter Toolbar */}
      <StudentFilters
        filters={filters}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setSelectedIds([]); // Clear selection when filters change
        }}
        onReset={() => {
          setFilters(defaultFilters);
          setSelectedIds([]);
        }}
      />

      {/* Multi-Select Student Table */}
      <StudentTable
        filters={filters}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSelectStudent={(id) => setActiveStudentId(id)}
      />

      {/* Sticky Bulk Action Toolbar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Slide-over Student Detail Sheet */}
      <StudentDetailSheet
        studentId={activeStudentId}
        open={Boolean(activeStudentId)}
        onOpenChange={(open) => !open && setActiveStudentId(null)}
      />

      {/* Create Student Dialog */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
