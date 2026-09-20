import { useMemo } from "react";
import {
  IconFilter,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePrograms,
  useAcademicYears,
  useDivisions,
} from "@/hooks/api/use-admin-academic";
import type { UserStatus } from "@/services/admin/users.service";

export interface StudentFilterState {
  search: string;
  programCode: string;
  academicYearId: string;
  semester: number | "";
  divisionId: string;
  status: UserStatus | "";
}

interface StudentFiltersProps {
  filters: StudentFilterState;
  onFilterChange: (filters: StudentFilterState) => void;
  onReset: () => void;
}

export function StudentFilters({
  filters,
  onFilterChange,
  onReset,
}: StudentFiltersProps) {
  const { data: programs = [] } = usePrograms();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: divisions = [] } = useDivisions();

  // Cascade divisions based on selected semester or program
  const filteredDivisions = useMemo(() => {
    return divisions.filter((div: any) => {
      if (
        filters.semester !== "" &&
        div.programSemester?.semester !== Number(filters.semester)
      ) {
        return false;
      }
      if (
        filters.programCode &&
        div.programSemester?.program?.code !== filters.programCode
      ) {
        return false;
      }
      if (
        filters.academicYearId &&
        div.programSemester?.academicYearId !== filters.academicYearId
      ) {
        return false;
      }
      return true;
    });
  }, [divisions, filters.semester, filters.programCode, filters.academicYearId]);

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.programCode) ||
    Boolean(filters.academicYearId) ||
    filters.semester !== "" ||
    Boolean(filters.divisionId) ||
    Boolean(filters.status);

  const update = (key: keyof StudentFilterState, value: any) => {
    const updated = { ...filters, [key]: value };
    // If program or semester changed and current division is no longer valid, reset division
    if (key === "programCode" || key === "semester" || key === "academicYearId") {
      updated.divisionId = "";
    }
    onFilterChange(updated);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, enrollment (e.g. 26msit006), or roll no..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9 pr-9 h-9 text-xs sm:text-sm bg-background"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground self-end lg:self-auto shrink-0"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Cascading Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 pt-1 border-t border-border/50">
        {/* Program Filter */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Program
          </label>
          <Select
            value={filters.programCode || "ALL"}
            onValueChange={(val) => update("programCode", val === "ALL" ? "" : val)}
          >
            <SelectTrigger className="w-full h-8 text-xs bg-background">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Programs</SelectItem>
              {programs.map((p: any) => (
                <SelectItem key={p.id} value={p.code}>
                  {p.shortName || p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Academic Year */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Academic Year
          </label>
          <Select
            value={filters.academicYearId || "ALL"}
            onValueChange={(val) => update("academicYearId", val === "ALL" ? "" : val)}
          >
            <SelectTrigger className="w-full h-8 text-xs bg-background">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {academicYears.map((y: any) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? "(Current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Semester Filter */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Semester
          </label>
          <Select
            value={filters.semester === "" ? "ALL" : String(filters.semester)}
            onValueChange={(val) => update("semester", val === "ALL" ? "" : Number(val))}
          >
            <SelectTrigger className="w-full h-8 text-xs bg-background">
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Semesters</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <SelectItem key={sem} value={String(sem)}>
                  Semester {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Division Filter */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Division
          </label>
          <Select
            value={filters.divisionId || "ALL"}
            onValueChange={(val) => update("divisionId", val === "ALL" ? "" : val)}
          >
            <SelectTrigger className="w-full h-8 text-xs bg-background">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Divisions</SelectItem>
              {filteredDivisions.map((d: any) => {
                const sem = d.programSemester?.semester;
                const prog = d.programSemester?.program?.shortName;
                return (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} {prog && sem ? `(${prog} S${sem})` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Status
          </label>
          <Select
            value={filters.status || "ALL"}
            onValueChange={(val) => update("status", val === "ALL" ? "" : (val as UserStatus))}
          >
            <SelectTrigger className="w-full h-8 text-xs bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="active">
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>Active</span>
                </div>
              </SelectItem>
              <SelectItem value="suspended">
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  <span>Suspended</span>
                </div>
              </SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  <span>Pending (Unbound)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
