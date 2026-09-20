import { createFileRoute } from "@tanstack/react-router";
import { useAdminAuditLogs } from "@/hooks/api/use-admin-audit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IconHistory, IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, TableSkeletonRows } from "@/components/admin";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const [page, setPage] = useState(0);
  const [eventType, setEventType] = useState("");
  const [actor, setActor] = useState("");
  const pageSize = 50;

  const hasFilters = eventType.trim() !== "" || actor.trim() !== "";

  const clearFilters = () => {
    setEventType("");
    setActor("");
    setPage(0);
  };

  const { data, isLoading, isError } = useAdminAuditLogs({
    limit: pageSize,
    offset: page * pageSize,
    eventType: eventType.trim() || undefined,
    actor: actor.trim() || undefined,
  });

  const handleEventTypeChange = (v: string) => {
    setEventType(v);
    setPage(0);
  };

  const handleActorChange = (v: string) => {
    setActor(v);
    setPage(0);
  };

  return (
    <div className="space-y-6 min-w-0 pb-10">
      <AdminPageHeader
        title="System Audit Logs"
        subtitle="Immutable, tamper-evident audit trail capturing administrative actions, device bindings, and security events."
        icon={<IconHistory className="size-6 text-primary" />}
        badge={
          data?.total !== undefined ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {data.total} Logged Events
            </span>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4 border-border/70 shadow-xs bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search event type (e.g. user.create, device.bind)..."
              value={eventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="pl-8.5 h-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Actor ID or name..."
              value={actor}
              onChange={(e) => handleActorChange(e.target.value)}
              className="h-9 w-full sm:w-48 text-xs sm:text-sm"
            />

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 text-xs"
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
          Failed to load audit logs. Please try refreshing the page.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto touch-pan-x">
              <Table className="min-w-[680px] sm:min-w-full">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                    <TableHead className="text-xs font-semibold">Event Type</TableHead>
                    <TableHead className="text-xs font-semibold">Actor</TableHead>
                    <TableHead className="text-xs font-semibold">Target</TableHead>
                    <TableHead className="text-xs font-semibold">IP / Network</TableHead>
                    <TableHead className="text-xs font-semibold">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeletonRows rows={8} columns={6} hasAvatar={false} hasActions={false} />
                  ) : data?.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-sm">
                        {hasFilters ? "No logs match the current filters." : "No audit events recorded."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {log.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{log.actor ?? "System"}</div>
                          {log.actorRole && (
                            <div className="text-xs text-muted-foreground capitalize">{log.actorRole}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.targetId ? (
                            <span className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                              {log.targetId}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono text-foreground">{log.ipAddress ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground max-w-48 truncate" title={log.userAgent}>
                            {log.userAgent}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-56 truncate font-mono">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">
              {data ? `Showing page ${page + 1} (${data.logs.length} of ${data.total} records)` : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data || data.logs.length < pageSize || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
