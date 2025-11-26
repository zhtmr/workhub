import { useState } from "react";
import { DDLUploader } from "@/components/DDLUploader";
import { TablePreview } from "@/components/TablePreview";
import { ErdViewer } from "@/components/ErdViewer";
import { DebugInfo, ParseStats } from "@/components/DebugInfo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { parseDDL, Table, DatabaseType, ParseResult } from "@/utils/ddlParser";
import { formatAndSortDDL, cleanupDDLText } from "@/utils/ddlFormatter";
import { exportToExcel } from "@/utils/excelExporter";
import { FileSpreadsheet, Wand2, Database, Network, ArrowDownUp, Bug } from "lucide-react";
import { toast } from "sonner";

const DdlConverter = () => {
  const [ddlText, setDdlText] = useState("");
  const [parsedTables, setParsedTables] = useState<Table[]>([]);
  const [dbType, setDbType] = useState<DatabaseType>('auto');
  const [autoSort, setAutoSort] = useState(true);
  const [isFormatted, setIsFormatted] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [parseStats, setParseStats] = useState<ParseStats | null>(null);

  const handleDDLChange = (newDdl: string) => {
    setDdlText(newDdl);
    setIsFormatted(false);
  };

  const handleAutoFormat = () => {
    if (!ddlText.trim()) {
      toast.error("DDL을 입력해주세요.");
      return;
    }

    try {
      // 먼저 파싱
      const tables = parseDDL(ddlText, dbType);
      if (tables.length === 0) {
        toast.error("유효한 CREATE TABLE 문을 찾을 수 없습니다.");
        return;
      }

      // 정렬 및 포맷팅
      const detectedDbType = dbType === 'auto' ? 'postgresql' : dbType;
      const formatted = formatAndSortDDL(tables, detectedDbType);
      const cleaned = cleanupDDLText(formatted);
      
      setDdlText(cleaned);
      setIsFormatted(true);
      toast.success("DDL이 정렬 및 포맷팅되었습니다.", {
        description: `${tables.length}개 테이블이 의존성 순서로 정렬되었습니다.`
      });
    } catch (error) {
      console.error("Formatting error:", error);
      toast.error("DDL 포맷팅 중 오류가 발생했습니다.");
    }
  };

  const handleParse = () => {
    if (!ddlText.trim()) {
      toast.error("DDL을 입력해주세요.");
      return;
    }

    try {
      // autoSort가 켜져 있고 아직 포맷팅 안 됐으면 먼저 포맷팅
      let textToParse = ddlText;
      
      if (autoSort && !isFormatted) {
        const tables = parseDDL(ddlText, dbType);
        if (Array.isArray(tables) && tables.length > 0) {
          const detectedDbType = dbType === 'auto' ? 'postgresql' : dbType;
          const formatted = formatAndSortDDL(tables, detectedDbType);
          textToParse = cleanupDDLText(formatted);
          setDdlText(textToParse);
          setIsFormatted(true);
          toast.info("DDL을 자동으로 정렬했습니다.");
        }
      }

      const result = debugMode 
        ? parseDDL(textToParse, dbType, true)
        : parseDDL(textToParse, dbType);
      
      if (debugMode && !Array.isArray(result)) {
        // 디버그 모드인 경우
        const parseResult = result as ParseResult;
        setParsedTables(parseResult.tables);
        setParseStats({
          ...parseResult.stats,
          errors: parseResult.errors,
          warnings: parseResult.warnings
        });
        
        if (parseResult.tables.length === 0) {
          toast.error("유효한 CREATE TABLE 문을 찾을 수 없습니다.");
        } else {
          const totalRelations = parseResult.tables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
          toast.success(`${parseResult.tables.length}개의 테이블과 ${totalRelations}개의 관계를 파싱했습니다.`);
          
          if (parseResult.errors.length > 0) {
            toast.warning(`${parseResult.errors.length}개의 오류가 발견되었습니다. 디버그 탭을 확인하세요.`);
          }
        }
      } else {
        // 일반 모드인 경우
        const tables = result as Table[];
        if (tables.length === 0) {
          toast.error("유효한 CREATE TABLE 문을 찾을 수 없습니다.");
          return;
        }
        setParsedTables(tables);
        setParseStats(null);
        
        const totalRelations = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
        toast.success(`${tables.length}개의 테이블과 ${totalRelations}개의 관계를 파싱했습니다.`);
      }
    } catch (error) {
      console.error("Parsing error:", error);
      toast.error("DDL 파싱 중 오류가 발생했습니다.");
      setParseStats(null);
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

  const sampleDDL = `-- MySQL 예제
CREATE TABLE users (
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
  status VARCHAR(20) DEFAULT 'pending' COMMENT '주문 상태',
  FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT = '주문 정보 테이블';

CREATE TABLE order_items (
  item_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '항목 ID',
  order_id INT NOT NULL COMMENT '주문 ID',
  product_name VARCHAR(100) NOT NULL COMMENT '상품명',
  quantity INT NOT NULL COMMENT '수량',
  price DECIMAL(10,2) NOT NULL COMMENT '가격',
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
) COMMENT = '주문 항목 테이블';`;

  const samplePostgreSQL = `-- PostgreSQL 예제
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

  const loadSample = (type: 'mysql' | 'postgresql' = 'mysql') => {
    setDdlText(type === 'mysql' ? sampleDDL : samplePostgreSQL);
    setDbType(type);
    setIsFormatted(false);
    toast.info(`${type.toUpperCase()} 샘플 DDL을 불러왔습니다.`);
  };

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">DDL 변환기</h1>
            <p className="text-sm text-muted-foreground">
              DDL 파일을 테이블 정의서 엑셀로 간편하게 변환
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Input */}
        <div className="space-y-4">
          <DDLUploader onDDLChange={handleDDLChange} ddlText={ddlText} />
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>데이터베이스 타입</Label>
                <Select value={dbType} onValueChange={(value) => setDbType(value as DatabaseType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="데이터베이스 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">자동 감지</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>자동 정렬</Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-background">
                  <Switch 
                    checked={autoSort} 
                    onCheckedChange={setAutoSort}
                    className="mr-2"
                  />
                  <span className="text-sm">{autoSort ? '활성화' : '비활성화'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>디버그 모드</Label>
              <div className="flex items-center h-10 px-3 border rounded-md bg-background">
                <Switch 
                  checked={debugMode} 
                  onCheckedChange={setDebugMode}
                  className="mr-2"
                />
                <span className="text-sm">{debugMode ? '활성화' : '비활성화'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAutoFormat} 
                variant="outline"
                className="flex-1"
              >
                <ArrowDownUp className="w-4 h-4 mr-2" />
                DDL 정렬
              </Button>
              <Button 
                onClick={handleParse} 
                className="flex-1"
                size="lg"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                변환
              </Button>
            </div>

            <Select onValueChange={(value) => loadSample(value as 'mysql' | 'postgresql')}>
              <SelectTrigger>
                <SelectValue placeholder="샘플 로드" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mysql">MySQL 샘플</SelectItem>
                <SelectItem value="postgresql">PostgreSQL 샘플</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Panel - Preview & ERD */}
        <div className="space-y-4">
          <Tabs defaultValue="tables" className="w-full">
            <TabsList className={`grid w-full ${debugMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="tables">
                <Database className="w-4 h-4 mr-2" />
                테이블 정의
              </TabsTrigger>
              <TabsTrigger value="erd">
                <Network className="w-4 h-4 mr-2" />
                ERD
              </TabsTrigger>
              {debugMode && (
                <TabsTrigger value="debug">
                  <Bug className="w-4 h-4 mr-2" />
                  디버그
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="tables" className="mt-4">
              <TablePreview tables={parsedTables} />
            </TabsContent>
            
            <TabsContent value="erd" className="mt-4">
              <ErdViewer tables={parsedTables} />
            </TabsContent>
            
            {debugMode && parseStats && (
              <TabsContent value="debug" className="mt-4">
                <DebugInfo stats={parseStats} />
              </TabsContent>
            )}
          </Tabs>
          
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
      <div className="mt-12 grid md:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-primary font-bold">1</span>
          </div>
          <h3 className="font-semibold mb-2 text-card-foreground">DDL 입력</h3>
          <p className="text-sm text-muted-foreground">
            MySQL, PostgreSQL 등 다양한 DB의 DDL을 입력합니다.
          </p>
        </div>
        
        <div className="p-6 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-primary font-bold">2</span>
          </div>
          <h3 className="font-semibold mb-2 text-card-foreground">테이블 정의서</h3>
          <p className="text-sm text-muted-foreground">
            컬럼 정보와 제약조건을 포함한 상세 정의서를 확인합니다.
          </p>
        </div>
        
        <div className="p-6 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-primary font-bold">3</span>
          </div>
          <h3 className="font-semibold mb-2 text-card-foreground">ERD 생성</h3>
          <p className="text-sm text-muted-foreground">
            테이블 간 관계를 자동으로 분석하여 ERD를 생성합니다.
          </p>
        </div>
        
        <div className="p-6 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-primary font-bold">4</span>
          </div>
          <h3 className="font-semibold mb-2 text-card-foreground">엑셀 내보내기</h3>
          <p className="text-sm text-muted-foreground">
            테이블별 시트와 통합 시트로 엑셀 파일을 다운로드합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DdlConverter;
