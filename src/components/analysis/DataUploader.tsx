import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseFile, type ParsedData } from "@/utils/dataParser";
import { toast } from "sonner";

interface DataUploaderProps {
  onDataLoaded: (data: ParsedData) => void;
  currentFile?: string;
  onClear?: () => void;
  className?: string;
}

export function DataUploader({
  onDataLoaded,
  currentFile,
  onClear,
  className,
}: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const data = await parseFile(file);
        onDataLoaded(data);
        toast.success(`${data.rowCount}개의 행을 불러왔습니다.`);
      } catch (error) {
        console.error("File parsing error:", error);
        toast.error(
          error instanceof Error ? error.message : "파일을 읽을 수 없습니다."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [onDataLoaded]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("CSV 또는 Excel 파일만 지원합니다.");
      return;
    }

    await handleFile(file);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    e.target.value = "";
  };

  if (currentFile) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">{currentFile}</p>
              <p className="text-sm text-muted-foreground">파일 로드됨</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  다른 파일
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </span>
              </Button>
            </label>
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Upload className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">
          {isLoading ? "파일 처리 중..." : "파일을 드래그하여 업로드"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          CSV, Excel (.xlsx, .xls) 파일 지원
        </p>
        <label>
          <Button variant="outline" disabled={isLoading} asChild>
            <span className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              파일 선택
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                disabled={isLoading}
              />
            </span>
          </Button>
        </label>
      </div>
    </Card>
  );
}
