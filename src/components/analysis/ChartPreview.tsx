import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "./ChartBuilder";
import { groupAndAggregate } from "@/utils/statistics";

interface ChartPreviewProps {
  rows: Record<string, unknown>[];
  config: ChartConfig;
  className?: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#a4de6c",
];

export function ChartPreview({ rows, config, className }: ChartPreviewProps) {
  const chartData = useMemo(() => {
    if (!config.xAxis || !config.yAxis || rows.length === 0) {
      return [];
    }

    if (config.type === "scatter") {
      // 스캐터: 원본 데이터 그대로 사용
      return rows
        .map((row) => ({
          x: Number(row[config.xAxis]) || 0,
          y: Number(row[config.yAxis]) || 0,
        }))
        .filter((d) => !isNaN(d.x) && !isNaN(d.y));
    }

    // 막대/라인/파이: X축 기준으로 그룹화
    const grouped = groupAndAggregate(rows, config.xAxis, config.yAxis, "sum");

    return Array.from(grouped.entries())
      .map(([name, value]) => ({
        name: String(name),
        value: value,
      }))
      .slice(0, 50); // 최대 50개로 제한
  }, [rows, config]);

  if (!config.xAxis || !config.yAxis) {
    return (
      <Card className={cn("p-8 flex items-center justify-center h-[400px]", className)}>
        <p className="text-muted-foreground">
          X축과 Y축을 선택하면 차트가 표시됩니다.
        </p>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={cn("p-8 flex items-center justify-center h-[400px]", className)}>
        <p className="text-muted-foreground">표시할 데이터가 없습니다.</p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 h-[400px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {config.type === "bar" ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Bar
              dataKey="value"
              name={config.yAxis}
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        ) : config.type === "line" ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name={config.yAxis}
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))" }}
            />
          </LineChart>
        ) : config.type === "pie" ? (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
          </PieChart>
        ) : (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="x"
              name={config.xAxis}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              dataKey="y"
              name={config.yAxis}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Scatter
              name={`${config.xAxis} vs ${config.yAxis}`}
              data={chartData}
              fill="hsl(var(--chart-1))"
            />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}
