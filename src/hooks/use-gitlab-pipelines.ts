import { useInfiniteQuery } from "@tanstack/react-query";
import { createGitLabClient } from "@/utils/gitlabApi";
import type { DeploymentProject, GitLabPipeline, PipelineEvent, PipelineStats, PipelineStatus } from "@/types/deployment";

/**
 * GitLab 파이프라인을 PipelineEvent 형식으로 변환
 */
export function gitLabPipelineToPipelineEvent(
  pipeline: GitLabPipeline,
  projectId: string = ""
): PipelineEvent {
  return {
    id: `gl-${pipeline.id}`,
    project_id: projectId,
    pipeline_id: String(pipeline.id),
    ref: pipeline.ref,
    status: pipeline.status as PipelineStatus,
    source: pipeline.source,
    commit_sha: pipeline.sha,
    commit_message: null, // GitLab 파이프라인 목록 API에서는 커밋 메시지 미포함
    author_name: pipeline.user?.name || null,
    author_email: null,
    started_at: pipeline.started_at,
    finished_at: pipeline.finished_at,
    duration_seconds: pipeline.duration,
    stages: null,
    raw_payload: null,
    received_at: pipeline.created_at,
  };
}

/**
 * PipelineEvent 배열로부터 통계 계산
 */
export function calculatePipelineStats(events: PipelineEvent[]): PipelineStats {
  const total = events.length;
  const success = events.filter((e) => e.status === "success").length;
  const failed = events.filter((e) => e.status === "failed").length;
  const running = events.filter(
    (e) => e.status === "running" || e.status === "pending"
  ).length;

  return {
    total,
    success,
    failed,
    running,
    success_rate: total > 0 ? Math.round((success / total) * 100) : 0,
  };
}

interface UseGitLabPipelinesOptions {
  enabled?: boolean;
  refetchInterval?: number;
  perPage?: number;
}

/**
 * GitLab API에서 파이프라인 목록을 가져오는 훅 (페이지네이션 지원)
 */
export function useGitLabPipelines(
  project: DeploymentProject | null,
  options: UseGitLabPipelinesOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000,
    perPage = 50,
  } = options;

  const hasGitLabConfig =
    !!project?.gitlab_url &&
    !!project?.gitlab_project_id &&
    !!project?.gitlab_api_token_encrypted;

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["gitlab-pipelines", project?.id],
    queryFn: async ({ pageParam = 1 }) => {
      if (!project || !hasGitLabConfig) {
        return { pipelines: [], nextPage: null };
      }

      const client = createGitLabClient(
        project.gitlab_url!,
        project.gitlab_project_id!,
        project.gitlab_api_token_encrypted!
      );

      const { data, error } = await client.getPipelines({
        per_page: perPage,
        page: pageParam,
      });

      if (error) {
        throw error;
      }

      const pipelines = data || [];
      // GitLab API는 perPage보다 적은 결과가 오면 마지막 페이지
      const nextPage = pipelines.length === perPage ? pageParam + 1 : null;

      return { pipelines, nextPage };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: enabled && hasGitLabConfig,
    refetchInterval: hasGitLabConfig ? refetchInterval : false,
    retry: 1,
  });

  // 모든 페이지의 파이프라인 합치기
  const allPipelines: GitLabPipeline[] = data?.pages.flatMap(page => page.pipelines) || [];

  // GitLab 파이프라인을 PipelineEvent 형식으로 변환
  const events: PipelineEvent[] = allPipelines.map((pipeline) =>
    gitLabPipelineToPipelineEvent(pipeline, project?.id)
  );

  // 통계 계산
  const stats = calculatePipelineStats(events);

  return {
    pipelines: allPipelines,
    events,
    stats,
    isLoading,
    error,
    refetch,
    hasGitLabConfig,
    // 페이지네이션
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}
