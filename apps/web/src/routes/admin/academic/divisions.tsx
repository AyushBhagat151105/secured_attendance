import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import {
  IconDots,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  createDivisionSchema,
  updateDivisionSchema,
  type CreateDivisionSchema,
  type UpdateDivisionSchema,
} from "@secured_attendance/validators";
import {
  useDivisions,
  useCreateDivision,
  useUpdateDivision,
  useDeleteDivision,
  usePrograms,
  useAcademicYears,
  useProgramSemesters,
  useCreateProgramSemester,
} from "@/hooks/api/use-admin-academic";
import { AdminPageHeader, TableSkeletonRows } from "@/components/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

export const Route = createFileRoute("/admin/academic/divisions")({
  component: DivisionsRoute,
});

function DivisionRowActions({ division }: { division: any }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const updateDivision = useUpdateDivision();
  const deleteDivision = useDeleteDivision();

  const form = useForm<UpdateDivisionSchema>({
    resolver: zodResolver(updateDivisionSchema),
    defaultValues: {
      name: division.name,
    },
  });

  const onSubmit = async (value: UpdateDivisionSchema) => {
    await updateDivision.mutateAsync({ id: division.id, body: value });
    setShowEdit(false);
  };

  const onDeleteConfirm = async () => {
    await deleteDivision.mutateAsync(division.id);
    setShowDelete(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <IconDots className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              form.reset({ name: division.name });
              setShowEdit(true);
            }}
          >
            <IconPencil className="mr-2 size-4" /> Rename Division
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <IconTrash className="mr-2 size-4" /> Delete Division
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Division / Batch</DialogTitle>
            <DialogDescription>
              Change the section name for {division.name} (e.g. Div A, Batch 1).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Division Name</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{division.name}</strong> section. Students
              assigned to this division will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDivision.isPending}
            >
              {deleteDivision.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DivisionsRoute() {
  const { data: divisions, isLoading: loadingDivisions } = useDivisions();
  const { data: programs } = usePrograms();
  const { data: years } = useAcademicYears();
  const { data: semesters } = useProgramSemesters();

  const createSemester = useCreateProgramSemester();
  const createDivision = useCreateDivision();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("ALL");
  const [selectedYearFilter, setSelectedYearFilter] = useState("ALL");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [newProgramId, setNewProgramId] = useState("");
  const [newAcademicYearId, setNewAcademicYearId] = useState("");
  const [newSemesterNum, setNewSemesterNum] = useState("1");
  const [newDivisionName, setNewDivisionName] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Set default active academic year when available
  const currentAcademicYear = useMemo(() => {
    return years?.find((y: any) => y.isCurrent) || years?.[0];
  }, [years]);

  const filteredDivisions = useMemo(() => {
    if (!divisions) return [];
    return divisions.filter((div: any) => {
      const ps = div.programSemester;
      const prog = ps?.program;
      const year = ps?.academicYear;

      if (selectedProgramFilter !== "ALL" && prog?.id !== selectedProgramFilter) {
        return false;
      }
      if (selectedYearFilter !== "ALL" && year?.id !== selectedYearFilter) {
        return false;
      }
      if (
        selectedSemesterFilter !== "ALL" &&
        ps?.semester !== parseInt(selectedSemesterFilter, 10)
      ) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = div.name.toLowerCase().includes(q);
        const matchProg =
          prog?.name?.toLowerCase().includes(q) || prog?.code?.toLowerCase().includes(q);
        if (!matchName && !matchProg) return false;
      }
      return true;
    });
  }, [divisions, selectedProgramFilter, selectedYearFilter, selectedSemesterFilter, searchQuery]);

  const handleOpenAddDialog = () => {
    if (programs && programs.length > 0 && !newProgramId) {
      setNewProgramId(programs[0].id);
    }
    if (currentAcademicYear && !newAcademicYearId) {
      setNewAcademicYearId(currentAcademicYear.id);
    }
    setNewSemesterNum("1");
    setNewDivisionName("");
    setIsOpen(true);
  };

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgramId || !newAcademicYearId || !newSemesterNum || !newDivisionName.trim()) {
      return;
    }

    setIsSubmittingNew(true);
    try {
      const semNumber = parseInt(newSemesterNum, 10);
      let targetSemester = semesters?.find(
        (s: any) =>
          s.programId === newProgramId &&
          s.academicYearId === newAcademicYearId &&
          s.semester === semNumber,
      );

      if (!targetSemester) {
        targetSemester = (await createSemester.mutateAsync({
          programId: newProgramId,
          academicYearId: newAcademicYearId,
          semester: semNumber,
        })) as any;
      }

      const semesterId = targetSemester?.id;
      if (!semesterId) throw new Error("Failed to find or create semester");

      await createDivision.mutateAsync({
        name: newDivisionName.trim(),
        programSemesterId: semesterId,
      });

      setIsOpen(false);
      setNewDivisionName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="Divisions & Batches"
        subtitle="Organize student cohorts, classes, and academic batches to ensure seamless attendance matching."
        icon={<IconUsersGroup className="size-6 text-primary" />}
        badge={
          divisions?.length ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {divisions.length} Divisions
            </span>
          ) : undefined
        }
        actions={
          <Button
            onClick={handleOpenAddDialog}
            className="gap-1.5 text-xs sm:text-sm h-9 w-full sm:w-auto shadow-xs"
          >
            <IconPlus className="size-4" /> Add Division
          </Button>
        }
      />

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Division / Batch</DialogTitle>
            <DialogDescription>
              Create a new division or batch for a specific program and semester.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDivision} className="space-y-4">
            <Field>
              <FieldLabel>Program</FieldLabel>
              <Select value={newProgramId} onValueChange={setNewProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Academic Year</FieldLabel>
              <Select value={newAcademicYearId} onValueChange={setNewAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {years?.map((y: any) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Semester</FieldLabel>
              <Select value={newSemesterNum} onValueChange={setNewSemesterNum}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      Semester {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Division Name</FieldLabel>
              <Input
                placeholder="e.g. Div A, Batch 1, Group A"
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
              />
            </Field>

            <DialogFooter>
              <Button type="submit" disabled={isSubmittingNew || !newDivisionName.trim()}>
                {isSubmittingNew ? "Creating..." : "Create Division"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4 border-border/70 shadow-xs bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search division or program..."
              className="pl-8.5 h-9 text-xs sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Programs</SelectItem>
                {programs?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                {years?.map((y: any) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSemesterFilter} onValueChange={setSelectedSemesterFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    Sem {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Divisions Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto touch-pan-x">
          <Table className="min-w-[600px] sm:min-w-full">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Division / Batch</TableHead>
                <TableHead className="text-xs font-semibold">Program</TableHead>
                <TableHead className="text-xs font-semibold">Semester</TableHead>
                <TableHead className="text-xs font-semibold">Academic Year</TableHead>
                <TableHead className="w-12 text-right text-xs font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDivisions ? (
                <TableSkeletonRows rows={6} columns={5} hasAvatar={false} hasActions={true} />
              ) : (
                <>
                  {filteredDivisions.map((division: any) => {
                    const ps = division.programSemester;
                    const prog = ps?.program;
                    const year = ps?.academicYear;
                    return (
                      <TableRow key={division.id}>
                        <TableCell className="font-semibold text-foreground">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {division.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{prog?.name || "—"}</div>
                          <div className="text-muted-foreground text-xs">{prog?.code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            Semester {ps?.semester ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{year?.name || "—"}</span>
                            {year?.isCurrent && (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 border-emerald-500/20">
                                Current
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DivisionRowActions division={division} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredDivisions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-sm">
                        No divisions found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
