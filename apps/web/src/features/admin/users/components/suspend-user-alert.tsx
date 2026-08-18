import { IconAlertTriangle } from "@tabler/icons-react";

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
import { useSuspendUserMutation } from "@/features/admin/users/queries/users.queries";

interface SuspendUserAlertProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendUserAlert({
  userId,
  userName,
  open,
  onOpenChange,
}: SuspendUserAlertProps) {
  const suspend = useSuspendUserMutation();

  function handleConfirm() {
    suspend.mutate(userId, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <IconAlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Suspend {userName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This will prevent the user from logging in and marking attendance. Their data will be
            preserved. You can reactivate the account from the user detail page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={suspend.isPending}
          >
            {suspend.isPending ? "Suspending..." : "Suspend User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
