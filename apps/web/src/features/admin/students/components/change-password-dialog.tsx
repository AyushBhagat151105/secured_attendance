import { useState } from "react";
import { IconKey, IconLock } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useAdminChangePassword } from "@/hooks/api/use-admin-users";

interface ChangePasswordDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  userId,
  userName,
  userEmail,
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(true);
  const [error, setError] = useState("");

  const changePassword = useAdminChangePassword();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNewPassword("");
      setError("");
      setRequiresPasswordChange(true);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setError("");
    changePassword.mutate(
      {
        id: userId,
        body: {
          newPassword,
          requiresPasswordChange,
        },
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <IconKey className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Update credentials for {userName} ({userEmail})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Field>
              <FieldLabel className="text-xs font-semibold">New Password</FieldLabel>
              <PasswordInput
                placeholder="Enter new secure password (min 8 chars)"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={changePassword.isPending}
                autoFocus
              />
              {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}
            </Field>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={requiresPasswordChange}
                  onCheckedChange={(checked) => setRequiresPasswordChange(Boolean(checked))}
                  disabled={changePassword.isPending}
                  className="mt-0.5"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-medium text-foreground">
                    Require password change on next login
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    The student will be forced to change this temporary password upon logging into the
                    mobile app.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={changePassword.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={changePassword.isPending} className="gap-2">
              <IconLock className="h-4 w-4" />
              {changePassword.isPending ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
