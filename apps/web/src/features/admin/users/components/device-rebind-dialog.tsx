import { IconRefresh, IconShieldOff } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRebindDevice } from "@/hooks/use-admin-users";

interface DeviceRebindDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceRebindDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: DeviceRebindDialogProps) {
  const rebind = useRebindDevice();

  function handleConfirm() {
    rebind.mutate(userId, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-amber-500/10 p-2">
              <IconShieldOff className="h-5 w-5 text-amber-500" />
            </div>
            <DialogTitle>Reset Device Binding</DialogTitle>
          </div>
          <DialogDescription>
            This will clear <strong>{userName}</strong>&apos;s device registration. They will be
            required to bind a new device on their next login before they can mark attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-400">
          Use this when a student has lost their phone, switched devices, or needs to
          re-register. The student will be prompted to complete device binding on next login.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={rebind.isPending}
            className="gap-2"
          >
            <IconRefresh className="h-4 w-4" />
            {rebind.isPending ? "Resetting..." : "Reset Device Binding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
