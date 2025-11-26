import { BarChart3, LineChart, PieChart, ScatterChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { ParsedColumn } from "@/utils/dataParser";

export type ChartType = "bar" | "line" | "pie" | "scatter";

export interface ChartConfig {
  type: ChartType;
  xAxis: string;
  yAxis: string;
  title?: string;
}

interface ChartBuilderProps {
  columns: ParsedColumn[];
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
  className?: string;
}

const chartTypes: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: "bar", label: "막대", icon: <BarChart3 className="w-4 h-4" /> },
  { value: "line", label: "라인", icon: <LineChart className="w-4 h-4" /> },
  { value: "pie", label: "파이", icon: <PieChart className="w-4 h-4" /> },
  { value: "scatter", label: "스캐터", icon: <ScatterChart className="w-4 h-4" /> },
];

export function ChartBuilder({
  columns,
  config,
  onChange,
  className,
}: ChartBuilderProps) {
  const numericColumns = columns.filter((col) => col.type === "number");
  const allColumns = columns;

  const handleTypeChange = (type: string) => {
    if (type) {
      onChange({ ...config, type: type as ChartType });
    }
  };

  const handleXAxisChange = (value: string) => {
    onChange({ ...config, xAxis: value });
  };

  const handleYAxisChange = (value: string) => {
    onChange({ ...config, yAxis: value });
  };

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <h3 className="font-medium">차트 설정</h3>

      {/* 차트 타입 선택 */}
      <div className="space-y-2">
        <Label>차트 유형</Label>
        <ToggleGroup
          type="single"
          value={config.type}
          onValueChange={handleTypeChange}
          className="justify-start"
        >
          {chartTypes.map((chart) => (
            <ToggleGroupItem
              key={chart.value}
              value={chart.value}
              aria-label={chart.label}
              className="gap-2"
            >
              {chart.icon}
              <span className="hidden sm:inline">{chart.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* X축 선택 */}
      <div className="space-y-2">
        <Label htmlFor="x-axis">
          {config.type === "pie" ? "카테고리" : "X축"}
        </Label>
        <Select value={config.xAxis} onValueChange={handleXAxisChange}>
          <SelectTrigger id="x-axis">
            <SelectValue placeholder="컬럼 선택" />
          </SelectTrigger>
          <SelectContent>
            {allColumns.map((col) => (
              <SelectItem key={col.key} value={col.key}>
                {col.label} ({col.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Y축 선택 */}
      <div className="space-y-2">
        <Label htmlFor="y-axis">
          {config.type === "pie" ? "값" : "Y축"}
        </Label>
        <Select value={config.yAxis} onValueChange={handleYAxisChange}>
          <SelectTrigger id="y-axis">
            <SelectValue placeholder="컬럼 선택" />
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
        {numericColumns.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Y축에는 숫자형 컬럼이 필요합니다.
          </p>
        )}
      </div>
    </Card>
  );
}
