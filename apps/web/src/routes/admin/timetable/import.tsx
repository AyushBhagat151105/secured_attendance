import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconUpload,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkImportDropzone } from "@/features/admin/users/components/bulk-import-dropzone";
import {
  useConfirmTimetableImport,
  usePreviewTimetableImport,
} from "@/hooks/use-admin-timetable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/timetable/import")({
  component: TimetableImportPage,
});

type Step = "upload" | "preview" | "done";

const CSV_FORMAT =
  "programCode,academicYear,semester,division,subjectCode,subjectName,roomName,dayOfWeek,startTime,endTime,teacherCode,type\nmsit,2026-2027,1,Div-I,MSIT101,Computer Networks,Lab 1,1,09:10,10:10,HMP,lecture";

function TimetableImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [previewData, setPreviewData] = useState<{
    parsed: any[];
    validCount: number;
    invalidCount: number;
  } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [finalResult, setFinalResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const preview = usePreviewTimetableImport();
  const confirm = useConfirmTimetableImport();

  async function handleFileSelected(csv: string) {
    const result = await preview.mutateAsync(csv);
    if (result) {
      setPreviewData(result);
      setStep("preview");
    }
  }

  async function handleConfirm() {
    if (!previewData) return;
    const validRows = previewData.parsed.filter((r: any) => r.errors.length === 0);

    setIsImporting(true);

    try {
      const result = await confirm.mutateAsync(validRows);
      setFinalResult(result as any);
    } catch (e) {
      console.error("Import interrupted:", e);
    }

    setIsImporting(false);
    setStep("done");
  }

  function handleReset() {
    setStep("upload");
    setPreviewData(null);
    setFinalResult(null);
    setIsImporting(false);
    preview.reset();
    confirm.reset();
  }

  const stepIndex = step === "upload" ? 0 : step === "preview" ? 1 : 2;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/timetable" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <IconArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Import Timetable</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Import timetable schedules from a CSV file
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["Upload", "Preview", "Done"] as const).map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < stepIndex ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={
                i === stepIndex ? "font-medium" : "text-muted-foreground"
              }
            >
              {label}
            </span>
            {i < 2 && <IconChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload CSV</CardTitle>
            <CardDescription>
              Upload a CSV file matching the required timetable format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <BulkImportDropzone
              onFileSelected={handleFileSelected}
              isLoading={preview.isPending}
            />

            {preview.isPending && (
              <p className="text-center text-sm text-muted-foreground">Parsing CSV...</p>
            )}

            <Separator />

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Expected CSV format:</p>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                {CSV_FORMAT}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Import</CardTitle>
            <CardDescription>
              Review the parsed rows. Only valid rows will be imported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600">
                  <IconCheck className="h-3.5 w-3.5" />
                  {previewData.validCount} valid
                </div>
                {previewData.invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                    <IconAlertCircle className="h-3.5 w-3.5" />
                    {previewData.invalidCount} with errors
                  </div>
                )}
                <span className="text-muted-foreground ml-auto text-xs">
                  {previewData.parsed.length} total rows
                </span>
              </div>

              <div className="rounded-lg border overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-6">#</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Sem</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.parsed.map((row: any, i: number) => {
                      const hasErrors = row.errors && row.errors.length > 0;
                      return (
                        <TableRow
                          key={i}
                          className={cn(hasErrors && "bg-destructive/5 hover:bg-destructive/10")}
                        >
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs">{row.programCode || "—"}</TableCell>
                          <TableCell className="text-xs">{row.semester || "—"}</TableCell>
                          <TableCell className="text-xs font-semibold">{row.subjectCode || "—"}</TableCell>
                          <TableCell className="text-xs">{row.dayOfWeek || "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{row.startTime} - {row.endTime}</TableCell>
                          <TableCell className="text-xs">{row.roomName || "—"}</TableCell>
                          <TableCell>
                            {hasErrors ? (
                              <div className="space-y-0.5">
                                {row.errors.map((err: string, j: number) => (
                                  <Badge key={j} variant="destructive" className="text-[10px] py-0 leading-tight">
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="default" className="text-[10px] py-0 bg-emerald-500">
                                Valid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <Button variant="outline" onClick={handleReset} disabled={isImporting}>
                ← Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isImporting || previewData.validCount === 0}
                className="gap-2"
              >
                <IconUpload className="h-4 w-4" />
                {isImporting
                  ? "Importing..."
                  : `Import ${previewData.validCount} schedules`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && finalResult && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <IconCheck className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Import Complete</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {finalResult.created} schedules created · {finalResult.skipped} skipped (already exist)
              </p>
              {finalResult.errors?.length > 0 && (
                <p className="text-destructive text-sm mt-1">
                  {finalResult.errors.length} errors — check logs
                </p>
              )}
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                Import More
              </Button>
              <Link to="/admin/timetable" className={cn(buttonVariants())}>View Timetable</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
