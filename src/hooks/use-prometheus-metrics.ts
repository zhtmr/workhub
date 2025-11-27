// Sprint 8: Prometheus 메트릭 조회 훅

import { useQuery } from "@tanstack/react-query";
import {
  createPrometheusClient,
  getTimeRange,
  calculateStep,
  type TimeRange,
  type MetricSeries,
  type PredefinedQuery,
  PREDEFINED_QUERIES,
} from "@/utils/prometheusApi";
import type { DeploymentProject } from "@/types/deployment";

interface UsePrometheusMetricsOptions {
  timeRange?: TimeRange;
  enabled?: boolean;
  refetchInterval?: number;
}

interface PrometheusMetricsResult {
  series: MetricSeries[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 단일 메트릭 조회 훅
 */
export function usePrometheusMetric(
  project: DeploymentProject | null,
  query: string,
  options: UsePrometheusMetricsOptions = {}
): PrometheusMetricsResult {
  const { timeRange = "1h", enabled = true, refetchInterval } = options;

  const hasConfig = !!(project?.prometheus_endpoint);

  const queryResult = useQuery({
    queryKey: ["prometheus", project?.id, query, timeRange],
    queryFn: async () => {
      if (!project?.prometheus_endpoint) {
        throw new Error("Prometheus endpoint not configured");
      }

      const client = createPrometheusClient({
        endpoint: project.prometheus_endpoint,
        authToken: project.prometheus_auth_token_encrypted || undefined,
      });

      const { start, end } = getTimeRange(timeRange);
      const step = calculateStep(start, end);

      const { data, error } = await client.queryRange(query, start, end, step);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && hasConfig,
    refetchInterval,
    staleTime: 30000, // 30초
  });

  return {
    series: queryResult.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * 미리 정의된 메트릭 조회 훅
 */
export function usePredefinedMetric(
  project: DeploymentProject | null,
  metricName: PredefinedQuery,
  options: UsePrometheusMetricsOptions = {}
): PrometheusMetricsResult {
  const query = PREDEFINED_QUERIES[metricName];
  return usePrometheusMetric(project, query, options);
}

/**
 * 여러 메트릭 동시 조회
 */
export function useMultipleMetrics(
  project: DeploymentProject | null,
  metrics: PredefinedQuery[],
  options: UsePrometheusMetricsOptions = {}
): Record<PredefinedQuery, PrometheusMetricsResult> {
  const results: Record<string, PrometheusMetricsResult> = {};

  for (const metric of metrics) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[metric] = usePredefinedMetric(project, metric, options);
  }

  return results as Record<PredefinedQuery, PrometheusMetricsResult>;
}

/**
 * Prometheus 연결 테스트 훅
 */
export function usePrometheusConnection(project: DeploymentProject | null) {
  return useQuery({
    queryKey: ["prometheus-connection", project?.id],
    queryFn: async () => {
      if (!project?.prometheus_endpoint) {
        throw new Error("Prometheus endpoint not configured");
      }

      const client = createPrometheusClient({
        endpoint: project.prometheus_endpoint,
        authToken: project.prometheus_auth_token_encrypted || undefined,
      });

      const { success, error } = await client.testConnection();

      if (!success) throw error;
      return true;
    },
    enabled: !!project?.prometheus_endpoint,
    retry: false,
    staleTime: 60000, // 1분
  });
}

/**
 * 사용 가능한 메트릭 목록 조회
 */
export function useMetricNames(project: DeploymentProject | null) {
  return useQuery({
    queryKey: ["prometheus-metrics", project?.id],
    queryFn: async () => {
      if (!project?.prometheus_endpoint) {
        throw new Error("Prometheus endpoint not configured");
      }

      const client = createPrometheusClient({
        endpoint: project.prometheus_endpoint,
        authToken: project.prometheus_auth_token_encrypted || undefined,
      });

      const { data, error } = await client.getMetricNames();

      if (error) throw error;
      return data || [];
    },
    enabled: !!project?.prometheus_endpoint,
    staleTime: 300000, // 5분
  });
}
