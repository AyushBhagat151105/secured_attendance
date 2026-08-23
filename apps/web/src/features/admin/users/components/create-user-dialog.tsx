import { IconUserPlus } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser } from "@/hooks/api/use-admin-users";
import { useDivisions } from "@/hooks/api/use-admin-academic";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Enter a valid email"),
  role: z.enum(["student", "teacher", "admin"]),
  
  // Student fields
  enrollmentNo: z.string(),
  programCode: z.string(),
  semester: z.string(),
  divisionId: z.string(),
  
  // Teacher fields
  teacherCode: z.string(),
  department: z.string(),
}).superRefine((data, ctx) => {
  if (data.role === "student") {
    if (!data.enrollmentNo) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for student", path: ["enrollmentNo"] });
    if (!data.programCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for student", path: ["programCode"] });
    if (!data.semester) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for student", path: ["semester"] });
    if (!data.divisionId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for student", path: ["divisionId"] });
  }
  if (data.role === "teacher") {
    if (!data.teacherCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for teacher", path: ["teacherCode"] });
    if (!data.department) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required for teacher", path: ["department"] });
  }
});

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const create = useCreateUser();
  const { data: divisions } = useDivisions();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      role: "student" as "student" | "teacher" | "admin",
      enrollmentNo: "",
      programCode: "",
      semester: "",
      divisionId: "",
      teacherCode: "",
      department: "",
    },
    validators: {
      onSubmit: createSchema,
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync(value);
      form.reset();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) form.reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2">
              <IconUserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to the system.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="role">
            {(field) => (
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as "student" | "teacher" | "admin")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="name">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Full Name</Label>
                  <Input
                    id={field.name}
                    placeholder="Ayush Bhagat"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((err) => (
                    <p key={err?.toString()} className="text-destructive text-xs">
                      {err?.toString()}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    type="email"
                    placeholder="user@charusat.edu.in"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((err) => (
                    <p key={err?.toString()} className="text-destructive text-xs">
                      {err?.toString()}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.role}>
            {(role) => (
              <>
                {role === "student" && (
                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="enrollmentNo">
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name}>Enrollment No</Label>
                          <Input
                            id={field.name}
                            placeholder="e.g. 26msit005"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p key={err?.message} className="text-destructive text-xs">
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                    <form.Field name="programCode">
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name}>Program Code</Label>
                          <Input
                            id={field.name}
                            placeholder="e.g. mca"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p key={err?.message} className="text-destructive text-xs">
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                    <form.Field name="semester">
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name}>Semester</Label>
                          <Input
                            id={field.name}
                            type="number"
                            min="1"
                            max="10"
                            placeholder="e.g. 1"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p key={err?.message} className="text-destructive text-xs">
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                    <form.Field name="divisionId">
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name}>Division</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={field.handleChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                            <SelectContent>
                              {divisions?.map((div: any) => (
                                <SelectItem key={div.id} value={div.id}>
                                  {div.programSemester?.program?.code?.toUpperCase() ?? "DIV"} - Sem {div.programSemester?.semester ?? "?"} - Div {div.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.state.meta.errors.map((err) => (
                            <p key={err?.message} className="text-destructive text-xs">
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}

                {role === "teacher" && (
                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="teacherCode">
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name}>Teacher Code</Label>
                          <Input
                            id={field.name}
                            placeholder="e.g. HMP"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p key={err?.message} className="text-destructive text-xs">
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                    <form.Field name="department">
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name}>Department</Label>
                          <Input
                            id={field.name}
                            placeholder="e.g. Computer Science"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          {field.state.meta.errors.map((err) => (
                            <p key={err?.message} className="text-destructive text-xs">
                              {err?.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
              </>
            )}
          </form.Subscribe>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                  {state.isSubmitting ? "Creating..." : "Create User"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
