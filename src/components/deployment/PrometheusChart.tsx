import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, AlertCircle, FlaskConical } from "lucide-react";
import { usePredefinedMetric } from "@/hooks/use-prometheus-metrics";
import {
  TIME_RANGES,
  PREDEFINED_QUERIES,
  type TimeRange,
  type PredefinedQuery,
} from "@/utils/prometheusApi";
import type { DeploymentProject } from "@/types/deployment";

interface PrometheusChartProps {
  project: DeploymentProject | null;
  metric?: PredefinedQuery;
  title?: string;
  unit?: string;
  height?: number;
  demoMode?: boolean;
}

// 데모 모드용 모의 데이터 생성
function generateDemoData(metric: PredefinedQuery, timeRange: TimeRange): { time: string; value: number }[] {
  const now = Date.now();
  const minutes = TIME_RANGES[timeRange].minutes;
  const points = Math.min(30, minutes); // 최대 30개 포인트
  const interval = (minutes * 60 * 1000) / points;

  // 메트릭별 기본값 및 변동 범위
  const metricRanges: Record<PredefinedQuery, { base: number; variance: number }> = {
    cpu_usage: { base: 35, variance: 25 },
    cpu_usage_by_container: { base: 20, variance: 15 },
    memory_usage: { base: 512, variance: 200 },
    memory_usage_by_container: { base: 256, variance: 100 },
    http_requests_total: { base: 150, variance: 80 },
    http_request_duration: { base: 0.2, variance: 0.15 },
    jvm_memory_used: { base: 384, variance: 128 },
    jvm_gc_pause: { base: 0.05, variance: 0.03 },
    jvm_threads: { base: 50, variance: 20 },
    db_connections_active: { base: 10, variance: 8 },
    db_connections_idle: { base: 5, variance: 4 },
    error_rate: { base: 0.5, variance: 1.5 },
  };

  const range = metricRanges[metric] || { base: 50, variance: 30 };

  return Array.from({ length: points }, (_, i) => {
    const timestamp = now - (points - 1 - i) * interval;
    // 부드러운 변동을 위한 사인파 + 노이즈
    const trend = Math.sin((i / points) * Math.PI * 2) * (range.variance * 0.5);
    const noise = (Math.random() - 0.5) * range.variance;
    const value = Math.max(0, range.base + trend + noise);

    return {
      time: new Date(timestamp).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: Number(value.toFixed(2)),
    };
  });
}

// 메트릭별 설정
const METRIC_CONFIG: Record<PredefinedQuery, { title: string; unit: string; color: string }> = {
  cpu_usage: { title: "CPU 사용률", unit: "%", color: "#8884d8" },
  cpu_usage_by_container: { title: "컨테이너별 CPU", unit: "%", color: "#8884d8" },
  memory_usage: { title: "메모리 사용량", unit: "MB", color: "#82ca9d" },
  memory_usage_by_container: { title: "컨테이너별 메모리", unit: "MB", color: "#82ca9d" },
  http_requests_total: { title: "HTTP 요청 수", unit: "req/s", color: "#ffc658" },
  http_request_duration: { title: "응답 시간 (P95)", unit: "s", color: "#ff7300" },
  jvm_memory_used: { title: "JVM 힙 메모리", unit: "MB", color: "#82ca9d" },
  jvm_gc_pause: { title: "GC 일시정지", unit: "s", color: "#ff7300" },
  jvm_threads: { title: "JVM 스레드 수", unit: "", color: "#8884d8" },
  db_connections_active: { title: "활성 DB 연결", unit: "", color: "#ffc658" },
  db_connections_idle: { title: "유휴 DB 연결", unit: "", color: "#82ca9d" },
  error_rate: { title: "에러율", unit: "%", color: "#ff4444" },
};

// 색상 팔레트 (여러 시리즈용)
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#ff4444",
  "#00C49F",
  "#FFBB28",
  "#0088FE",
];

export function PrometheusChart({
  project,
  metric = "cpu_usage",
  title,
  unit,
  height = 300,
  demoMode = false,
}: PrometheusChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");

  const config = METRIC_CONFIG[metric];
  const displayTitle = title || config.title;
  const displayUnit = unit || config.unit;

  // 실제 데이터 조회 (demoMode가 아닐 때만)
  const { series, isLoading, error, refetch } = usePredefinedMetric(
    demoMode ? null : project,
    metric,
    {
      timeRange,
      refetchInterval: 60000, // 1분마다 갱신
      enabled: !demoMode && !!project,
    }
  );

  // 데모 데이터 생성 (demoMode일 때)
  const demoData = useMemo(() => {
    if (!demoMode) return [];
    return generateDemoData(metric, timeRange);
  }, [demoMode, metric, timeRange]);

  // 차트 데이터 변환
  const chartData = useMemo(() => {
    // 데모 모드
    if (demoMode) {
      return demoData;
    }

    // 실제 데이터
    if (!series.length) return [];

    // 모든 시리즈의 타임스탬프 통합
    const timestamps = new Set<number>();
    series.forEach((s) => {
      s.data.forEach((d) => timestamps.add(d.timestamp.getTime()));
    });

    // 정렬된 타임스탬프 배열
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    // 각 타임스탬프에 대해 모든 시리즈 값 결합
    return sortedTimestamps.map((ts) => {
      const point: Record<string, number | string> = {
        time: new Date(ts).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: ts,
      };

      series.forEach((s, idx) => {
        const dataPoint = s.data.find((d) => d.timestamp.getTime() === ts);
        const label = Object.values(s.labels).join(" ") || `Series ${idx + 1}`;
        point[label] = dataPoint ? Number(dataPoint.value.toFixed(2)) : 0;
      });

      return point;
    });
  }, [demoMode, demoData, series]);

  // 시리즈 레이블 추출
  const seriesLabels = demoMode
    ? ["value"]
    : series.map((s, idx) => Object.values(s.labels).join(" ") || `Series ${idx + 1}`);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{displayTitle}</CardTitle>
            {demoMode && (
              <Badge variant="outline" className="text-xs gap-1">
                <FlaskConical className="w-3 h-3" />
                데모
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_RANGES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!demoMode && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!demoMode && isLoading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !demoMode && error ? (
          <div
            className="flex flex-col items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">데이터를 불러올 수 없습니다</p>
            <p className="text-xs mt-1">{error.message}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            <p className="text-sm">데이터 없음</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: "#666" }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: "#666" }}
                unit={displayUnit ? ` ${displayUnit}` : ""}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              {seriesLabels.length > 1 && <Legend />}
              {seriesLabels.map((label, idx) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 여러 메트릭을 그리드로 표시하는 컴포넌트
 */
interface PrometheusGridProps {
  project: DeploymentProject | null;
  metrics?: PredefinedQuery[];
  demoMode?: boolean;
}

export function PrometheusMetricsGrid({
  project,
  metrics = ["cpu_usage", "memory_usage", "http_requests_total", "error_rate"],
  demoMode = false,
}: PrometheusGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {metrics.map((metric) => (
        <PrometheusChart
          key={metric}
          project={project}
          metric={metric}
          height={200}
          demoMode={demoMode}
        />
      ))}
    </div>
  );
}

/**
 * 미리 정의된 메트릭 목록
 */
export function MetricSelector({
  value,
  onChange,
}: {
  value: PredefinedQuery;
  onChange: (metric: PredefinedQuery) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PredefinedQuery)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="메트릭 선택" />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(PREDEFINED_QUERIES).map((key) => (
          <SelectItem key={key} value={key}>
            {METRIC_CONFIG[key as PredefinedQuery]?.title || key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
