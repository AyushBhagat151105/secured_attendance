import { createFileRoute } from "@tanstack/react-router";
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
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";

export const Route = createFileRoute("/admin/anomalies")({
  component: AdminAnomaliesPage,
});

function AdminAnomaliesPage() {
  const { data: anomalies, isLoading } = useAdminAnomalies();
  const resolveMutation = useResolveAnomaly();

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
          <CardTitle className="text-base">Recent Anomalies</CardTitle>
          <CardDescription>All unresolved system anomalies</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading anomalies...
                    </TableCell>
                  </TableRow>
                ) : anomalies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No anomalies detected!
                    </TableCell>
                  </TableRow>
                ) : (
                  anomalies?.map((anomaly: any) => (
                    <TableRow key={anomaly.id}>
                      <TableCell className="text-xs whitespace-nowrap">
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
                      <TableCell className="text-xs text-muted-foreground max-w-50 truncate">
                        {JSON.stringify(anomaly.details)}
                      </TableCell>
                      <TableCell>
                        {anomaly.status === "OPEN" ? (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-200 bg-orange-500/10">
                            OPEN
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-200 bg-emerald-500/10">
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
        </CardContent>
      </Card>
    </div>
  );
}
