import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminAnomalies, useResolveAnomaly } from "@/hooks/api/use-admin-audit";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import { AnomalyDetailCell } from "./-anomaly-detail-cell";

export const Route = createFileRoute("/admin/anomalies")({
  component: AdminAnomaliesPage,
});

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "IMPOSSIBLE_TRAVEL", label: "Impossible Travel" },
  { value: "DEVICE_MISMATCH", label: "Device Mismatch" },
];

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconAlertTriangle className="h-6 w-6 text-destructive" />
          Anomaly Detection Alerts
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review impossible travel and device mismatch alerts flagged by the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Recent Anomalies</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading..."
                  : `${filtered.length} anomal${filtered.length === 1 ? "y" : "ies"} found`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-48 text-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
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
                <SelectTrigger className="h-8 w-42 text-sm">
                  <SelectValue />
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
                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={clearFilters}>
                  <IconX className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
              Failed to load anomalies. Please try refreshing the page.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {hasFilters
                          ? "No anomalies match the current filters."
                          : "No anomalies detected!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((anomaly: any) => (
                      <TableRow key={anomaly.id}>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(anomaly.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{anomaly.user.name}</div>
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
                            className="text-xs"
                          >
                            {anomaly.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-56">
                          <AnomalyDetailCell type={anomaly.type} details={anomaly.details} />
                        </TableCell>
                        <TableCell>
                          {anomaly.status === "OPEN" ? (
                            <Badge
                              variant="outline"
                              className="text-xs text-orange-500 border-orange-200 bg-orange-500/10"
                            >
                              OPEN
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-emerald-500 border-emerald-200 bg-emerald-500/10"
                            >
                              RESOLVED
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {anomaly.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1"
                              onClick={() => resolveMutation.mutate(anomaly.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <IconCheck className="h-3.5 w-3.5" />
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
