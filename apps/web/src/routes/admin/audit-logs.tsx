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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IconHistory, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogsPage,
});

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

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
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconHistory className="h-6 w-6 text-primary" />
          System Audit Logs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          A tamper-evident trail of all administrative and system events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Event Log</CardTitle>
              <CardDescription>
                {data
                  ? `Showing ${data.logs.length} of ${data.total} events`
                  : isLoading
                    ? "Loading events…"
                    : "No events found"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Event type…"
                value={eventType}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                className="h-8 w-40 text-sm"
              />
              <Input
                placeholder="Actor ID or name…"
                value={actor}
                onChange={(e) => handleActorChange(e.target.value)}
                className="h-8 w-44 text-sm"
              />
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
              Failed to load audit logs. Please try refreshing the page.
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>IP / User Agent</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton />
                    ) : data?.logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          {hasFilters ? "No logs match the current filters." : "No logs found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.logs.map(
                        (log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}

                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs font-mono">
                                {log.eventType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{log.actor ?? "System"}</div>
                              {log.actorRole && (
                                <div className="text-xs text-muted-foreground">{log.actorRole}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {log.targetId ?? "—"}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">{log.ipAddress ?? "—"}</div>
                              <div className="text-[10px] text-muted-foreground max-w-37.5 truncate">
                                {log.userAgent}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-50 truncate">
                              {log.details ? JSON.stringify(log.details) : "—"}
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data || data.logs.length < pageSize || isLoading}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
