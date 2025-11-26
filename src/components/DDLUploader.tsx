import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

interface DDLUploaderProps {
  onDDLChange: (ddl: string) => void;
  ddlText: string;
}

export function DDLUploader({ onDDLChange, ddlText }: DDLUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onDDLChange(text);
        toast.success(`${file.name} 파일을 불러왔습니다.`);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onDDLChange(text);
        toast.success(`${file.name} 파일을 불러왔습니다.`);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2 text-card-foreground">DDL 입력</h2>
          <p className="text-sm text-muted-foreground">
            DDL 파일을 업로드하거나 직접 입력해주세요.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-muted-foreground">
                .sql, .txt 파일 지원
              </p>
            </div>
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <FileText className="w-4 h-4 mr-2" />
                  파일 선택
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".sql,.txt"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            또는 직접 입력
          </label>
          <Textarea
            placeholder="CREATE TABLE 문을 입력해주세요..."
            value={ddlText}
            onChange={(e) => onDDLChange(e.target.value)}
            className="min-h-[300px] font-mono text-sm bg-background"
          />
        </div>
      </div>
    </Card>
  );
}
