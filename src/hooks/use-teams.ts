import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseFetch, TeamRow, TeamInsert, TeamMemberRow, TeamMemberInsert } from "@/lib/supabase-fetch";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

export function useTeams() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  // Fetch all teams
  const {
    data: teams = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getTeams(accessToken);
      if (error) throw error;
      return (data || []) as TeamRow[];
    },
    enabled: !!user,
  });

  // Create team mutation
  const createMutation = useMutation({
    mutationFn: async (team: Omit<TeamInsert, "owner_id">) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.createTeam(
        { ...team, owner_id: user.id },
        accessToken
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", user?.id] });
      toast.success("팀이 생성되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "팀 생성 중 오류가 발생했습니다.");
    },
  });

  // Update team mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TeamInsert> }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.updateTeam(id, updates, accessToken);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", user?.id] });
      toast.success("팀 정보가 수정되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "팀 수정 중 오류가 발생했습니다.");
    },
  });

  // Delete team mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { error } = await supabaseFetch.deleteTeam(id, accessToken);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", user?.id] });
      toast.success("팀이 삭제되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "팀 삭제 중 오류가 발생했습니다.");
    },
  });

  // Helper functions
  const createTeam = useCallback(
    async (name: string, description?: string) => {
      return createMutation.mutateAsync({ name, description });
    },
    [createMutation]
  );

  const updateTeam = useCallback(
    async (id: string, updates: Partial<TeamInsert>) => {
      return updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation]
  );

  const deleteTeam = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    teams,
    isLoading,
    error,
    refetch,
    createTeam,
    updateTeam,
    deleteTeam,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for team members
export function useTeamMembers(teamId: string | null) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  // Fetch team members
  const {
    data: members = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getTeamMembers(teamId, accessToken);
      if (error) throw error;
      return (data || []) as TeamMemberRow[];
    },
    enabled: !!teamId && !!user,
  });

  // Add member mutation
  const addMutation = useMutation({
    mutationFn: async (member: Omit<TeamMemberInsert, "team_id" | "invited_by">) => {
      if (!user || !teamId) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.addTeamMember(
        { ...member, team_id: teamId, invited_by: user.id },
        accessToken
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("멤버가 추가되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "멤버 추가 중 오류가 발생했습니다.");
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user || !teamId) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { error } = await supabaseFetch.removeTeamMember(teamId, userId, accessToken);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("멤버가 제거되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "멤버 제거 중 오류가 발생했습니다.");
    },
  });

  const addMember = useCallback(
    async (userId: string, role?: string) => {
      return addMutation.mutateAsync({ user_id: userId, role });
    },
    [addMutation]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      return removeMutation.mutateAsync(userId);
    },
    [removeMutation]
  );

  return {
    members,
    isLoading,
    error,
    refetch,
    addMember,
    removeMember,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
