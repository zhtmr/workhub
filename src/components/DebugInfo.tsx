import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export interface ParseError {
  line?: number;
  tableName?: string;
  columnName?: string;
  error: string;
  context?: string;
}

export interface ParseStats {
  totalTables: number;
  successfulTables: number;
  failedTables: number;
  totalColumns: number;
  parseTime: number;
  errors: ParseError[];
  warnings: string[];
}

interface DebugInfoProps {
  stats: ParseStats;
}

export function DebugInfo({ stats }: DebugInfoProps) {
  const hasErrors = stats.errors.length > 0;
  const hasWarnings = stats.warnings.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            파싱 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">총 테이블</div>
              <div className="text-2xl font-bold">{stats.totalTables}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">성공</div>
              <div className="text-2xl font-bold text-green-600">{stats.successfulTables}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">실패</div>
              <div className="text-2xl font-bold text-red-600">{stats.failedTables}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">총 컬럼</div>
              <div className="text-2xl font-bold">{stats.totalColumns}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">처리 시간</div>
              <div className="text-2xl font-bold">{stats.parseTime}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasErrors && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            오류 ({stats.errors.length})
          </h3>
          {stats.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {error.tableName && <Badge variant="outline">{error.tableName}</Badge>}
                {error.columnName && <Badge variant="secondary">{error.columnName}</Badge>}
                {error.line && <Badge>Line {error.line}</Badge>}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <div className="font-medium">{error.error}</div>
                  {error.context && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                      {error.context}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {hasWarnings && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            경고 ({stats.warnings.length})
          </h3>
          {stats.warnings.map((warning, index) => (
            <Alert key={index}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {!hasErrors && !hasWarnings && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>모든 테이블이 성공적으로 파싱되었습니다!</AlertTitle>
          <AlertDescription>
            {stats.totalTables}개의 테이블과 {stats.totalColumns}개의 컬럼이 정상적으로 처리되었습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
