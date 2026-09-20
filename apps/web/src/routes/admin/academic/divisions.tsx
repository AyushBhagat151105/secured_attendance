import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { MoreHorizontal, Pencil, Trash, Plus, Search, Filter } from "lucide-react";

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
            <MoreHorizontal className="h-4 w-4" />
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
            <Pencil className="mr-2 h-4 w-4" /> Rename / Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Division</DialogTitle>
            <DialogDescription>
              Update the name of this division or batch (e.g. Div-I, Div-II).
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
              This will delete division <strong>{division.name}</strong>. Students enrolled in this
              division may lose their division association.
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

  const createDivision = useCreateDivision();
  const createSemester = useCreateProgramSemester();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("ALL");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>("ALL");

  // Create division form state
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
        const matchProg = prog?.name?.toLowerCase().includes(q) || prog?.code?.toLowerCase().includes(q);
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
      // Check if ProgramSemester already exists
      let targetSemester = semesters?.find(
        (s: any) =>
          s.programId === newProgramId &&
          s.academicYearId === newAcademicYearId &&
          s.semester === semNumber,
      );

      // If not, create it first
      if (!targetSemester) {
        targetSemester = (await createSemester.mutateAsync({
          programId: newProgramId,
          academicYearId: newAcademicYearId,
          semester: semNumber,
        })) as any;
      }

      const semesterId = targetSemester?.id;
      if (!semesterId) throw new Error("Failed to find or create semester");

      // Now create division
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
    <div className="flex-1 space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Divisions & Batches</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Organize student cohorts, classes, and academic batches to ensure seamless attendance
            matching
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Division
          </Button>

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
                  <FieldLabel>Division / Batch Name</FieldLabel>
                  <Input
                    placeholder="e.g. Div-I, Div-II, or Batch-A1"
                    value={newDivisionName}
                    onChange={(e) => setNewDivisionName(e.target.value)}
                    required
                  />
                  <p className="text-muted-foreground text-xs mt-1">
                    Consistent naming (e.g. <code>Div-I</code>) ensures student CSV imports match
                    correctly.
                  </p>
                </Field>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmittingNew || !newDivisionName.trim()}>
                    {isSubmittingNew ? "Creating..." : "Create Division"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search division or program..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
                <SelectTrigger className="w-full sm:w-44">
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
                <SelectTrigger className="w-full sm:w-40">
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
                <SelectTrigger className="w-full sm:w-36">
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
        </CardContent>
      </Card>

      {/* Divisions Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Configured Divisions</CardTitle>
          <CardDescription>
            List of student batches. Timetables and student enrollments link to these records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {loadingDivisions ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto touch-pan-x">
              <Table className="min-w-[600px] sm:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Division / Batch</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                          <Badge variant="outline">Semester {ps?.semester ?? "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span>{year?.name || "—"}</span>
                            {year?.isCurrent && (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] py-0">
                                Current
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DivisionRowActions division={division} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredDivisions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        {divisions && divisions.length > 0
                          ? "No divisions match the selected filters."
                          : "No divisions configured yet. Click 'Add Division' to create one."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
