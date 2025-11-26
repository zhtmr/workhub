import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParsedColumn } from "@/utils/dataParser";

interface DataTableProps {
  columns: ParsedColumn[];
  rows: Record<string, unknown>[];
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable({ columns, rows, className }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  // 필터링된 데이터
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const [key, filterValue] of Object.entries(filters)) {
        if (!filterValue) continue;
        const cellValue = String(row[key] ?? "").toLowerCase();
        if (!cellValue.includes(filterValue.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rows, filters]);

  // 정렬된 데이터
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRows;

    return [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, sortColumn, sortDirection]);

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

  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4" />;
    }
    return <ArrowDown className="w-4 h-4" />;
  };

  if (columns.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <p className="text-muted-foreground">데이터가 없습니다.</p>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* 툴바 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Search className="w-4 h-4 mr-2" />
            필터
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              필터 초기화
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {sortedRows.length}개 중 {paginatedRows.length}개 표시
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-20 h-8">
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
      </div>

      {/* 필터 행 */}
      {showFilters && (
        <div className="flex gap-2 p-4 border-b bg-muted/30 overflow-x-auto">
          {columns.map((col) => (
            <Input
              key={col.key}
              placeholder={col.label}
              value={filters[col.key] || ""}
              onChange={(e) => handleFilterChange(col.key, e.target.value)}
              className="min-w-[120px] h-8 text-sm"
            />
          ))}
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-auto max-h-[500px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{col.label}</span>
                    {getSortIcon(col.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="text-center text-muted-foreground">
                  {(currentPage - 1) * pageSize + index + 1}
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} className="max-w-[200px] truncate">
                    {String(row[col.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            페이지 {currentPage} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              처음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              마지막
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
