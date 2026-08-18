import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import {
  IconDeviceDesktop,
  IconDeviceDesktopOff,
  IconDots,
  IconLock,
  IconPencil,
  IconRefresh,
} from "@tabler/icons-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DeviceRebindDialog } from "./device-rebind-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { SuspendUserAlert } from "./suspend-user-alert";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
  image?: string | null;
  studentProfile?: {
    enrollmentNo: string;
    status: string;
    deviceBound: boolean;
    deviceModel?: string | null;
    programCode: string;
  } | null;
  teacherProfile?: {
    code: string;
    department?: string | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case "super_admin":
      return "destructive";
    case "admin":
      return "default";
    case "teacher":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "suspended":
      return "destructive";
    default:
      return "secondary";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Action Cell ─────────────────────────────────────────────────────────────

function ActionCell({ user }: { user: UserRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [rebindOpen, setRebindOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "aria-expanded:bg-accent")}
          aria-label="User actions"
        >
          <IconDots className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <IconPencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {user.role === "student" && (
            <DropdownMenuItem onClick={() => setRebindOpen(true)}>
              {user.studentProfile?.deviceBound ? (
                <IconRefresh className="mr-2 h-4 w-4" />
              ) : (
                <IconDeviceDesktopOff className="mr-2 h-4 w-4" />
              )}
              {user.studentProfile?.deviceBound ? "Rebind Device" : "No Device Bound"}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSuspendOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <IconLock className="mr-2 h-4 w-4" />
            Suspend
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
      <SuspendUserAlert userId={user.id} userName={user.name} open={suspendOpen} onOpenChange={setSuspendOpen} />
      <DeviceRebindDialog userId={user.id} userName={user.name} open={rebindOpen} onOpenChange={setRebindOpen} />
    </>
  );
}

// ─── Column Definitions ───────────────────────────────────────────────────────

export const userColumns: LegacyColumnDef<UserRow>[] = [
  {
    id: "user",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant={getRoleBadgeVariant(row.original.role)}>
        {row.original.role.replace("_", " ")}
      </Badge>
    ),
  },
  {
    id: "identifier",
    header: "ID / Code",
    cell: ({ row }) => {
      const user = row.original;
      if (user.studentProfile) {
        return (
          <span className="text-muted-foreground font-mono text-xs">
            {user.studentProfile.enrollmentNo}
          </span>
        );
      }
      if (user.teacherProfile) {
        return (
          <span className="text-muted-foreground font-mono text-xs">
            {user.teacherProfile.code}
          </span>
        );
      }
      return <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const user = row.original;
      const status = user.studentProfile?.status ?? "active";
      return (
        <Badge variant={getStatusBadgeVariant(status)}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "device",
    header: "Device",
    cell: ({ row }) => {
      const user = row.original;
      if (user.role !== "student") {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      return user.studentProfile?.deviceBound ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500">
          <IconDeviceDesktop className="h-3.5 w-3.5" />
          <span>{user.studentProfile.deviceModel ?? "Bound"}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconDeviceDesktopOff className="h-3.5 w-3.5" />
          <span>Unbound</span>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.original.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionCell user={row.original} />,
  },
];
