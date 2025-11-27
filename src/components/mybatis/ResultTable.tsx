// Sprint 9: 쿼리 결과 테이블 컴포넌트

import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type QueryExecutionResult,
  downloadCsv,
} from "@/hooks/use-query-execution";

interface ResultTableProps {
  result: QueryExecutionResult | null;
  isLoading?: boolean;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function ResultTable({ result, isLoading, className }: ResultTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo(() => result?.columns || [], [result?.columns]);
  const rows = useMemo(() => result?.rows || [], [result?.rows]);

  // 정렬된 데이터
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rows, sortColumn, sortDirection]);

  // 페이지네이션
  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const copyToClipboard = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사됨");
  };

  const handleDownloadCsv = () => {
    if (result) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
      downloadCsv(result, `query_result_${timestamp}.csv`);
      toast.success("CSV 파일 다운로드 완료");
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">쿼리 실행 중...</p>
        </CardContent>
      </Card>
    );
  }

  // 결과 없음
  if (!result) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>쿼리를 실행하면 결과가 표시됩니다</p>
        </CardContent>
      </Card>
    );
  }

  // 에러
  if (result.error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-destructive text-base">
            <AlertCircle className="w-4 h-4" />
            쿼리 실행 오류
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-destructive/10 p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
            {result.error}
          </pre>
        </CardContent>
      </Card>
    );
  }

  // 빈 결과
  if (rows.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              쿼리 실행 완료
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {result.executionTimeMs}ms
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>결과 행이 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            쿼리 결과
            <Badge variant="secondary">{result.rowCount}행</Badge>
            {result.warning && (
              <Badge variant="outline" className="text-yellow-600">
                {result.warning}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {result.executionTimeMs}ms
            </Badge>
            <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[200px]">{col}</span>
                      {sortColumn === col ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell className="text-center text-muted-foreground text-xs">
                    {(currentPage - 1) * pageSize + rowIndex + 1}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col} className="font-mono text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="truncate max-w-[300px] cursor-pointer hover:text-primary"
                              onClick={() => copyToClipboard(row[col])}
                            >
                              {formatCellValue(row[col])}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md">
                            <div className="flex items-center gap-2">
                              <Copy className="w-3 h-3" />
                              <span className="text-xs">클릭하여 복사</span>
                            </div>
                            <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                              {formatCellValue(row[col], true)}
                            </pre>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>페이지당:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, sortedRows.length)} / {sortedRows.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 셀 값 포맷팅
 */
function formatCellValue(value: unknown, full: boolean = false): string {
  if (value === null) return "NULL";
  if (value === undefined) return "";

  if (typeof value === "object") {
    const json = JSON.stringify(value, null, full ? 2 : undefined);
    return full ? json : json.slice(0, 100) + (json.length > 100 ? "..." : "");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const str = String(value);
  if (!full && str.length > 100) {
    return str.slice(0, 100) + "...";
  }

  return str;
}
