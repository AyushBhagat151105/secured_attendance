import {
  IconArrowLeft,
  IconCalendar,
  IconDeviceDesktop,
  IconDeviceDesktopOff,
  IconMail,
  IconRefresh,
  IconShield,
  IconUser,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceRebindDialog } from "@/features/admin/users/components/device-rebind-dialog";
import { EditUserDialog } from "@/features/admin/users/components/edit-user-dialog";
import { useUser } from "@/hooks/use-admin-users";
import type { UserRow } from "@/features/admin/users/components/user-columns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user, isLoading } = useUser(userId);
  const [editOpen, setEditOpen] = useState(false);
  const [rebindOpen, setRebindOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 col-span-2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">User not found.</p>
        <Link to="/admin/users" className={cn(buttonVariants({ variant: "outline" }))}>Back to Users</Link>
      </div>
    );
  }

  const typedUser = user as UserRow;

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/users"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <IconArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">User Detail</h1>
      </div>

      {/* Profile card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={typedUser.image ?? undefined} />
                <AvatarFallback className="text-lg">{getInitials(typedUser.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">{typedUser.name}</h2>
                <p className="text-muted-foreground text-sm">{typedUser.email}</p>
              </div>
              <Badge>{typedUser.role.replace("_", " ")}</Badge>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditOpen(true)}
                >
                  Edit User
                </Button>
                {typedUser.role === "student" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setRebindOpen(true)}
                  >
                    <IconRefresh className="h-3.5 w-3.5" />
                    Reset Device
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail tabs */}
        <Card className="md:col-span-2">
          <Tabs defaultValue="profile">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="profile">
                  <IconUser className="mr-1.5 h-3.5 w-3.5" />
                  Profile
                </TabsTrigger>
                {typedUser.role === "student" && (
                  <TabsTrigger value="device">
                    <IconDeviceDesktop className="mr-1.5 h-3.5 w-3.5" />
                    Device
                  </TabsTrigger>
                )}
              </TabsList>
            </CardHeader>

            <TabsContent value="profile" className="mt-0">
              <CardContent className="space-y-3">
                <InfoRow icon={IconMail} label="Email" value={typedUser.email} />
                <InfoRow
                  icon={IconShield}
                  label="Role"
                  value={typedUser.role.replace("_", " ")}
                />
                <InfoRow
                  icon={IconCalendar}
                  label="Joined"
                  value={new Date(typedUser.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                {typedUser.studentProfile && (
                  <>
                    <Separator />
                    <CardDescription className="text-xs font-medium uppercase tracking-wide">
                      Student Details
                    </CardDescription>
                    <InfoRow
                      icon={IconUser}
                      label="Enrollment No"
                      value={typedUser.studentProfile.enrollmentNo}
                      mono
                    />
                    <InfoRow
                      icon={IconUser}
                      label="Program"
                      value={typedUser.studentProfile.programCode.toUpperCase()}
                    />
                    <InfoRow
                      icon={IconShield}
                      label="Status"
                      value={typedUser.studentProfile.status}
                    />
                  </>
                )}
                {typedUser.teacherProfile && (
                  <>
                    <Separator />
                    <CardDescription className="text-xs font-medium uppercase tracking-wide">
                      Teacher Details
                    </CardDescription>
                    <InfoRow
                      icon={IconUser}
                      label="Code"
                      value={typedUser.teacherProfile.code}
                      mono
                    />
                    {typedUser.teacherProfile.department && (
                      <InfoRow
                        icon={IconUser}
                        label="Department"
                        value={typedUser.teacherProfile.department}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </TabsContent>

            {typedUser.role === "student" && (
              <TabsContent value="device" className="mt-0">
                <CardContent className="space-y-4">
                  {typedUser.studentProfile?.deviceBound ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <IconDeviceDesktop className="h-5 w-5" />
                        <span className="font-medium">Device Bound</span>
                      </div>
                      <InfoRow
                        icon={IconDeviceDesktop}
                        label="Model"
                        value={typedUser.studentProfile.deviceModel ?? "Unknown"}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                      <IconDeviceDesktopOff className="h-10 w-10" />
                      <div>
                        <p className="font-medium">No device bound</p>
                        <p className="text-xs mt-0.5">
                          Student will be prompted to bind a device on next login.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            )}
          </Tabs>
        </Card>
      </div>

      <EditUserDialog user={typedUser} open={editOpen} onOpenChange={setEditOpen} />
      <DeviceRebindDialog
        userId={typedUser.id}
        userName={typedUser.name}
        open={rebindOpen}
        onOpenChange={setRebindOpen}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground text-sm w-28 shrink-0">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
