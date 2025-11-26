import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  createPivotTable,
  formatNumber,
  type AggregateFunction,
} from "@/utils/statistics";
import type { ParsedColumn } from "@/utils/dataParser";

interface PivotTableProps {
  columns: ParsedColumn[];
  rows: Record<string, unknown>[];
  className?: string;
}

const aggregateFunctions: { value: AggregateFunction; label: string }[] = [
  { value: "sum", label: "합계" },
  { value: "count", label: "개수" },
  { value: "average", label: "평균" },
  { value: "min", label: "최솟값" },
  { value: "max", label: "최댓값" },
];

export function PivotTable({ columns, rows, className }: PivotTableProps) {
  const [rowField, setRowField] = useState<string>("");
  const [columnField, setColumnField] = useState<string>("");
  const [valueField, setValueField] = useState<string>("");
  const [aggregateFn, setAggregateFn] = useState<AggregateFunction>("sum");

  const numericColumns = useMemo(
    () => columns.filter((col) => col.type === "number"),
    [columns]
  );

  const pivotResult = useMemo(() => {
    if (!rowField || !columnField || !valueField) {
      return null;
    }

    return createPivotTable(rows, rowField, columnField, valueField, aggregateFn);
  }, [rows, rowField, columnField, valueField, aggregateFn]);

  if (columns.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <p className="text-muted-foreground">데이터가 없습니다.</p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 설정 패널 */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">피벗 테이블 설정</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 행 필드 */}
          <div className="space-y-2">
            <Label>행 필드</Label>
            <Select value={rowField} onValueChange={setRowField}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.key} value={col.key}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 열 필드 */}
          <div className="space-y-2">
            <Label>열 필드</Label>
            <Select value={columnField} onValueChange={setColumnField}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.key} value={col.key}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 값 필드 */}
          <div className="space-y-2">
            <Label>값 필드</Label>
            <Select value={valueField} onValueChange={setValueField}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.length > 0 ? (
                  numericColumns.map((col) => (
                    <SelectItem key={col.key} value={col.key}>
                      {col.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    숫자형 컬럼 없음
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 집계 함수 */}
          <div className="space-y-2">
            <Label>집계 함수</Label>
            <Select
              value={aggregateFn}
              onValueChange={(v) => setAggregateFn(v as AggregateFunction)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aggregateFunctions.map((fn) => (
                  <SelectItem key={fn.value} value={fn.value}>
                    {fn.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 결과 테이블 */}
      {pivotResult ? (
        <Card className="overflow-hidden">
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="font-bold bg-muted/50">
                    {rowField} / {columnField}
                  </TableHead>
                  {pivotResult.columnLabels.map((col) => (
                    <TableHead key={col} className="text-right bg-muted/50">
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold bg-muted">
                    합계
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotResult.rowLabels.map((row) => (
                  <TableRow key={row}>
                    <TableCell className="font-medium bg-muted/30">
                      {row}
                    </TableCell>
                    {pivotResult.columnLabels.map((col) => (
                      <TableCell key={col} className="text-right">
                        {formatNumber(
                          pivotResult.data.get(row)?.get(col) || 0
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium bg-muted/30">
                      {formatNumber(pivotResult.rowTotals.get(row) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* 합계 행 */}
                <TableRow className="font-bold">
                  <TableCell className="bg-muted">합계</TableCell>
                  {pivotResult.columnLabels.map((col) => (
                    <TableCell key={col} className="text-right bg-muted/50">
                      {formatNumber(pivotResult.columnTotals.get(col) || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right bg-muted">
                    {formatNumber(pivotResult.grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            행, 열, 값 필드를 선택하면 피벗 테이블이 생성됩니다.
          </p>
        </Card>
      )}
    </div>
  );
}
