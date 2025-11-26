import { useState } from "react";
import { DDLUploader } from "@/components/DDLUploader";
import { TablePreview } from "@/components/TablePreview";
import { Button } from "@/components/ui/button";
import { parseDDL, Table } from "@/utils/ddlParser";
import { exportToExcel } from "@/utils/excelExporter";
import { FileSpreadsheet, Wand2, Database } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [ddlText, setDdlText] = useState("");
  const [parsedTables, setParsedTables] = useState<Table[]>([]);

  const handleParse = () => {
    if (!ddlText.trim()) {
      toast.error("DDL을 입력해주세요.");
      return;
    }

    try {
      const tables = parseDDL(ddlText);
      if (tables.length === 0) {
        toast.error("유효한 CREATE TABLE 문을 찾을 수 없습니다.");
        return;
      }
      setParsedTables(tables);
      toast.success(`${tables.length}개의 테이블을 파싱했습니다.`);
    } catch (error) {
      console.error("Parsing error:", error);
      toast.error("DDL 파싱 중 오류가 발생했습니다.");
    }
  };

  const handleExport = () => {
    if (parsedTables.length === 0) {
      toast.error("먼저 DDL을 변환해주세요.");
      return;
    }

    try {
      exportToExcel(parsedTables);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("엑셀 파일 생성 중 오류가 발생했습니다.");
    }
  };

  const sampleDDL = `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 ID',
  username VARCHAR(50) NOT NULL COMMENT '사용자명',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '이메일',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시'
) COMMENT = '사용자 정보 테이블';

CREATE TABLE orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '주문 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  order_date DATETIME NOT NULL COMMENT '주문일시',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '총 금액',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '주문 상태'
) COMMENT = '주문 정보 테이블';`;

  const loadSample = () => {
    setDdlText(sampleDDL);
    toast.info("샘플 DDL을 불러왔습니다.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                DDL to Excel Converter
              </h1>
              <p className="text-sm text-muted-foreground">
                DDL 파일을 테이블 정의서 엑셀로 간편하게 변환
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="space-y-4">
            <DDLUploader onDDLChange={setDdlText} ddlText={ddlText} />
            
            <div className="flex gap-2">
              <Button 
                onClick={handleParse} 
                className="flex-1"
                size="lg"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                DDL 변환
              </Button>
              <Button 
                onClick={loadSample} 
                variant="outline"
                size="lg"
              >
                샘플 로드
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-4">
            <TablePreview tables={parsedTables} />
            
            {parsedTables.length > 0 && (
              <Button 
                onClick={handleExport} 
                className="w-full"
                size="lg"
                variant="default"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                엑셀 파일로 내보내기
              </Button>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-primary font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2 text-card-foreground">DDL 입력</h3>
            <p className="text-sm text-muted-foreground">
              파일 업로드 또는 직접 CREATE TABLE 문을 입력합니다.
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-primary font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2 text-card-foreground">변환 및 미리보기</h3>
            <p className="text-sm text-muted-foreground">
              DDL을 파싱하여 테이블 정의서 형태로 미리보기합니다.
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-primary font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2 text-card-foreground">엑셀 다운로드</h3>
            <p className="text-sm text-muted-foreground">
              각 테이블별 시트와 전체 통합 시트로 구성된 엑셀 파일을 다운로드합니다.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>DDL to Excel Converter - 데이터베이스 테이블 정의서 자동화 도구</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
