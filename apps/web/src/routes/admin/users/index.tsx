import { IconUpload, IconUsers } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin";
import { UserTable } from "@/features/admin/users/components/user-table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="Users"
        subtitle="Manage students, teachers, and administrators across the institution."
        icon={<IconUsers className="size-6 text-primary" />}
        actions={
          <Link
            to="/admin/users/import"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-1.5 text-xs sm:text-sm h-9 w-full sm:w-auto shrink-0 justify-center",
            )}
          >
            <IconUpload className="size-4" />
            Bulk Import
          </Link>
        }
      />

      <UserTable />
    </div>
  );
}
