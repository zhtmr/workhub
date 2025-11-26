import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseFetch } from '@/lib/supabase-fetch';
import { useAuth } from '@/providers/AuthProvider';
import type { DdlHistory, InsertDdlHistory } from '@/types/database';
import { toast } from 'sonner';

export function useHistory() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  const {
    data: historyList = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ddl-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getHistory(user.id, accessToken);

      if (error) throw error;
      return (data || []) as DdlHistory[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: Omit<InsertDdlHistory, 'user_id'>) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const accessToken = getAccessToken();
      const insertPayload = {
        ...entry,
        user_id: user.id,
      };

      const { data, error } = await supabaseFetch.insertHistory(insertPayload, accessToken);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ddl-history', user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const accessToken = getAccessToken();
      const { error } = await supabaseFetch.deleteHistory(id, user.id, accessToken);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ddl-history', user?.id] });
      toast.success('히스토리가 삭제되었습니다.');
    },
    onError: () => {
      toast.error('삭제 중 오류가 발생했습니다.');
    },
  });

  const saveToHistory = useCallback(
    async (params: {
      title?: string;
      ddlContent: string;
      dbType: string;
      tableCount: number;
      columnCount: number;
      parsedResult?: unknown;
    }) => {
      if (!user) return null;

      const insertData = {
        title: params.title || `DDL 변환 - ${new Date().toLocaleDateString('ko-KR')}`,
        ddl_content: params.ddlContent,
        db_type: params.dbType,
        table_count: params.tableCount,
        column_count: params.columnCount,
        parsed_result: params.parsedResult as any,
      };

      try {
        const result = await saveMutation.mutateAsync(insertData);
        return result;
      } catch {
        return null;
      }
    },
    [user, saveMutation]
  );

  const deleteHistory = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    historyList,
    isLoading,
    error,
    refetch,
    saveToHistory,
    deleteHistory,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
