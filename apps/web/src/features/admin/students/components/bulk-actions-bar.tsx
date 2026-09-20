import { useState } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFolders,
  IconSchool,
  IconTrash,
  IconUserCheck,
  IconUserX,
  IconX,
} from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  useBulkDeleteUsers,
  useBulkStatusUsers,
  useBulkDivisionStudents,
} from "@/hooks/api/use-admin-users";
import { useDivisions } from "@/hooks/api/use-admin-academic";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "suspended" | "pending">("active");

  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const bulkDelete = useBulkDeleteUsers();
  const bulkStatus = useBulkStatusUsers();
  const bulkDivision = useBulkDivisionStudents();

  const { data: divisions = [] } = useDivisions();

  if (selectedIds.length === 0) return null;

  const count = selectedIds.length;

  const handleStatusSubmit = () => {
    bulkStatus.mutate(
      { userIds: selectedIds, status: selectedStatus },
      {
        onSuccess: () => {
          setStatusDialogOpen(false);
          onClearSelection();
        },
      },
    );
  };

  const handleDivisionSubmit = () => {
    if (!selectedDivisionId) return;
    bulkDivision.mutate(
      { userIds: selectedIds, divisionId: selectedDivisionId },
      {
        onSuccess: () => {
          setDivisionDialogOpen(false);
          onClearSelection();
        },
      },
    );
  };

  const handleDeleteSubmit = () => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setDeleteAlertOpen(false);
        onClearSelection();
      },
    });
  };

  return (
    <>
      <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-border/80 bg-background/95 p-2 sm:p-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 pl-2 pr-1">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {count}
            </span>
            <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
              {count === 1 ? "student selected" : "students selected"}
            </span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(true)}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <IconUserCheck className="h-3.5 w-3.5 text-emerald-500" />
              Update Status
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDivisionDialogOpen(true)}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <IconFolders className="h-3.5 w-3.5 text-blue-500" />
              Assign Division
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAlertOpen(true)}
              className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
            >
              <IconTrash className="h-3.5 w-3.5" />
              Delete
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 size-8 p-0 rounded-full hover:bg-muted"
              title="Deselect all"
            >
              <IconX className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <IconUserCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Bulk Status Update</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Change status for {count} selected student{count > 1 ? "s" : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Field>
              <FieldLabel className="text-xs font-medium">Select New Status</FieldLabel>
              <Select
                value={selectedStatus}
                onValueChange={(val) => setSelectedStatus(val as "active" | "suspended" | "pending")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="suspended">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500" />
                      <span>Suspended</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" />
                      <span>Pending (Awaiting Device)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <p className="text-[11px] text-muted-foreground">
              Updating to <strong>Suspended</strong> will restrict the students from marking
              attendance and signing into their accounts.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={bulkStatus.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleStatusSubmit} disabled={bulkStatus.isPending} className="gap-2">
              <IconCheck className="h-4 w-4" />
              {bulkStatus.isPending ? "Updating..." : `Update ${count} Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Division Dialog */}
      <Dialog open={divisionDialogOpen} onOpenChange={setDivisionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-500/10 p-2 text-blue-500">
                <IconFolders className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Bulk Division Assignment</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Reassign {count} student{count > 1 ? "s" : ""} to a specific class division
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Field>
              <FieldLabel className="text-xs font-medium">Select Target Division</FieldLabel>
              <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a division..." />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((div: any) => {
                    const sem = div.programSemester?.semester;
                    const prog = div.programSemester?.program?.shortName || div.programSemester?.program?.name;
                    return (
                      <SelectItem key={div.id} value={div.id}>
                        {div.name} {prog && sem ? `(${prog} - Sem ${sem})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>

            <p className="text-[11px] text-muted-foreground">
              Students will automatically inherit this division&apos;s timetable and attendance sessions.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDivisionDialogOpen(false)}
              disabled={bulkDivision.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDivisionSubmit}
              disabled={!selectedDivisionId || bulkDivision.isPending}
              className="gap-2"
            >
              <IconSchool className="h-4 w-4" />
              {bulkDivision.isPending ? "Assigning..." : `Assign to Division`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Delete {count} Selected Students?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will permanently delete <strong>{count}</strong> selected student account
              {count > 1 ? "s" : ""}, including their profiles, hardware bindings, and attendance
              records. This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              disabled={bulkDelete.isPending}
            >
              <IconTrash className="h-4 w-4" />
              {bulkDelete.isPending ? "Deleting..." : `Delete ${count} Students`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
