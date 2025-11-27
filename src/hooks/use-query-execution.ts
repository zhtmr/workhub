// Sprint 9: 쿼리 실행 훅

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  supabaseFetch,
  type QueryExecutionResult,
  type QueryExecutionRow,
} from "@/lib/supabase-fetch";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

// Re-export types
export type { QueryExecutionResult, QueryExecutionRow };

export interface ExecuteQueryOptions {
  parameters?: Record<string, unknown>;
  explainOnly?: boolean;
  statementId?: string;
  showToast?: boolean;
}

/**
 * 쿼리 실행 훅
 */
export function useQueryExecution() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<QueryExecutionResult | null>(null);

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  // 쿼리 실행 mutation
  const executeMutation = useMutation({
    mutationFn: async ({
      connectionId,
      sql,
      options,
    }: {
      connectionId: string;
      sql: string;
      options?: ExecuteQueryOptions;
    }) => {
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.executeQuery(
        connectionId,
        sql,
        {
          parameters: options?.parameters,
          explainOnly: options?.explainOnly,
          statementId: options?.statementId,
        },
        accessToken
      );

      if (error) throw error;
      return data as QueryExecutionResult;
    },
    onSuccess: (data, variables) => {
      setLastResult(data);

      // 히스토리 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ["query-history", variables.connectionId],
      });

      const options = variables.options;
      if (options?.showToast !== false) {
        if (data.warning) {
          toast.warning(data.warning);
        } else if (options?.explainOnly) {
          toast.success("실행 계획 조회 완료");
        } else {
          toast.success(`쿼리 실행 완료 (${data.rowCount}행, ${data.executionTimeMs}ms)`);
        }
      }
    },
    onError: (error, variables) => {
      const options = variables.options;
      if (options?.showToast !== false) {
        toast.error(`쿼리 실행 실패: ${error.message}`);
      }
    },
  });

  // 쿼리 실행 함수
  const executeQuery = useCallback(
    async (
      connectionId: string,
      sql: string,
      options?: ExecuteQueryOptions
    ): Promise<QueryExecutionResult> => {
      return executeMutation.mutateAsync({ connectionId, sql, options });
    },
    [executeMutation]
  );

  // EXPLAIN 실행 함수
  const executeExplain = useCallback(
    async (
      connectionId: string,
      sql: string,
      options?: Omit<ExecuteQueryOptions, "explainOnly">
    ): Promise<QueryExecutionResult> => {
      return executeMutation.mutateAsync({
        connectionId,
        sql,
        options: { ...options, explainOnly: true },
      });
    },
    [executeMutation]
  );

  // 결과 초기화
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    executeQuery,
    executeExplain,
    clearResult,
    lastResult,
    isExecuting: executeMutation.isPending,
    error: executeMutation.error as Error | null,
  };
}

/**
 * 쿼리 실행 이력 조회 훅
 */
export function useQueryHistory(connectionId: string | null, limit: number = 20) {
  const { user, session } = useAuth();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  const {
    data: history = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["query-history", connectionId, limit],
    queryFn: async () => {
      if (!connectionId) return [];

      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getQueryHistory(
        connectionId,
        limit,
        accessToken
      );

      if (error) throw error;
      return (data || []) as QueryExecutionRow[];
    },
    enabled: !!connectionId && !!user,
    refetchOnWindowFocus: false,
  });

  return {
    history,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * 결과 데이터를 CSV 문자열로 변환
 */
export function resultToCsv(result: QueryExecutionResult): string {
  if (!result.rows || result.rows.length === 0) {
    return "";
  }

  const columns = result.columns || Object.keys(result.rows[0]);
  const header = columns.join(",");

  const rows = result.rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * CSV 다운로드
 */
export function downloadCsv(result: QueryExecutionResult, filename: string = "query_result.csv") {
  const csv = resultToCsv(result);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
