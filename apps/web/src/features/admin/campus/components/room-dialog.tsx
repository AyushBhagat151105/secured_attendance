import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createRoomSchema,
  updateRoomSchema,
} from "@secured_attendance/validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: any;
  buildings: any[] | undefined;
  onSubmit: (data: any) => Promise<void>;
}

export function RoomDialog({
  open,
  onOpenChange,
  room,
  buildings,
  onSubmit,
}: RoomDialogProps) {
  const isEditing = !!room;

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? updateRoomSchema : createRoomSchema),
    defaultValues: {
      name: "",
      type: "classroom",
      buildingId: "",
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({
        name: room.name,
        type: room.type,
        buildingId: room.buildingId,
      });
    } else {
      form.reset({
        name: "",
        type: "classroom",
        buildingId: "",
      });
    }
  }, [room, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Room" : "Add New Room"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update room details and building assignment."
                : "Create a room and assign it to a campus building."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Room Name / No</FieldLabel>
                  <Input {...field} placeholder="101" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Type</FieldLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classroom">Classroom</SelectItem>
                      <SelectItem value="lab">Laboratory</SelectItem>
                      <SelectItem value="hall">Seminar Hall</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="buildingId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Building</FieldLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner className="mr-2" />}
              {isEditing ? "Save Changes" : "Save Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
