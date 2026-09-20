import { useState } from "react";
import {
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
import { useUsers } from "@/hooks/api/use-admin-users";
import { AdminPageHeader, AdminKpiCard } from "@/components/admin";
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
      <AdminPageHeader
        title="Student Management"
        subtitle="Filter by academic program, class, semester & division, review attendance scores, and manage credentials."
        icon={<IconSchool className="size-6 text-primary" />}
        badge={
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            {totalStudents} Enrolled
          </span>
        }
        actions={
          <>
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
          </>
        }
      />

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminKpiCard
          title="Total Students"
          value={totalStudents}
          subtitle="in database"
          icon={IconUsers}
          color="blue"
          isLoading={allLoading}
        />

        <AdminKpiCard
          title="Active & Scanning"
          value={activeStudents}
          subtitle="device bound"
          icon={IconUserCheck}
          color="emerald"
          isLoading={activeLoading}
        />

        <AdminKpiCard
          title="Pending Activation"
          value={pendingStudents}
          subtitle="awaiting phone"
          icon={IconDeviceMobile}
          color="amber"
          isLoading={pendingLoading}
        />

        <AdminKpiCard
          title="Suspended"
          value={suspendedStudents}
          subtitle="access revoked"
          icon={IconUserX}
          color="rose"
          isLoading={suspendedLoading}
        />
      </div>

      {/* Academic Filter Toolbar */}
      <StudentFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {/* Student Data Table */}
      <StudentTable
        filters={filters}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSelectStudent={(id) => setActiveStudentId(id)}
      />

      {/* Floating Multi-Select Bulk Actions Toolbar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Slide-over Student Detail Sheet */}
      <StudentDetailSheet
        studentId={activeStudentId}
        open={!!activeStudentId}
        onOpenChange={(open) => !open && setActiveStudentId(null)}
      />

      {/* Quick Add Student Dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultRole="student"
      />
    </div>
  );
}
