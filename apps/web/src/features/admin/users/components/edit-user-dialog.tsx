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
import { useUpdateUser } from "@/hooks/use-admin-users";
import type { UserRow } from "./user-columns";

interface EditUserDialogProps {
  user: UserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const editSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["student", "teacher", "admin", "super_admin"]),
  status: z.enum(["active", "suspended", "pending"]),
});

type EditUserForm = z.infer<typeof editSchema>;

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const update = useUpdateUser();

  const form = useForm({
    defaultValues: {
      name: user.name,
      role: user.role as EditUserForm["role"],
      status: (user.studentProfile?.status ?? "active") as EditUserForm["status"],
    },
    validators: {
      onSubmit: editSchema,
    },
    onSubmit: async ({ value }) => {
      await update.mutate({ id: user.id, body: {
        name: value.name,
        role: value.role,
        status: user.role === "student" ? value.status : undefined,
      }});
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information and permissions.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Full Name</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((err) => (
                  <p key={String(err)} className="text-destructive text-xs">
                    {String(err)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(
                      v as "student" | "teacher" | "admin" | "super_admin",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {user.role === "student" && (
            <form.Field name="status">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as "active" | "suspended" | "pending")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                  {state.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
