import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconDownload, IconFileSpreadsheet } from "@tabler/icons-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useState } from "react";

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
    <div className="space-y-8 p-4 sm:p-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Export</h1>
        <p className="text-muted-foreground text-lg">
          Download system-wide attendance data for external analysis and archiving.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <IconFileSpreadsheet className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>Monthly CSV Export</CardTitle>
            <CardDescription>
              Download a detailed CSV file containing all closed sessions and attendance percentages from the last 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={handleExportCSV} 
              disabled={isExporting}
            >
              {isExporting ? (
                "Generating..."
              ) : (
                <>
                  <IconDownload className="mr-2 h-4 w-4" />
                  Download CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
