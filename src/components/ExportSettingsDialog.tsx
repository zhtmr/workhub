import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet } from "lucide-react";
import { ExportMetadata } from "@/types/excel";

interface ExportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (metadata: ExportMetadata) => void;
}

function generateDocumentNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `TBL_${year}${month}${day}_001`;
}

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ExportSettingsDialog({
  open,
  onOpenChange,
  onExport,
}: ExportSettingsDialogProps) {
  const [formData, setFormData] = useState<ExportMetadata>({
    systemName: "",
    author: "",
    databaseName: "",
    schemaName: "public",
    documentNumber: generateDocumentNumber(),
    createdDate: getTodayDate(),
    version: "v1.0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ExportMetadata, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 입력 시 에러 초기화
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.systemName.trim()) {
      newErrors.systemName = "시스템명은 필수입니다.";
    }
    if (!formData.author.trim()) {
      newErrors.author = "작성자는 필수입니다.";
    }
    if (!formData.databaseName.trim()) {
      newErrors.databaseName = "데이터베이스명은 필수입니다.";
    }
    if (!formData.schemaName.trim()) {
      newErrors.schemaName = "스키마명은 필수입니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExport = () => {
    if (validate()) {
      onExport(formData);
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setFormData({
      systemName: "",
      author: "",
      databaseName: "",
      schemaName: "public",
      documentNumber: generateDocumentNumber(),
      createdDate: getTodayDate(),
      version: "v1.0",
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            엑셀 내보내기 설정
          </DialogTitle>
          <DialogDescription>
            테이블 정의서에 포함될 메타데이터를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 필수 필드 */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="systemName" className="text-right">
                시스템명 <span className="text-destructive">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="systemName"
                  value={formData.systemName}
                  onChange={(e) => handleChange("systemName", e.target.value)}
                  placeholder="예: 통합 업무 관리 시스템"
                  className={errors.systemName ? "border-destructive" : ""}
                />
                {errors.systemName && (
                  <p className="text-xs text-destructive mt-1">{errors.systemName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="author" className="text-right">
                작성자 <span className="text-destructive">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleChange("author", e.target.value)}
                  placeholder="예: (주)회사명 홍길동"
                  className={errors.author ? "border-destructive" : ""}
                />
                {errors.author && (
                  <p className="text-xs text-destructive mt-1">{errors.author}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="databaseName" className="text-right">
                데이터베이스명 <span className="text-destructive">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="databaseName"
                  value={formData.databaseName}
                  onChange={(e) => handleChange("databaseName", e.target.value)}
                  placeholder="예: myapp_production"
                  className={errors.databaseName ? "border-destructive" : ""}
                />
                {errors.databaseName && (
                  <p className="text-xs text-destructive mt-1">{errors.databaseName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="schemaName" className="text-right">
                스키마명 <span className="text-destructive">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="schemaName"
                  value={formData.schemaName}
                  onChange={(e) => handleChange("schemaName", e.target.value)}
                  placeholder="예: public"
                  className={errors.schemaName ? "border-destructive" : ""}
                />
                {errors.schemaName && (
                  <p className="text-xs text-destructive mt-1">{errors.schemaName}</p>
                )}
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t my-2" />

          {/* 선택 필드 */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documentNumber" className="text-right text-muted-foreground">
                문서번호
              </Label>
              <div className="col-span-3">
                <Input
                  id="documentNumber"
                  value={formData.documentNumber}
                  onChange={(e) => handleChange("documentNumber", e.target.value)}
                  placeholder="자동 생성"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="createdDate" className="text-right text-muted-foreground">
                작성일
              </Label>
              <div className="col-span-3">
                <Input
                  id="createdDate"
                  type="date"
                  value={formData.createdDate}
                  onChange={(e) => handleChange("createdDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version" className="text-right text-muted-foreground">
                버전
              </Label>
              <div className="col-span-3">
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => handleChange("version", e.target.value)}
                  placeholder="v1.0"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
          <Button onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}