import { useState } from "react";
import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDeviceMobile,
  IconDeviceMobileCheck,
  IconFingerprint,
  IconFlame,
  IconKey,
  IconLock,
  IconMapPin,
  IconRefresh,
  IconSchool,
  IconShield,
  IconShieldCheck,
  IconAlertTriangle,
  IconUser,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminChangePassword,
  useRebindDevice,
  useStudentDetail,
  useSuspendUser,
  useUpdateUser,
} from "@/hooks/api/use-admin-users";
import { cn } from "@/lib/utils";

interface StudentDetailSheetProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentDetailSheet({
  studentId,
  open,
  onOpenChange,
}: StudentDetailSheetProps) {
  const { data, isLoading, isError } = useStudentDetail(studentId ?? "");

  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "security">(
    "overview",
  );
  const [newPassword, setNewPassword] = useState("");
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(true);
  const [passwordError, setPasswordError] = useState("");

  const changePassword = useAdminChangePassword();
  const rebindDevice = useRebindDevice();
  const suspendUser = useSuspendUser();
  const updateUser = useUpdateUser();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    if (!studentId) return;

    setPasswordError("");
    changePassword.mutate(
      {
        id: studentId,
        body: { newPassword, requiresPasswordChange },
      },
      {
        onSuccess: () => {
          setNewPassword("");
        },
      },
    );
  };

  const handleToggleStatus = () => {
    if (!data?.user?.id) return;
    const currentStatus = data.profile?.status;
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    updateUser.mutate({
      id: data.user.id,
      body: { status: nextStatus },
    });
  };

  const handleResetDevice = () => {
    if (!data?.user?.id) return;
    rebindDevice.mutate(data.user.id);
  };

  const user = data?.user;
  const profile = data?.profile;
  const stats = data?.stats;
  const recentAttendances = data?.recentAttendances ?? [];

  const overallPercentage = stats?.overallPercentage ?? 0;
  const missedCount = Math.max(0, (stats?.totalConducted ?? 0) - (stats?.totalAttended ?? 0));

  const getAttendanceBadge = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (pct >= 70) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "suspended":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col gap-0 border-l border-border bg-background shadow-2xl overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-full mt-4" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !user ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <IconAlertCircle className="size-6" />
            </div>
            <h3 className="font-semibold text-foreground">Failed to load student details</h3>
            <p className="text-xs text-muted-foreground">
              The student profile may have been removed or an error occurred.
            </p>
          </div>
        ) : (
          <>
            {/* Sheet Header */}
            <div className="p-6 border-b border-border/70 bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Avatar className="size-14 border border-border shadow-xs">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight text-foreground">
                        {user.name}
                      </h2>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide",
                          getStatusBadgeVariant(profile?.status),
                        )}
                      >
                        {profile?.status || "active"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">{user.email}</p>

                    <div className="flex items-center gap-2 pt-0.5">
                      {profile?.enrollmentNo && (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted border border-border/70 text-foreground">
                          {profile.enrollmentNo}
                        </span>
                      )}
                      {profile?.division?.name && (
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <IconSchool className="size-3.5" />
                          {profile.division.programSemester?.program?.shortName ||
                            profile.programCode}{" "}
                          • Sem {profile.division.programSemester?.semester} •{" "}
                          {profile.division.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(val) =>
                  setActiveTab(val as "overview" | "attendance" | "security")
                }
                className="mt-6 w-full"
              >
                <TabsList className="grid grid-cols-3 w-full h-9">
                  <TabsTrigger value="overview" className="text-xs font-medium gap-1.5">
                    <IconUser className="size-3.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="text-xs font-medium gap-1.5">
                    <IconShieldCheck className="size-3.5" />
                    Attendance ({overallPercentage}%)
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs font-medium gap-1.5">
                    <IconLock className="size-3.5" />
                    Security
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Scrollable Tab Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW & ACADEMIC DETAILS */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* Academic Profile Card */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/15">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <IconSchool className="size-4 text-primary" />
                        Academic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Program</span>
                        <span className="font-semibold text-foreground">
                          {profile?.division?.programSemester?.program?.name ??
                            profile?.programCode ??
                            "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Semester</span>
                        <span className="font-semibold text-foreground">
                          {profile?.division?.programSemester?.semester
                            ? `Semester ${profile.division.programSemester.semester}`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Division</span>
                        <span className="font-semibold text-foreground">
                          {profile?.division?.name ?? "Unassigned"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Roll Number</span>
                        <span className="font-semibold text-foreground">
                          {profile?.rollNumber ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Academic Year</span>
                        <span className="font-semibold text-foreground">
                          {profile?.division?.programSemester?.academicYear?.name ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Admission Year</span>
                        <span className="font-semibold text-foreground">
                          {profile?.admissionYear ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Joined On</span>
                        <span className="font-medium text-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Account ID</span>
                        <span className="font-mono text-[10px] text-muted-foreground truncate block">
                          {user.id}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hardware Device Binding Card */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/15">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <IconDeviceMobile className="size-4 text-blue-500" />
                          Hardware Device Binding
                        </CardTitle>
                        <Badge
                          variant={profile?.deviceBound ? "default" : "outline"}
                          className={cn(
                            "text-[10px] uppercase font-bold",
                            profile?.deviceBound
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : "text-amber-500 border-amber-500/30",
                          )}
                        >
                          {profile?.deviceBound ? "Device Bound" : "Unbound"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 text-xs">
                      {profile?.deviceBound ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Device Model</span>
                              <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                <IconDeviceMobileCheck className="size-3.5 text-emerald-500" />
                                {profile.deviceModel || "Unknown Device"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Operating System</span>
                              <span className="font-medium text-foreground mt-0.5 block">
                                {profile.deviceOs || "Mobile Client"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Biometrics Supported</span>
                              <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                                <IconFingerprint className="size-3.5 text-blue-500" />
                                {profile.biometricEnabled ? "Enabled (Fingerprint / Face)" : "Disabled"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Bound Timestamp</span>
                              <span className="font-medium text-foreground mt-0.5 block">
                                {profile.deviceBoundAt
                                  ? new Date(profile.deviceBoundAt).toLocaleString()
                                  : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <span className="text-muted-foreground block text-[11px]">Hardware Fingerprint ID</span>
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted p-1.5 rounded border border-border block truncate">
                              {profile.deviceId}
                            </span>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetDevice}
                              disabled={rebindDevice.isPending}
                              className="gap-1.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                            >
                              <IconRefresh className="size-3.5" />
                              {rebindDevice.isPending ? "Resetting..." : "Reset Device Binding"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center space-y-2">
                          <IconDeviceMobile className="size-8 text-muted-foreground/50 mx-auto" />
                          <p className="font-medium text-foreground">No hardware device bound yet</p>
                          <p className="text-muted-foreground text-[11px] max-w-sm mx-auto">
                            The student has not yet completed initial mobile device binding. Once they
                            log into the mobile app, their hardware fingerprint will register here and
                            their status will automatically activate.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 2: ATTENDANCE SCORES & ANALYTICS */}
              {activeTab === "attendance" && (
                <div className="space-y-5">
                  {/* Hero Overall Attendance Gauge Card */}
                  <Card className="border-border/70 overflow-hidden">
                    <div className="p-5 bg-gradient-to-br from-card to-muted/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Overall Attendance Score
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black tracking-tight text-foreground">
                              {overallPercentage}%
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold border",
                                getAttendanceBadge(overallPercentage),
                              )}
                            >
                              {overallPercentage >= 80
                                ? "Eligible"
                                : overallPercentage >= 70
                                  ? "Warning"
                                  : "Critical / Defaulter"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {stats?.totalAttended ?? 0} out of {stats?.totalConducted ?? 0} conducted
                            classes attended
                          </p>
                        </div>

                        {/* Current Streak Indicator */}
                        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 p-3 shadow-xs">
                          <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                            <IconFlame className="size-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-muted-foreground block">
                              Active Streak
                            </span>
                            <span className="text-base font-bold text-foreground">
                              {stats?.streak ?? 0} classes
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Linear Meter */}
                      <div className="mt-4 space-y-1.5">
                        <Progress value={overallPercentage} className="h-2.5 bg-muted" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0%</span>
                          <span>70% Minimum Threshold</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat Breakdown Counters */}
                    <div className="grid grid-cols-3 border-t border-border/70 divide-x divide-border/70 bg-card text-center py-3">
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block">
                          Conducted
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {stats?.totalConducted ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
                          Attended
                        </span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {stats?.totalAttended ?? 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">
                          Missed
                        </span>
                        <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                          {missedCount}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Subject Breakdown */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/15">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Subject-Wise Attendance Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(stats?.bySubject ?? []).length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          No closed class sessions recorded for this student&apos;s division yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {stats?.bySubject.map((sub) => (
                            <div key={sub.subjectId} className="p-3.5 flex flex-col gap-2">
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-semibold text-foreground">
                                    {sub.subjectName}
                                  </span>
                                  <span className="text-muted-foreground ml-2 font-mono text-[10px]">
                                    {sub.subjectCode}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-[11px]">
                                    {sub.attended}/{sub.conducted}
                                  </span>
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[11px] font-bold border",
                                      getAttendanceBadge(sub.percentage),
                                    )}
                                  >
                                    {sub.percentage}%
                                  </span>
                                </div>
                              </div>
                              <Progress value={sub.percentage} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Attendance Scans */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/15">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <IconClock className="size-4 text-primary" />
                        Recent Attendance Scan Records
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {recentAttendances.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          No recent attendance scans found.
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                          {recentAttendances.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-3 text-xs flex items-center justify-between hover:bg-muted/30 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="font-medium text-foreground flex items-center gap-2">
                                  <span>{rec.subjectName}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({rec.teacherName})
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                  <span className="flex items-center gap-1">
                                    <IconCalendar className="size-3" />
                                    {new Date(rec.timestamp).toLocaleString()}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <IconMapPin className="size-3" />
                                    {rec.roomName} ({rec.buildingName})
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {rec.gpsWithinGeofence ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"
                                  >
                                    <IconCheck className="size-3" />
                                    Verified GPS
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1"
                                  >
                                    <IconAlertTriangle className="size-3" />
                                    Outside Geofence
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 3: CREDENTIALS & SECURITY */}
              {activeTab === "security" && (
                <div className="space-y-5">
                  {/* Admin Change Password Card */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/15">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <IconKey className="size-4 text-primary" />
                        Admin Password Override
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <Field>
                          <FieldLabel className="text-xs font-semibold">New Password</FieldLabel>
                          <PasswordInput
                            placeholder="Enter new student password (min 8 chars)"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              if (passwordError) setPasswordError("");
                            }}
                            disabled={changePassword.isPending}
                          />
                          {passwordError && (
                            <p className="text-xs text-destructive mt-1 font-medium">{passwordError}</p>
                          )}
                        </Field>

                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <Checkbox
                              checked={requiresPasswordChange}
                              onCheckedChange={(checked) =>
                                setRequiresPasswordChange(Boolean(checked))
                              }
                              disabled={changePassword.isPending}
                              className="mt-0.5"
                            />
                            <div className="text-xs space-y-0.5">
                              <span className="font-medium text-foreground">
                                Require password change on next student login
                              </span>
                              <p className="text-muted-foreground text-[11px] leading-relaxed">
                                The student will be prompted to set a new password upon logging into the
                                mobile application.
                              </p>
                            </div>
                          </label>
                        </div>

                        <Button
                          type="submit"
                          disabled={changePassword.isPending}
                          className="gap-2 w-full sm:w-auto"
                        >
                          <IconLock className="size-3.5" />
                          {changePassword.isPending ? "Updating Password..." : "Update Password"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Account Status Control Card */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/15">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <IconShield className="size-4 text-foreground" />
                        Account Status & Access
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground block">
                            Student Status:{" "}
                            <span
                              className={cn(
                                "font-bold uppercase",
                                profile?.status === "suspended"
                                  ? "text-rose-600"
                                  : "text-emerald-600",
                              )}
                            >
                              {profile?.status}
                            </span>
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {profile?.status === "suspended"
                              ? "Student is suspended and cannot log in or scan QR attendance codes."
                              : "Student is authorized to scan QR attendance codes and sign in."}
                          </span>
                        </div>
                        <Button
                          variant={profile?.status === "suspended" ? "default" : "destructive"}
                          size="sm"
                          onClick={handleToggleStatus}
                          disabled={updateUser.isPending}
                          className="gap-1.5 text-xs font-medium shrink-0"
                        >
                          {profile?.status === "suspended" ? (
                            <>
                              <IconUserCheck className="size-3.5" />
                              Reactivate Student
                            </>
                          ) : (
                            <>
                              <IconUserX className="size-3.5" />
                              Suspend Student
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
