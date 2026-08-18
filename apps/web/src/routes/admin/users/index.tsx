import { IconUpload } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { UserTable } from "@/features/admin/users/components/user-table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage students, teachers, and administrators
          </p>
        </div>
        <Link
          to="/admin/users/import"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <IconUpload className="h-4 w-4" />
          Bulk Import
        </Link>
      </div>

      <UserTable />
    </div>
  );
}
