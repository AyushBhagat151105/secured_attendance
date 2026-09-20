import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconFileSpreadsheet } from "@tabler/icons-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin";

export const Route = createFileRoute("/admin/export")({
  component: AdminExportRoute,
});

function AdminExportRoute() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const { data, error } = await apiClient.api.admin.reports.export.get();
      if (error) {
        throw new Error((error.value as any)?.message || "Export failed");
      }

      const blob = new Blob([data as string], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_attendance_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export downloaded successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl min-w-0 w-full pb-10">
      <AdminPageHeader
        title="Data Export & Archival"
        subtitle="Extract raw, cryptographically verified attendance records and session metrics for regulatory compliance and audit logs."
        icon={<IconDownload className="size-6 text-primary" />}
      />

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Card className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <IconFileSpreadsheet className="size-5" />
            </div>
            <CardTitle className="text-base font-semibold">Institutional CSV Export</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Extract all completed attendance sessions, student turnouts, and aggregate attendance
              percentages over the past 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <Button
              className="w-full gap-1.5 text-xs sm:text-sm h-9 shadow-xs"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              {isExporting ? (
                "Generating..."
              ) : (
                <>
                  <IconDownload className="size-4" />
                  Download CSV Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
