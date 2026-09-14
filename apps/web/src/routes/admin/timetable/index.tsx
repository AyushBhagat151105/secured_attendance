import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
  type CreateTimetableEntrySchema,
  type UpdateTimetableEntrySchema,
} from "@secured_attendance/validators";

import { useTimetableEntries } from "@/hooks/api/use-admin-timetable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Pencil, Trash, UserIcon } from "lucide-react";
import { useState, useMemo } from "react";
import {
  useCreateTimetableEntry,
  useUpdateTimetableEntry,
  useDeleteTimetableEntry,
} from "@/hooks/api/use-admin-timetable";
import {
  useAcademicYears,
  useProgramSemesters,
  useSubjects,
  useDivisions,
} from "@/hooks/api/use-admin-academic";
import { useRooms } from "@/hooks/api/use-admin-campus";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/api/use-admin-users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconLocation } from "@tabler/icons-react";

export const Route = createFileRoute("/admin/timetable/")({
  component: TimetableRoute,
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatTime = (time: string) => {
  if (!time) return "";
  const [hoursStr, minutesStr] = time.split(":");
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutesStr} ${ampm}`;
};

function TeacherInput({ value, onChange, onBlur, name, ref }: any) {
  const [focused, setFocused] = useState(false);
  const { data } = useUsers({ role: "teacher", limit: 100 });
  const teachers = data?.users || [];

  const stringValue = value || "";
  const tokens = stringValue.split(",").map((t: string) => t.trim());
  const currentToken = tokens[tokens.length - 1] || "";

  const suggestions = teachers.filter((t: any) => {
    const code = t.teacherProfile?.code || "";
    const teacherName = t.name || "";
    return (
      (code.toLowerCase().includes(currentToken.toLowerCase()) ||
        teacherName.toLowerCase().includes(currentToken.toLowerCase())) &&
      !tokens.slice(0, -1).includes(code)
    );
  });

  const handleSelect = (teacher: any) => {
    const code = teacher.teacherProfile?.code || teacher.id;
    const newTokens = [...tokens.slice(0, -1), code];
    onChange(newTokens.join(", ") + ", ");
  };

  return (
    <div className="relative">
      <Input
        name={name}
        ref={ref}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setTimeout(() => setFocused(false), 200);
          if (onBlur) onBlur(e);
        }}
        placeholder="T01, T02"
        autoComplete="new-password"
        spellCheck="false"
      />
      {focused && currentToken && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto text-sm">
          {suggestions.map((t: any) => (
            <div
              key={t.id}
              className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(t);
              }}
            >
              <span className="font-semibold">{t.teacherProfile?.code}</span>
              <span className="text-muted-foreground text-xs">{t.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimetableEntryActions({ entry, days, programs, years, subjects, rooms, divisions }: any) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const updateEntry = useUpdateTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  const form = useForm<UpdateTimetableEntrySchema>({
    resolver: zodResolver(updateTimetableEntrySchema),
    defaultValues: {
      subjectId: entry.subjectId,
      roomId: entry.roomId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      type: entry.type || "",
      teacherCodes: entry.teacherCodes?.join(", ") || "",
    },
  });

  const onSubmit = async (value: UpdateTimetableEntrySchema) => {
    const body = {
      ...value,
      teacherCodes: value.teacherCodes
        ? value.teacherCodes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };
    await updateEntry.mutateAsync({ id: entry.id, body });
    setShowEdit(false);
  };

  const onDeleteConfirm = async () => {
    await deleteEntry.mutateAsync(entry.id);
    setShowDelete(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              form.reset();
              setShowEdit(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit Time/Room
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" /> Delete Class
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2 py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Controller
                  control={form.control}
                  name="startTime"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Start Time</FieldLabel>
                      <Input {...field} type="time" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="endTime"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>End Time</FieldLabel>
                      <Input {...field} type="time" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="dayOfWeek"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Day of Week</FieldLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val, 10))}
                      defaultValue={field.value?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((d: string, i: number) => (
                          <SelectItem key={i} value={i.toString()}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="subjectId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Subject</FieldLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full overflow-hidden [&>span]:w-full [&>span]:text-left">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-w-100">
                        {subjects?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="truncate pr-4" title={`${s.code} (${s.name})`}>
                              <span className="font-medium">{s.code}</span> ({s.name})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="roomId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Room</FieldLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms?.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="type"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Class Type</FieldLabel>
                    <Input {...field} placeholder="Lecture, Lab, etc" />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="teacherCodes"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Teacher Codes</FieldLabel>
                    <TeacherInput {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {entry.subject?.code} class from the timetable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteEntry.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TimetableRoute() {
  const { data: entries, isLoading } = useTimetableEntries();
  const { data: programs } = useProgramSemesters();
  const { data: years } = useAcademicYears();
  const { data: subjects } = useSubjects();
  const { data: rooms } = useRooms();
  const { data: divisions } = useDivisions();
  const { data: teachersData } = useUsers({ role: "teacher", limit: 500 });

  const teachersMap = useMemo(() => {
    const map = new Map();
    if (teachersData?.users) {
      teachersData.users.forEach((t: any) => map.set(t.teacherProfile?.code || t.id, t.name));
    }
    return map;
  }, [teachersData]);

  const createEntry = useCreateTimetableEntry();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm<CreateTimetableEntrySchema>({
    resolver: zodResolver(createTimetableEntrySchema),
    defaultValues: {
      programSemesterId: "",
      academicYearId: "",
      divisionId: "",
      subjectId: "",
      roomId: "",
      dayOfWeek: 0,
      startTime: "",
      endTime: "",
      type: "",
      teacherCodes: "",
    },
  });

  const onSubmit = async (value: CreateTimetableEntrySchema) => {
    const body = {
      ...value,
      teacherCodes: value.teacherCodes
        ? value.teacherCodes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      divisionIds: [value.divisionId], // simplified for UI form
    };
    await createEntry.mutateAsync(body);
    form.reset();
    setIsAddOpen(false);
  };

  // Extract unique sorted time slots
  const timeSlots = useMemo(() => {
    if (!entries) return [];
    const slots = new Set<string>();
    entries.forEach((e) => slots.add(`${e.startTime}-${e.endTime}`));
    return Array.from(slots).sort((a, b) => {
      const [startA] = a.split("-");
      const [startB] = b.split("-");
      return startA.localeCompare(startB);
    });
  }, [entries]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Timetable Overview</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Schedule New Class</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-3 gap-x-6 gap-y-4 py-4">
                <Controller
                  control={form.control}
                  name="programSemesterId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Program Semester</FieldLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {programs?.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.program.code} - Sem {p.semester}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="academicYearId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Academic Year</FieldLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years?.map((y: any) => (
                            <SelectItem key={y.id} value={y.id}>
                              {y.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="divisionId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Division</FieldLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions?.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} ({d.programSemester.program.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="subjectId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Subject</FieldLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full overflow-hidden [&>span]:w-full [&>span]:text-left">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-100">
                          {subjects?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="truncate pr-4" title={`${s.code} (${s.name})`}>
                                <span className="font-medium">{s.code}</span> ({s.name})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="roomId"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Room</FieldLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms?.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Day of Week</FieldLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        defaultValue={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((d: string, i: number) => (
                            <SelectItem key={i} value={i.toString()}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="startTime"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Start Time</FieldLabel>
                      <Input {...field} type="time" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="endTime"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>End Time</FieldLabel>
                      <Input {...field} type="time" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Class Type</FieldLabel>
                      <Input {...field} placeholder="Lecture" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="teacherCodes"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Teacher Codes</FieldLabel>
                      <TeacherInput {...field} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Schedule Class
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-20 lg:w-28 font-semibold">Time</TableHead>
                  {DAYS.map((day) => (
                    <TableHead key={day} className="text-center font-semibold border-l w-[12.5%]">
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.map((slot) => {
                  const [startTime, endTime] = slot.split("-");
                  return (
                    <TableRow key={slot}>
                      <TableCell className="font-medium whitespace-nowrap align-top pt-4">
                        <div className="text-sm">{formatTime(startTime)}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          to {formatTime(endTime)}
                        </div>
                      </TableCell>
                      {DAYS.map((day, dayIndex) => {
                        const cellEntries =
                          entries?.filter(
                            (e) =>
                              e.dayOfWeek === dayIndex &&
                              e.startTime === startTime &&
                              e.endTime === endTime,
                          ) || [];

                        return (
                          <TableCell key={day} className="align-top border-l p-1 bg-muted/10">
                            <div className="flex flex-col gap-1.5 h-full min-h-15">
                              {cellEntries.map((entry) => (
                                <Card
                                  key={entry.id}
                                  className="p-2 border shadow-sm relative group overflow-hidden bg-background"
                                >
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-md shadow-sm z-10">
                                    <TimetableEntryActions
                                      entry={entry}
                                      days={DAYS}
                                      programs={programs}
                                      years={years}
                                      subjects={subjects}
                                      rooms={rooms}
                                      divisions={divisions}
                                    />
                                  </div>
                                  <div className="text-xs font-semibold text-primary pr-6">
                                    {entry.subject?.code}
                                  </div>
                                  <div
                                    className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2"
                                    title={entry.subject?.name}
                                  >
                                    {entry.subject?.name}
                                  </div>
                                  <div className="flex flex-col gap-1 mt-1.5">
                                    {entry.teacherCodes && entry.teacherCodes.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-[10px] leading-tight text-muted-foreground truncate">
                                        <UserIcon className="w-3 h-3 shrink-0" />
                                        <span className="truncate">
                                          {entry.teacherCodes
                                            .map((code: string) => teachersMap.get(code) || code)
                                            .join(", ")}
                                        </span>
                                      </div>
                                    )}
                                    {entry.divisions && entry.divisions.length > 0 && (
                                      <div
                                        className="flex items-center gap-1.5 text-[10px] leading-tight text-muted-foreground truncate"
                                        title={entry.divisions
                                          .map(
                                            (d: any) =>
                                              `${d.division?.programSemester?.program?.code} - ${d.division?.name}`,
                                          )
                                          .join(", ")}
                                      >
                                        <IconLocation className="w-3 h-3 shrink-0" />
                                        <span className="truncate">
                                          {entry.divisions
                                            .map(
                                              (d: any) =>
                                                `${d.division?.programSemester?.program?.code} - ${d.division?.name}`,
                                            )
                                            .join(", ")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center mt-2 pt-1 border-t">
                                    <Badge variant="outline" className="text-[9px] px-1 h-4">
                                      {entry.type || "Class"}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {entry.room?.name}
                                    </span>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {timeSlots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No classes scheduled.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
