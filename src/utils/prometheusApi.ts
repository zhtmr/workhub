// Prometheus API Client
// Sprint 8: Prometheus 메트릭 조회

export interface PrometheusConfig {
  endpoint: string;
  authToken?: string;
}

export interface PrometheusQueryResult {
  status: "success" | "error";
  data: {
    resultType: "matrix" | "vector" | "scalar" | "string";
    result: PrometheusMetric[];
  };
  error?: string;
  errorType?: string;
}

export interface PrometheusMetric {
  metric: Record<string, string>;
  values?: [number, string][]; // [timestamp, value] for matrix
  value?: [number, string]; // [timestamp, value] for vector
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface MetricSeries {
  labels: Record<string, string>;
  data: MetricDataPoint[];
}

// 미리 정의된 메트릭 쿼리
export const PREDEFINED_QUERIES = {
  // CPU 관련
  cpu_usage: 'avg(rate(process_cpu_seconds_total[5m])) * 100',
  cpu_usage_by_container: 'sum(rate(container_cpu_usage_seconds_total[5m])) by (container_name) * 100',

  // 메모리 관련
  memory_usage: 'process_resident_memory_bytes / 1024 / 1024',
  memory_usage_by_container: 'container_memory_usage_bytes / 1024 / 1024',

  // HTTP 요청 관련
  http_requests_total: 'sum(rate(http_requests_total[5m])) by (status_code)',
  http_request_duration: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))',

  // JVM 관련 (Spring Boot)
  jvm_memory_used: 'jvm_memory_used_bytes{area="heap"} / 1024 / 1024',
  jvm_gc_pause: 'rate(jvm_gc_pause_seconds_sum[5m])',
  jvm_threads: 'jvm_threads_live_threads',

  // 데이터베이스 관련
  db_connections_active: 'hikaricp_connections_active',
  db_connections_idle: 'hikaricp_connections_idle',

  // 커스텀 비즈니스 메트릭
  error_rate: 'sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100',
} as const;

export type PredefinedQuery = keyof typeof PREDEFINED_QUERIES;

class PrometheusClient {
  private config: PrometheusConfig;

  constructor(config: PrometheusConfig) {
    this.config = config;
  }

  private async fetch(path: string, params: Record<string, string> = {}): Promise<Response> {
    const url = new URL(path, this.config.endpoint);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const headers: HeadersInit = {
      "Accept": "application/json",
    };

    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }

    return fetch(url.toString(), { headers });
  }

  /**
   * 즉시 쿼리 실행 (현재 값)
   */
  async query(query: string): Promise<{ data: PrometheusQueryResult | null; error: Error | null }> {
    try {
      const response = await this.fetch("/api/v1/query", { query });

      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: new Error(`Prometheus query failed: ${text}`) };
      }

      const data: PrometheusQueryResult = await response.json();

      if (data.status === "error") {
        return { data: null, error: new Error(data.error || "Unknown Prometheus error") };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }

  /**
   * 범위 쿼리 실행 (시계열 데이터)
   */
  async queryRange(
    query: string,
    start: Date,
    end: Date,
    step: string = "60s"
  ): Promise<{ data: MetricSeries[] | null; error: Error | null }> {
    try {
      const response = await this.fetch("/api/v1/query_range", {
        query,
        start: (start.getTime() / 1000).toString(),
        end: (end.getTime() / 1000).toString(),
        step,
      });

      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: new Error(`Prometheus query failed: ${text}`) };
      }

      const result: PrometheusQueryResult = await response.json();

      if (result.status === "error") {
        return { data: null, error: new Error(result.error || "Unknown Prometheus error") };
      }

      // matrix 결과를 MetricSeries로 변환
      const series: MetricSeries[] = result.data.result.map((metric) => ({
        labels: metric.metric,
        data: (metric.values || []).map(([timestamp, value]) => ({
          timestamp: new Date(timestamp * 1000),
          value: parseFloat(value),
        })),
      }));

      return { data: series, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<{ success: boolean; error: Error | null }> {
    try {
      const response = await this.fetch("/api/v1/status/config");

      if (!response.ok) {
        return { success: false, error: new Error(`Connection failed: ${response.status}`) };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error("Connection failed") };
    }
  }

  /**
   * 사용 가능한 메트릭 목록 조회
   */
  async getMetricNames(): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const response = await this.fetch("/api/v1/label/__name__/values");

      if (!response.ok) {
        return { data: null, error: new Error("Failed to fetch metric names") };
      }

      const result = await response.json();
      return { data: result.data || [], error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }
}

/**
 * Prometheus 클라이언트 생성
 */
export function createPrometheusClient(config: PrometheusConfig): PrometheusClient {
  return new PrometheusClient(config);
}

/**
 * 미리 정의된 쿼리 실행
 */
export async function queryPredefinedMetric(
  client: PrometheusClient,
  queryName: PredefinedQuery,
  start: Date,
  end: Date,
  step: string = "60s"
): Promise<{ data: MetricSeries[] | null; error: Error | null }> {
  const query = PREDEFINED_QUERIES[queryName];
  return client.queryRange(query, start, end, step);
}

/**
 * 시간 범위 프리셋
 */
export const TIME_RANGES = {
  "15m": { label: "15분", minutes: 15 },
  "1h": { label: "1시간", minutes: 60 },
  "6h": { label: "6시간", minutes: 360 },
  "24h": { label: "24시간", minutes: 1440 },
  "7d": { label: "7일", minutes: 10080 },
} as const;

export type TimeRange = keyof typeof TIME_RANGES;

export function getTimeRange(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - TIME_RANGES[range].minutes * 60 * 1000);
  return { start, end };
}

/**
 * Step 자동 계산 (데이터 포인트 수 기반)
 */
export function calculateStep(start: Date, end: Date, maxPoints: number = 100): string {
  const durationSeconds = (end.getTime() - start.getTime()) / 1000;
  const stepSeconds = Math.ceil(durationSeconds / maxPoints);

  if (stepSeconds < 60) return `${stepSeconds}s`;
  if (stepSeconds < 3600) return `${Math.ceil(stepSeconds / 60)}m`;
  return `${Math.ceil(stepSeconds / 3600)}h`;
}
