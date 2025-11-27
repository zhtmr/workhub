// Sprint 8: DB 연결 관리 훅 (direct fetch 방식)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supabaseFetch,
  type DbConnectionRow,
  type DbConnectionInsert,
  type DbType,
} from "@/lib/supabase-fetch";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

// Re-export types for convenience
export type { DbType, DbConnectionRow as DbConnection, DbConnectionInsert as InsertDbConnection };

export interface UpdateDbConnection {
  name?: string;
  description?: string | null;
  db_type?: DbType;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password_encrypted?: string | null;
  ssl_mode?: string;
  connection_options?: Record<string, unknown>;
  is_read_only?: boolean;
  is_active?: boolean;
  last_tested_at?: string | null;
  last_test_result?: boolean | null;
}

/**
 * DB 연결 목록 조회 및 관리 훅
 */
export function useDbConnections(teamId: string | null) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  // 연결 목록 조회
  const {
    data: connections = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["db-connections", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getDbConnections(teamId, accessToken);

      if (error) throw error;
      return (data || []) as DbConnectionRow[];
    },
    enabled: !!teamId && !!user,
  });

  // 연결 생성
  const createMutation = useMutation({
    mutationFn: async (connection: DbConnectionInsert) => {
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.createDbConnection(
        {
          ...connection,
          created_by: user?.id,
        },
        accessToken
      );

      if (error) throw error;
      return data as DbConnectionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-connections", teamId] });
      toast.success("DB 연결이 생성되었습니다");
    },
    onError: (error) => {
      toast.error(`생성 실패: ${error.message}`);
    },
  });

  // 연결 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates, silent }: { id: string; updates: UpdateDbConnection; silent?: boolean }) => {
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.updateDbConnection(id, updates, accessToken);

      if (error) throw error;
      return { data: data as DbConnectionRow, silent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["db-connections", teamId] });
      if (!result.silent) {
        toast.success("DB 연결이 수정되었습니다");
      }
    },
    onError: (error) => {
      toast.error(`수정 실패: ${error.message}`);
    },
  });

  // 연결 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const accessToken = getAccessToken();
      const { error } = await supabaseFetch.deleteDbConnection(id, accessToken);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-connections", teamId] });
      toast.success("DB 연결이 삭제되었습니다");
    },
    onError: (error) => {
      toast.error(`삭제 실패: ${error.message}`);
    },
  });

  // 연결 테스트 (Edge Function 호출)
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.testDbConnection(id, accessToken);

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["db-connections", teamId] });
      if (data?.success) {
        toast.success(data.message || "연결 성공");
      } else {
        toast.error(data?.message || "연결 실패");
      }
    },
    onError: (error) => {
      toast.error(`연결 테스트 실패: ${error.message}`);
    },
  });

  return {
    connections,
    isLoading,
    error: error as Error | null,
    refetch,
    createConnection: createMutation.mutateAsync,
    updateConnection: (id: string, updates: UpdateDbConnection, options?: { silent?: boolean }) =>
      updateMutation.mutateAsync({ id, updates, silent: options?.silent }),
    deleteConnection: deleteMutation.mutateAsync,
    testConnection: testMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,
  };
}

/**
 * DB 타입별 기본 포트
 */
export const DEFAULT_PORTS: Record<DbType, number> = {
  postgresql: 5432,
  mysql: 3306,
  oracle: 1521,
  mssql: 1433,
};

/**
 * 내부/로컬 IP 주소 감지
 */
export function isPrivateOrLocalHost(host: string): { isPrivate: boolean; reason: string } {
  const lowerHost = host.toLowerCase().trim();

  // localhost 체크
  if (lowerHost === "localhost" || lowerHost === "127.0.0.1" || lowerHost === "::1") {
    return { isPrivate: true, reason: "localhost는 클라우드에서 테스트할 수 없습니다" };
  }

  // IPv4 내부 IP 대역 체크
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);

  if (match) {
    const [, a, b] = match.map(Number);

    // 10.0.0.0 - 10.255.255.255 (Class A private)
    if (a === 10) {
      return { isPrivate: true, reason: "내부망 IP(10.x.x.x)는 클라우드에서 테스트할 수 없습니다" };
    }

    // 172.16.0.0 - 172.31.255.255 (Class B private)
    if (a === 172 && b >= 16 && b <= 31) {
      return { isPrivate: true, reason: "내부망 IP(172.16-31.x.x)는 클라우드에서 테스트할 수 없습니다" };
    }

    // 192.168.0.0 - 192.168.255.255 (Class C private)
    if (a === 192 && b === 168) {
      return { isPrivate: true, reason: "내부망 IP(192.168.x.x)는 클라우드에서 테스트할 수 없습니다" };
    }

    // 169.254.0.0 - 169.254.255.255 (Link-local)
    if (a === 169 && b === 254) {
      return { isPrivate: true, reason: "Link-local IP는 테스트할 수 없습니다" };
    }
  }

  return { isPrivate: false, reason: "" };
}

/**
 * DB 타입 레이블
 */
export const DB_TYPE_LABELS: Record<DbType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  oracle: "Oracle",
  mssql: "SQL Server",
};
