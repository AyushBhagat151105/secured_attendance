import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  type CreateAcademicYearSchema,
  type UpdateAcademicYearSchema,
} from "@secured_attendance/validators";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useDeleteAcademicYear,
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
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Pencil, Trash, Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/academic/years")({
  component: AcademicYearsRoute,
});

function AcademicYearRowActions({ year }: { year: any }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const updateYear = useUpdateAcademicYear();
  const deleteYear = useDeleteAcademicYear();

  const form = useForm<UpdateAcademicYearSchema>({
    resolver: zodResolver(updateAcademicYearSchema),
    defaultValues: {
      name: year.name,
      startDate: year.startDate ? new Date(year.startDate).toISOString().split("T")[0] : "",
      endDate: year.endDate ? new Date(year.endDate).toISOString().split("T")[0] : "",
      isCurrent: year.isCurrent ?? false,
    },
  });

  const onSubmit = async (value: UpdateAcademicYearSchema) => {
    await updateYear.mutateAsync({
      id: year.id,
      body: {
        ...value,
        ...(value.startDate ? { startDate: new Date(value.startDate).toISOString() } : {}),
        ...(value.endDate ? { endDate: new Date(value.endDate).toISOString() } : {}),
      },
    });
    setShowEdit(false);
  };

  const handleSetCurrent = async () => {
    await updateYear.mutateAsync({
      id: year.id,
      body: { isCurrent: true },
    });
  };

  const onDeleteConfirm = async () => {
    await deleteYear.mutateAsync(year.id);
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
          {!year.isCurrent && (
            <DropdownMenuItem onClick={handleSetCurrent}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Set as Current
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              form.reset({
                name: year.name,
                startDate: year.startDate
                  ? new Date(year.startDate).toISOString().split("T")[0]
                  : "",
                endDate: year.endDate ? new Date(year.endDate).toISOString().split("T")[0] : "",
                isCurrent: year.isCurrent ?? false,
              });
              setShowEdit(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
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
            <DialogTitle>Edit Academic Year</DialogTitle>
            <DialogDescription>Update details for {year.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Year Name</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Start Date</FieldLabel>
                    <Input
                      type="date"
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>End Date</FieldLabel>
                    <Input
                      type="date"
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="isCurrent"
              render={({ field }) => (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="edit-isCurrent"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor="edit-isCurrent"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Set as Current Active Academic Year
                  </label>
                </div>
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
              This will permanently delete the <strong>{year.name}</strong> academic year. Any
              associated semesters and schedules may be affected.
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
              disabled={deleteYear.isPending}
            >
              {deleteYear.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AcademicYearsRoute() {
  const { data: years, isLoading } = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<CreateAcademicYearSchema>({
    resolver: zodResolver(createAcademicYearSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    },
  });

  const onSubmit = async (value: CreateAcademicYearSchema) => {
    await createYear.mutateAsync({
      ...value,
      startDate: new Date(value.startDate).toISOString(),
      endDate: new Date(value.endDate).toISOString(),
    });
    form.reset();
    setIsOpen(false);
  };

  return (
    <div className="flex-1 space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Academic Years</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Manage institutional academic cycles and designate active years
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Academic Year
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Academic Year</DialogTitle>
                <DialogDescription>
                  Define a new academic year period (e.g. 2026-2027).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Year Name</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="2026-2027"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="startDate"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Start Date</FieldLabel>
                        <Input
                          type="date"
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="endDate"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>End Date</FieldLabel>
                        <Input
                          type="date"
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
                <Controller
                  control={form.control}
                  name="isCurrent"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="new-isCurrent"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="new-isCurrent"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Set as Current Active Academic Year
                      </label>
                    </div>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Academic Year"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Academic Years</CardTitle>
          <CardDescription>
            All configured academic cycles. The active year is automatically assigned to newly
            imported batches.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto touch-pan-x">
              <Table className="min-w-[550px] sm:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years?.map((year: any) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-semibold">{year.name}</TableCell>
                      <TableCell>
                        {year.startDate
                          ? new Date(year.startDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {year.endDate
                          ? new Date(year.endDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {year.isCurrent ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Current
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <AcademicYearRowActions year={year} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!years || years.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No academic years configured.
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
