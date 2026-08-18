import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface StudentPreviewRow {
  enrollmentNo: string;
  name: string;
  email: string;
  programCode: string;
  semester: number;
  division: string;
  tempPassword: string;
  errors: string[];
}

interface TeacherPreviewRow {
  code: string;
  name: string;
  email: string;
  department?: string;
  tempPassword: string;
  errors: string[];
}

interface BulkImportPreviewProps {
  type: "students" | "teachers";
  rows: (StudentPreviewRow | TeacherPreviewRow)[];
  validCount: number;
  invalidCount: number;
}

export function BulkImportPreview({
  type,
  rows,
  validCount,
  invalidCount,
}: BulkImportPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400">
          <IconCheck className="h-3.5 w-3.5" />
          {validCount} valid
        </div>
        {invalidCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
            <IconAlertCircle className="h-3.5 w-3.5" />
            {invalidCount} with errors
          </div>
        )}
        <span className="text-muted-foreground ml-auto text-xs">
          {rows.length} total rows
        </span>
      </div>

      {/* Preview table */}
      <div className="rounded-lg border overflow-auto max-h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6">#</TableHead>
              {type === "students" ? (
                <>
                  <TableHead>Enrollment No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Sem</TableHead>
                  <TableHead>Division</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const hasErrors = row.errors.length > 0;
              return (
                <TableRow
                  key={i}
                  className={cn(hasErrors && "bg-destructive/5 hover:bg-destructive/10")}
                >
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>

                  {type === "students" ? (
                    (() => {
                      const r = row as StudentPreviewRow;
                      return (
                        <>
                          <TableCell className="font-mono text-xs">{r.enrollmentNo || "—"}</TableCell>
                          <TableCell className="text-sm">{r.name || "—"}</TableCell>
                          <TableCell className="text-xs">{r.email || "—"}</TableCell>
                          <TableCell className="text-xs">{r.programCode || "—"}</TableCell>
                          <TableCell className="text-xs">{r.semester}</TableCell>
                          <TableCell className="text-xs">{r.division || "—"}</TableCell>
                        </>
                      );
                    })()
                  ) : (
                    (() => {
                      const r = row as TeacherPreviewRow;
                      return (
                        <>
                          <TableCell className="font-mono text-xs">{r.code || "—"}</TableCell>
                          <TableCell className="text-sm">{r.name || "—"}</TableCell>
                          <TableCell className="text-xs">{r.email || "—"}</TableCell>
                          <TableCell className="text-xs">{r.department || "—"}</TableCell>
                        </>
                      );
                    })()
                  )}

                  <TableCell>
                    {hasErrors ? (
                      <div className="space-y-0.5">
                        {row.errors.map((err, j) => (
                          <Badge key={j} variant="destructive" className="text-xs py-0">
                            {err}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="default" className="text-xs py-0 bg-emerald-500">
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
  );
}
