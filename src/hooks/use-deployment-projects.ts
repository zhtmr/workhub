import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supabaseFetch,
  DeploymentProjectRow,
  DeploymentProjectInsert,
  PipelineEventRow,
} from "@/lib/supabase-fetch";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import type { PipelineStats } from "@/types/deployment";

export function useDeploymentProjects(teamId: string | null) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  // Fetch all projects for a team
  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["deployment-projects", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getDeploymentProjects(teamId, accessToken);
      if (error) throw error;
      return (data || []) as DeploymentProjectRow[];
    },
    enabled: !!teamId && !!user,
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (project: Omit<DeploymentProjectInsert, "team_id">) => {
      if (!user || !teamId) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.createDeploymentProject(
        { ...project, team_id: teamId },
        accessToken
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-projects", teamId] });
      toast.success("프로젝트가 생성되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "프로젝트 생성 중 오류가 발생했습니다.");
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<DeploymentProjectInsert>;
    }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.updateDeploymentProject(id, updates, accessToken);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-projects", teamId] });
      toast.success("프로젝트 정보가 수정되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "프로젝트 수정 중 오류가 발생했습니다.");
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const accessToken = getAccessToken();
      const { error } = await supabaseFetch.deleteDeploymentProject(id, accessToken);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-projects", teamId] });
      toast.success("프로젝트가 삭제되었습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "프로젝트 삭제 중 오류가 발생했습니다.");
    },
  });

  // Helper functions
  const createProject = useCallback(
    async (project: Omit<DeploymentProjectInsert, "team_id">) => {
      return createMutation.mutateAsync(project);
    },
    [createMutation]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<DeploymentProjectInsert>) => {
      return updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    projects,
    isLoading,
    error,
    refetch,
    createProject,
    updateProject,
    deleteProject,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for pipeline events
export function usePipelineEvents(projectId: string | null, limit = 20) {
  const { user, session } = useAuth();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pipeline-events", projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];
      const accessToken = getAccessToken();
      const { data, error } = await supabaseFetch.getPipelineEvents(projectId, limit, accessToken);
      if (error) throw error;
      return (data || []) as PipelineEventRow[];
    },
    enabled: !!projectId && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate stats
  const stats: PipelineStats = {
    total: events.length,
    success: events.filter((e) => e.status === "success").length,
    failed: events.filter((e) => e.status === "failed").length,
    running: events.filter((e) => e.status === "running" || e.status === "pending").length,
    success_rate:
      events.length > 0
        ? Math.round(
            (events.filter((e) => e.status === "success").length / events.length) * 100
          )
        : 0,
  };

  return {
    events,
    stats,
    isLoading,
    error,
    refetch,
  };
}

// Hook to get latest pipeline for each project
export function useProjectsWithLatestPipeline(teamId: string | null) {
  const { projects, isLoading: projectsLoading } = useDeploymentProjects(teamId);
  const { user, session } = useAuth();

  const getAccessToken = (): string | undefined => {
    return session?.access_token;
  };

  const {
    data: projectsWithPipelines = [],
    isLoading: pipelinesLoading,
    refetch,
  } = useQuery({
    queryKey: ["projects-with-pipelines", teamId, projects.map((p) => p.id)],
    queryFn: async () => {
      if (!projects.length) return [];

      const accessToken = getAccessToken();
      const results = await Promise.all(
        projects.map(async (project) => {
          const { data } = await supabaseFetch.getPipelineEvents(project.id, 1, accessToken);
          const latestPipeline = data?.[0] || null;

          // Determine project status based on latest pipeline
          let status: "healthy" | "warning" | "error" | "unknown" = "unknown";
          if (latestPipeline) {
            switch (latestPipeline.status) {
              case "success":
                status = "healthy";
                break;
              case "failed":
              case "canceled":
                status = "error";
                break;
              case "running":
              case "pending":
                status = "warning";
                break;
              default:
                status = "unknown";
            }
          }

          return {
            ...project,
            latest_pipeline: latestPipeline,
            status,
            last_deployment_at: latestPipeline?.finished_at || null,
          };
        })
      );

      return results;
    },
    enabled: !!teamId && !!user && projects.length > 0,
    refetchInterval: 30000,
  });

  return {
    projects: projectsWithPipelines,
    isLoading: projectsLoading || pipelinesLoading,
    refetch,
  };
}
