import { useMemo } from "react";
import { Hash, Sigma, TrendingUp, ArrowDown, ArrowUp, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { calculateStatistics, formatNumber } from "@/utils/statistics";
import {
  extractNumericValues,
  getNumericColumns,
  type ParsedColumn,
} from "@/utils/dataParser";

interface DataStatsProps {
  columns: ParsedColumn[];
  rows: Record<string, unknown>[];
  selectedColumn?: string;
  onColumnChange?: (column: string) => void;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ label, value, icon, description }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
    </Card>
  );
}

export function DataStats({
  columns,
  rows,
  selectedColumn,
  onColumnChange,
  className,
}: DataStatsProps) {
  const numericColumns = useMemo(() => getNumericColumns(columns), [columns]);

  const activeColumn = selectedColumn || numericColumns[0]?.key;

  const stats = useMemo(() => {
    if (!activeColumn) return null;

    const column = columns.find((c) => c.key === activeColumn);
    if (!column) return null;

    const values = extractNumericValues(rows, activeColumn);
    return calculateStatistics(values, column.key, column.label);
  }, [rows, columns, activeColumn]);

  if (numericColumns.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <p className="text-muted-foreground">
          숫자형 컬럼이 없습니다. 통계를 계산할 수 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 컬럼 선택 */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">통계 컬럼:</span>
        <Select value={activeColumn} onValueChange={onColumnChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="컬럼 선택" />
          </SelectTrigger>
          <SelectContent>
            {numericColumns.map((col) => (
              <SelectItem key={col.key} value={col.key}>
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 통계 카드 그리드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="개수"
            value={stats.count}
            icon={<Hash className="w-5 h-5" />}
            description="유효한 값의 개수"
          />
          <StatCard
            label="합계"
            value={stats.sum}
            icon={<Sigma className="w-5 h-5" />}
          />
          <StatCard
            label="평균"
            value={stats.mean}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            label="최솟값"
            value={stats.min}
            icon={<ArrowDown className="w-5 h-5" />}
          />
          <StatCard
            label="최댓값"
            value={stats.max}
            icon={<ArrowUp className="w-5 h-5" />}
          />
          <StatCard
            label="표준편차"
            value={stats.standardDeviation}
            icon={<Activity className="w-5 h-5" />}
          />
        </div>
      )}

      {/* 추가 통계 */}
      {stats && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">추가 통계</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">중앙값:</span>
              <span className="ml-2 font-medium">{formatNumber(stats.median)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">분산:</span>
              <span className="ml-2 font-medium">{formatNumber(stats.variance)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">범위:</span>
              <span className="ml-2 font-medium">
                {formatNumber(stats.max - stats.min)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">컬럼:</span>
              <span className="ml-2 font-medium">{stats.columnLabel}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
