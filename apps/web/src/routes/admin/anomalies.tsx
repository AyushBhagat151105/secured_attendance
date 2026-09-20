import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminAnomalies, useResolveAnomaly } from "@/hooks/api/use-admin-audit";
import { useRebindAndResolveAnomaly } from "@/hooks/api/use-admin-devices";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconRotate,
  IconSearch,
} from "@tabler/icons-react";
import { AdminPageHeader, TableSkeletonRows } from "@/components/admin";
import { AnomalyDetailCell } from "./-anomaly-detail-cell";

export const Route = createFileRoute("/admin/anomalies")({
  component: AdminAnomaliesPage,
});

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open Alerts" },
  { value: "RESOLVED", label: "Resolved" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Anomaly Types" },
  { value: "IMPOSSIBLE_TRAVEL", label: "Impossible Travel" },
  { value: "DEVICE_MISMATCH", label: "Device Mismatch" },
];

function AdminAnomaliesPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filters = {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    type: typeFilter !== "ALL" ? typeFilter : undefined,
  };

  const { data, isLoading, isError } = useAdminAnomalies(filters);
  const resolveMutation = useResolveAnomaly();
  const rebindAndResolveMutation = useRebindAndResolveAnomaly();

  // API returns { anomalies: [...], total: number } (paginated shape)
  const anomalyList = Array.isArray(data)
    ? data
    : ((data as { anomalies?: unknown[] } | null)?.anomalies ?? []);

  const hasFilters = statusFilter !== "ALL" || typeFilter !== "ALL" || search.trim() !== "";

  const clearFilters = () => {
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setSearch("");
  };

  const lowerSearch = search.toLowerCase();
  const filtered = search.trim()
    ? anomalyList.filter(
        (a) =>
          (a as { user: { name: string; email: string } }).user.name
            .toLowerCase()
            .includes(lowerSearch) ||
          (a as { user: { name: string; email: string } }).user.email
            .toLowerCase()
            .includes(lowerSearch),
      )
    : anomalyList;

  const openCount = anomalyList.filter((a: any) => a.status === "OPEN").length;

  return (
    <div className="space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="Security & Anomaly Alerts"
        subtitle="Review impossible travel flags, hardware device mismatches, and geofence perimeter violations."
        icon={<IconAlertTriangle className="size-6 text-rose-500" />}
        badge={
          openCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              {openCount} Open Alerts
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              All Clear
            </span>
          )
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4 border-border/70 shadow-xs bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 text-xs w-full sm:w-auto"
                onClick={clearFilters}
              >
                <IconX className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load anomalies. Please try refreshing the page.
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto touch-pan-x">
            <Table className="min-w-[640px] sm:min-w-full">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Time</TableHead>
                  <TableHead className="text-xs font-semibold">User</TableHead>
                  <TableHead className="text-xs font-semibold">Anomaly Type</TableHead>
                  <TableHead className="text-xs font-semibold">Severity</TableHead>
                  <TableHead className="text-xs font-semibold">Details</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="w-40 text-right text-xs font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows rows={6} columns={7} hasAvatar={true} hasActions={true} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm">
                      {hasFilters
                        ? "No anomalies match the current filters."
                        : "No security anomalies detected. System running normally."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((anomaly: any) => (
                    <TableRow key={anomaly.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground font-mono">
                        {new Date(anomaly.createdAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{anomaly.user.name}</div>
                        <div className="text-xs text-muted-foreground">{anomaly.user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {anomaly.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            anomaly.severity === "HIGH"
                              ? "destructive"
                              : anomaly.severity === "MEDIUM"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs font-semibold"
                        >
                          {anomaly.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <AnomalyDetailCell type={anomaly.type} details={anomaly.details} />
                      </TableCell>
                      <TableCell>
                        {anomaly.status === "OPEN" ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10 font-semibold"
                          >
                            OPEN
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-semibold"
                          >
                            RESOLVED
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {anomaly.status === "OPEN" && (
                          <div className="flex items-center justify-end gap-1.5">
                            {anomaly.type === "DEVICE_MISMATCH" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                onClick={() => rebindAndResolveMutation.mutate(anomaly.id)}
                                disabled={rebindAndResolveMutation.isPending}
                                title="Reset student device binding and mark anomaly as resolved"
                              >
                                <IconRotate className="size-3.5" />
                                Reset & Resolve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => resolveMutation.mutate(anomaly.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <IconCheck className="size-3.5" />
                              Resolve
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
