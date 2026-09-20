import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IconDeviceMobile,
  IconCheck,
  IconX,
  IconRefresh,
  IconSearch,
  IconAlertTriangle,
  IconShieldLock,
  IconArrowRight,
  IconRotate,
  IconDeviceMobileCheck,
  IconDeviceMobileOff,
} from "@tabler/icons-react";

import {
  useRebindRequests,
  useApproveRebindRequest,
  useRejectRebindRequest,
  useDeviceInventory,
  useResetStudentDevice,
  useBatchRebind,
} from "@/hooks/api/use-admin-devices";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/devices/")({
  component: DevicesPage,
});

function DevicesPage() {
  const [activeTab, setActiveTab] = useState<string>("requests");

  // Re-bind Requests State
  const [requestStatus, setRequestStatus] = useState<string>("PENDING");
  const [requestSearch, setRequestSearch] = useState<string>("");
  const {
    data: requestsData,
    isLoading: isRequestsLoading,
    refetch: refetchRequests,
    isFetching: isRequestsFetching,
  } = useRebindRequests({
    status: requestStatus,
    search: requestSearch,
    limit: 50,
  });

  const approveMutation = useApproveRebindRequest();
  const rejectMutation = useRejectRebindRequest();

  // Reject Dialog State
  const [rejectingRequest, setRejectingRequest] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState<string>("");

  // Inventory State
  const [inventoryStatus, setInventoryStatus] = useState<"all" | "bound" | "unbound">("all");
  const [inventorySearch, setInventorySearch] = useState<string>("");
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    refetch: refetchInventory,
    isFetching: isInventoryFetching,
  } = useDeviceInventory({
    boundStatus: inventoryStatus,
    search: inventorySearch,
    limit: 50,
  });

  const resetSingleMutation = useResetStudentDevice();
  const batchResetMutation = useBatchRebind();

  // Selection & Reset Dialog State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [resettingStudent, setResettingStudent] = useState<any>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState<boolean>(false);

  const pendingCount = requestsData?.counts?.pending ?? 0;
  const boundCount = inventoryData?.counts?.bound ?? 0;
  const unboundCount = inventoryData?.counts?.unbound ?? 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked && inventoryData?.items) {
      const boundIds = inventoryData.items
        .filter((item: any) => item.deviceBound)
        .map((item: any) => item.id);
      setSelectedStudentIds(boundIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((prev) => [...prev, id]);
    } else {
      setSelectedStudentIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const onConfirmReject = async () => {
    if (!rejectingRequest) return;
    await rejectMutation.mutateAsync({
      id: rejectingRequest.id,
      note: rejectNote,
    });
    setRejectingRequest(null);
    setRejectNote("");
  };

  const onConfirmSingleReset = async () => {
    if (!resettingStudent) return;
    await resetSingleMutation.mutateAsync(resettingStudent.id);
    setResettingStudent(null);
  };

  const onConfirmBatchReset = async () => {
    if (selectedStudentIds.length === 0) return;
    await batchResetMutation.mutateAsync(selectedStudentIds);
    setSelectedStudentIds([]);
    setShowBatchConfirm(false);
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <IconDeviceMobile className="h-6 w-6 text-primary" /> Device Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Audit hardware bindings, approve re-bind requests, and manage 1-device-per-student security.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Re-binds
            </CardTitle>
            <IconAlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Students awaiting device authorization
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bound Devices
            </CardTitle>
            <IconDeviceMobileCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boundCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active cryptographically locked phones
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unbound Students
            </CardTitle>
            <IconDeviceMobileOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unboundCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Profiles ready to pair on next login
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full sm:w-80 grid-cols-2">
          <TabsTrigger value="requests" className="relative">
            Re-bind Requests
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inventory">Device Inventory</TabsTrigger>
        </TabsList>

        {/* Tab 1: Re-bind Requests */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>Re-bind Requests</CardTitle>
                  <CardDescription>
                    Review incoming student hardware change requests and approve re-pairing.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-md border border-border/80 bg-muted/30 p-0.5">
                    {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setRequestStatus(s)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          requestStatus === s
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student..."
                      value={requestSearch}
                      onChange={(e) => setRequestSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => refetchRequests()}
                    disabled={isRequestsFetching}
                  >
                    <IconRefresh
                      className={`h-3.5 w-3.5 ${isRequestsFetching ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {isRequestsLoading ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto touch-pan-x">
                  <Table className="min-w-[700px] sm:min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Hardware Transition</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Requested Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestsData?.items?.map((req: any) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="font-semibold text-sm">
                              {req.studentProfile?.user?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {req.studentProfile?.enrollmentNo?.toUpperCase()} ·{" "}
                              {req.studentProfile?.division?.name || "No Division"}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-medium text-muted-foreground line-through">
                                {req.currentDeviceModel || "Previous Phone"}
                              </span>
                              <IconArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="font-bold text-foreground">
                                {req.requestedDeviceModel}
                              </span>
                            </div>
                            {req.requestedDeviceOs && (
                              <div className="text-[11px] text-muted-foreground">
                                {req.requestedDeviceOs}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="max-w-[200px]">
                            <p className="text-xs text-foreground truncate" title={req.reason}>
                              {req.reason}
                            </p>
                            {req.reviewNote && (
                              <p
                                className="text-[11px] text-destructive truncate mt-0.5"
                                title={req.reviewNote}
                              >
                                Note: {req.reviewNote}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(req.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>

                          <TableCell>
                            {req.status === "PENDING" ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Pending
                              </Badge>
                            ) : req.status === "APPROVED" ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                Rejected
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                                  onClick={() => approveMutation.mutate(req.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <IconCheck className="h-3.5 w-3.5" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-destructive hover:bg-destructive/10 border-destructive/30 gap-1 text-xs"
                                  onClick={() => {
                                    setRejectingRequest(req);
                                    setRejectNote("");
                                  }}
                                  disabled={rejectMutation.isPending}
                                >
                                  <IconX className="h-3.5 w-3.5" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      {(!requestsData?.items || requestsData.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                            No re-bind requests found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Device Inventory */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>Hardware Binding Inventory</CardTitle>
                  <CardDescription>
                    All enrolled student devices. Reset bindings to allow students to pair a fresh smartphone.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-md border border-border/80 bg-muted/30 p-0.5">
                    {(["all", "bound", "unbound"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setInventoryStatus(s)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          inventoryStatus === s
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student or device..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  {selectedStudentIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => setShowBatchConfirm(true)}
                    >
                      <IconRotate className="h-3.5 w-3.5" />
                      Reset Selected ({selectedStudentIds.length})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => refetchInventory()}
                    disabled={isInventoryFetching}
                  >
                    <IconRefresh
                      className={`h-3.5 w-3.5 ${isInventoryFetching ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {isInventoryLoading ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto touch-pan-x">
                  <Table className="min-w-[700px] sm:min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              selectedStudentIds.length > 0 &&
                              inventoryData?.items?.some((i: any) => i.deviceBound) &&
                              selectedStudentIds.length ===
                                inventoryData.items.filter((i: any) => i.deviceBound).length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Binding Status</TableHead>
                        <TableHead>Bound Device Model</TableHead>
                        <TableHead>Bound Since</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryData?.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              disabled={!item.deviceBound}
                              checked={selectedStudentIds.includes(item.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOne(item.id, !!checked)
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-sm">
                              {item.user?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.enrollmentNo?.toUpperCase()} ·{" "}
                              {item.division?.name || "No Division"}
                            </div>
                          </TableCell>

                          <TableCell>
                            {item.deviceBound ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 gap-1">
                                <IconShieldLock className="h-3 w-3" /> Bound
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Unbound
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {item.deviceBound ? (
                              <div>
                                <div className="font-medium text-xs text-foreground">
                                  {item.deviceModel || "Unknown Smartphone"}
                                </div>
                                {item.deviceOs && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {item.deviceOs}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Ready to bind on next login
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {item.deviceBoundAt
                              ? new Date(item.deviceBoundAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </TableCell>

                          <TableCell className="text-right">
                            {item.deviceBound ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                                onClick={() => setResettingStudent(item)}
                                disabled={resetSingleMutation.isPending}
                              >
                                <IconRotate className="h-3.5 w-3.5" /> Reset Binding
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      {(!inventoryData?.items || inventoryData.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                            No student profiles match your search criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Request Dialog */}
      <Dialog
        open={!!rejectingRequest}
        onOpenChange={(open) => !open && setRejectingRequest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Re-bind Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the hardware re-bind request for{" "}
              <strong>{rejectingRequest?.studentProfile?.user?.name}</strong> (
              {rejectingRequest?.studentProfile?.enrollmentNo?.toUpperCase()})?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground">
              Reason / Note for Student (Optional)
            </label>
            <Textarea
              placeholder="e.g. Please verify identity in-person at CMPICA office..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="min-h-[80px] text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectingRequest(null)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Single Device Alert Dialog */}
      <AlertDialog
        open={!!resettingStudent}
        onOpenChange={(open) => !open && setResettingStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Student Device Binding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unbind the smartphone registered to{" "}
              <strong>{resettingStudent?.user?.name}</strong> (
              {resettingStudent?.enrollmentNo?.toUpperCase()}). The student will be prompted to bind
              their new smartphone upon next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirmSingleReset();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={resetSingleMutation.isPending}
            >
              {resetSingleMutation.isPending ? "Resetting..." : "Reset Device"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Reset Confirmation Dialog */}
      <AlertDialog
        open={showBatchConfirm}
        onOpenChange={setShowBatchConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batch Reset Device Bindings?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reset device bindings for{" "}
              <strong>{selectedStudentIds.length}</strong> selected students. They will be required
              to register their smartphones on their next session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirmBatchReset();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchResetMutation.isPending}
            >
              {batchResetMutation.isPending ? "Resetting..." : "Confirm Batch Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
