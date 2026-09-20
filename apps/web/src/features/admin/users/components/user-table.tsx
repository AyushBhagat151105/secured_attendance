import { flexRender } from "@tanstack/react-table";
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { useState } from "react";
import { IconPlus, IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsers } from "@/hooks/api/use-admin-users";
import { TableSkeletonRows } from "@/components/admin";
import type { UserListParams, UserRole, UserStatus } from "@/services/admin/users.service";
import { CreateUserDialog } from "./create-user-dialog";
import {
  type UserRow,
  userColumns,
  studentColumns,
  teacherColumns,
  adminColumns,
} from "./user-columns";

const PAGE_SIZE = 20;

interface UserTableProps {
  createOpen?: boolean;
  setCreateOpen?: (open: boolean) => void;
}

export function UserTable({
  createOpen: externalCreateOpen,
  setCreateOpen: externalSetCreateOpen,
}: UserTableProps = {}) {
  const [activeTab, setActiveTab] = useState<"all" | "student" | "teacher" | "admin">("student");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);

  const isCreateOpen = externalCreateOpen !== undefined ? externalCreateOpen : internalCreateOpen;
  const setCreateOpen = externalSetCreateOpen !== undefined ? externalSetCreateOpen : setInternalCreateOpen;

  const params: UserListParams = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(activeTab !== "all" ? { role: activeTab as UserRole } : {}),
    ...(status ? { status } : {}),
  };

  const { data, isLoading, isError } = useUsers(params);

  let activeColumns = userColumns;
  if (activeTab === "student") activeColumns = studentColumns;
  if (activeTab === "teacher") activeColumns = teacherColumns;
  if (activeTab === "admin") activeColumns = adminColumns;

  const table = useLegacyTable<UserRow>({
    data: (data?.users as UserRow[]) ?? [],
    columns: activeColumns as LegacyColumnDef<UserRow>[],
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.pagination?.totalPages ?? 1,
  });

  const totalPages = data?.pagination?.totalPages ?? 1;

  const handleTabChange = (val: string) => {
    setActiveTab(val as "all" | "student" | "teacher" | "admin");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto h-9">
            <TabsTrigger value="student" className="text-xs sm:text-sm">Students</TabsTrigger>
            <TabsTrigger value="teacher" className="text-xs sm:text-sm">Teachers</TabsTrigger>
            <TabsTrigger value="admin" className="text-xs sm:text-sm">Admins</TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">All Users</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 shrink-0 w-full sm:w-auto h-9 text-xs sm:text-sm shadow-xs"
        >
          <IconPlus className="size-4" />
          New User
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8.5 h-9 text-xs sm:text-sm w-full"
            />
          </div>
          <Select
            value={status || "all"}
            onValueChange={(v) => {
              setStatus(v === "all" ? "" : (v as UserStatus));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto touch-pan-x">
          <Table className="min-w-[620px] sm:min-w-full">
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows
                  rows={8}
                  columns={activeColumns.length}
                  hasAvatar={true}
                  hasActions={true}
                />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={activeColumns.length}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    Failed to load users. Please try again.
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={activeColumns.length}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    No users found.{" "}
                    {search || status ? "Try clearing your filters." : "Create your first user."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-muted-foreground px-1">
        <span>
          {data
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data.pagination.total)} of ${data.pagination.total} users`
            : "Loading..."}
        </span>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="h-8 text-xs"
          >
            Previous
          </Button>
          <span className="text-xs font-medium text-foreground px-1">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="h-8 text-xs"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Internal dialog if not managed externally */}
      {externalCreateOpen === undefined && (
        <CreateUserDialog open={internalCreateOpen} onOpenChange={setInternalCreateOpen} />
      )}
    </div>
  );
}
