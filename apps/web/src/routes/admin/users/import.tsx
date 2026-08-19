import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconUpload,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BulkImportDropzone } from "@/features/admin/users/components/bulk-import-dropzone";
import { BulkImportPreview } from "@/features/admin/users/components/bulk-import-preview";
import {
  useConfirmUsersImport,
  usePreviewUsersImport,
} from "@/hooks/use-admin-users";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/import")({
  component: ImportPage,
});

type Step = "upload" | "preview" | "done";
type ImportType = "students" | "teachers";

// ─── CSV format reference strings ────────────────────────────────────────────
const CSV_FORMATS: Record<ImportType, string> = {
  students:
    "enrollment_no,name,email,program_code,semester,division\n26msit001,Ayush Bhagat,26msit001@charusat.edu.in,msit,1,Div-I",
  teachers:
    "code,name,email,department\nHMP,Prof. Hitesh Patel,hmp@charusat.ac.in,Computer Science",
};

function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [importType, setImportType] = useState<ImportType>("students");
  const [previewData, setPreviewData] = useState<{
    type: ImportType;
    parsed: unknown[];
    validCount: number;
    invalidCount: number;
  } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [finalResult, setFinalResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const preview = usePreviewUsersImport();
  const confirm = useConfirmUsersImport();

  async function handleFileSelected(csv: string) {
    const result = await preview.mutateAsync({ type: importType, csv });
    if (result) {
      setPreviewData({ ...result, type: importType } as typeof previewData);
      setStep("preview");
    }
  }

  async function handleConfirm() {
    if (!previewData) return;
    const validRows = (previewData.parsed as { errors: string[] }[]).filter(
      (r) => r.errors.length === 0,
    );

    setIsImporting(true);
    setImportProgress(0);

    let totalCreated = 0;
    let totalSkipped = 0;
    const totalErrors: string[] = [];
    const CHUNK_SIZE = 50;

    try {
      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const result = await confirm.mutateAsync({ type: previewData.type, rows: chunk });
        
        totalCreated += result?.created ?? 0;
        totalSkipped += result?.skipped ?? 0;
        if (result?.errors) {
          totalErrors.push(...result.errors);
        }
        
        setImportProgress(Math.min(100, Math.round(((i + chunk.length) / validRows.length) * 100)));
      }
    } catch (e) {
      // Error is handled by the mutation's onError (toast), we just stop importing further chunks.
      console.error("Import interrupted:", e);
    }

    setFinalResult({ created: totalCreated, skipped: totalSkipped, errors: totalErrors });
    setIsImporting(false);
    setStep("done");
  }

  function handleReset() {
    setStep("upload");
    setPreviewData(null);
    setFinalResult(null);
    setIsImporting(false);
    setImportProgress(0);
    preview.reset();
    confirm.reset();
  }

  const stepIndex = step === "upload" ? 0 : step === "preview" ? 1 : 2;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <IconArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bulk Import</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Import students or teachers from a CSV file
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
              Choose the import type and upload a CSV file matching the required format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Import Type</label>
              <Select
                value={importType}
                onValueChange={(v) => setImportType(v as ImportType)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="teachers">Teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                {CSV_FORMATS[importType]}
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
            <BulkImportPreview
              type={previewData.type}
              rows={previewData.parsed as Parameters<typeof BulkImportPreview>[0]["rows"]}
              validCount={previewData.validCount}
              invalidCount={previewData.invalidCount}
            />

            <div className="flex justify-between items-center mt-6">
              <Button variant="outline" onClick={handleReset} disabled={isImporting}>
                ← Back
              </Button>
              <div className="flex-1 px-8">
                {isImporting && (
                  <div className="space-y-1.5">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">{importProgress}% completed</p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleConfirm}
                disabled={isImporting || previewData.validCount === 0}
                className="gap-2"
              >
                <IconUpload className="h-4 w-4" />
                {isImporting
                  ? "Importing..."
                  : `Import ${previewData.validCount} ${previewData.type}`}
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
                {finalResult.created} users created · {finalResult.skipped} skipped (already exist)
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
              <Link to="/admin/users" className={cn(buttonVariants())}>View Users</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
