import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconDots,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
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
import { AdminPageHeader, TableSkeletonRows } from "@/components/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
            <IconDots className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
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
            <IconPencil className="mr-2 size-4" /> Edit Dates
          </DropdownMenuItem>
          {!year.isCurrent && (
            <DropdownMenuItem onClick={handleSetCurrent}>
              <IconCheck className="mr-2 size-4 text-emerald-500" /> Set as Current Active
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <IconTrash className="mr-2 size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Academic Year</DialogTitle>
            <DialogDescription>
              Update the active timeline and status for {year.name}.
            </DialogDescription>
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
    <div className="space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="Academic Years"
        subtitle="Manage institutional academic cycles and designate the active enrollment period."
        icon={<IconCalendar className="size-6 text-primary" />}
        badge={
          years?.length ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {years.length} Cycles
            </span>
          ) : undefined
        }
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 text-xs sm:text-sm h-9 w-full sm:w-auto shadow-xs">
                <IconPlus className="size-4" /> Add Academic Year
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
        }
      />

      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto touch-pan-x">
          <Table className="min-w-[550px] sm:min-w-full">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Academic Year</TableHead>
                <TableHead className="text-xs font-semibold">Start Date</TableHead>
                <TableHead className="text-xs font-semibold">End Date</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="w-12 text-right text-xs font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows rows={6} columns={5} hasAvatar={false} hasActions={true} />
              ) : (
                <>
                  {years?.map((year: any) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-semibold text-foreground">{year.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {year.startDate
                          ? new Date(year.startDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
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
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                            <IconCheck className="size-3" /> Current
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AcademicYearRowActions year={year} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!years || years.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-sm">
                        No academic years configured yet.
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
