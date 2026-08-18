import { IconCloudUpload, IconFile, IconX } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkImportDropzoneProps {
  onFileSelected: (content: string, fileName: string) => void;
  isLoading?: boolean;
}

const ACCEPTED_TYPES = [".csv", "text/csv", "application/vnd.ms-excel"];
const MAX_FILE_SIZE_MB = 5;

export function BulkImportDropzone({ onFileSelected, isLoading }: BulkImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSelectedFile(file.name);
        onFileSelected(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  function clearSelection() {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-colors duration-200",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
          selectedFile && "border-emerald-500/50 bg-emerald-500/5",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          {selectedFile ? (
            <>
              <div className="rounded-full bg-emerald-500/10 p-3">
                <IconFile className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{selectedFile}</p>
                <p className="text-muted-foreground text-xs mt-0.5">File ready to preview</p>
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "rounded-full p-3 transition-colors",
                  isDragging ? "bg-primary/10" : "bg-muted",
                )}
              >
                <IconCloudUpload
                  className={cn(
                    "h-8 w-8 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {isDragging ? "Drop your CSV here" : "Drop CSV or click to browse"}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Max {MAX_FILE_SIZE_MB}MB · CSV format only
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="gap-1.5 text-muted-foreground"
        >
          <IconX className="h-3.5 w-3.5" />
          Clear selection
        </Button>
      )}
    </div>
  );
}
