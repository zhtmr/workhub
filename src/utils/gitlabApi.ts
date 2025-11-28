/**
 * GitLab API Client
 * Provides methods to interact with GitLab CI/CD pipelines
 */

import type { GitLabPipeline, GitLabJob } from "@/types/deployment";
import { isElectronEnvironment, getEmbeddedProxyUrl } from "@/lib/electron-bridge";

interface GitLabConfig {
  baseUrl: string;
  projectId: string;
  privateToken: string;
  proxyUrl?: string; // 외부 프록시 서버 URL (선택)
}

interface PipelineListParams {
  status?: string;
  ref?: string;
  per_page?: number;
  page?: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export class GitLabClient {
  private config: GitLabConfig;
  private proxyUrl: string | null = null;
  private proxyInitialized: boolean = false;

  constructor(config: GitLabConfig) {
    // Remove trailing slash from baseUrl
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ""),
    };
  }

  /**
   * 프록시 URL 초기화
   * 우선순위: 1. 설정된 proxyUrl, 2. Electron 내장 프록시, 3. 환경변수
   */
  private async initProxy(): Promise<void> {
    if (this.proxyInitialized) return;

    // 1. 명시적으로 설정된 프록시 URL
    if (this.config.proxyUrl) {
      this.proxyUrl = this.config.proxyUrl;
    }
    // 2. Electron 환경: 내장 프록시 서버
    else if (isElectronEnvironment()) {
      this.proxyUrl = await getEmbeddedProxyUrl();
    }
    // 3. 환경 변수에서 프록시 URL 가져오기
    else if (import.meta.env.VITE_PROXY_URL) {
      this.proxyUrl = import.meta.env.VITE_PROXY_URL;
    }
    // 4. HTTP URL인 경우 프록시 필요 여부 체크
    else if (this.config.baseUrl.startsWith("http://")) {
      // HTTPS 페이지에서 HTTP 요청은 차단될 수 있음
      if (typeof window !== "undefined" && window.location.protocol === "https:") {
        console.warn(
          "[GitLabClient] HTTP GitLab URL detected on HTTPS page. " +
          "Mixed content may be blocked. Consider using a proxy server."
        );
      }
    }

    this.proxyInitialized = true;
  }

  /**
   * 프록시 사용 여부 확인
   */
  private shouldUseProxy(): boolean {
    // 프록시 URL이 있으면 사용
    if (this.proxyUrl) return true;

    // HTTPS 페이지에서 HTTP GitLab URL인 경우 프록시 필요
    if (typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        this.config.baseUrl.startsWith("http://")) {
      return true;
    }

    return false;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    await this.initProxy();

    try {
      // 프록시를 통한 요청
      if (this.shouldUseProxy() && this.proxyUrl) {
        const response = await fetch(`${this.proxyUrl}/api/gitlab/proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            baseUrl: this.config.baseUrl,
            endpoint: endpoint,
            method: options?.method || "GET",
            privateToken: this.config.privateToken,
            body: options?.body ? JSON.parse(options.body as string) : undefined,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          return { data: null, error: new Error(result.error || "Unknown error") };
        }

        return { data: result.data, error: null };
      }

      // 직접 요청
      const url = `${this.config.baseUrl}/api/v4${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": this.config.privateToken,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `GitLab API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return { data: null, error: new Error(errorMessage) };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * Test connection to GitLab
   */
  async testConnection(): Promise<ApiResponse<{ name: string; web_url: string }>> {
    return this.request<{ name: string; web_url: string }>(
      `/projects/${encodeURIComponent(this.config.projectId)}`
    );
  }

  /**
   * Get list of pipelines
   */
  async getPipelines(params?: PipelineListParams): Promise<ApiResponse<GitLabPipeline[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.ref) queryParams.append("ref", params.ref);
    queryParams.append("per_page", String(params?.per_page || 20));
    queryParams.append("page", String(params?.page || 1));

    const query = queryParams.toString();
    return this.request<GitLabPipeline[]>(
      `/projects/${encodeURIComponent(this.config.projectId)}/pipelines${query ? `?${query}` : ""}`
    );
  }

  /**
   * Get pipeline details
   */
  async getPipelineDetails(pipelineId: number): Promise<ApiResponse<GitLabPipeline>> {
    return this.request<GitLabPipeline>(
      `/projects/${encodeURIComponent(this.config.projectId)}/pipelines/${pipelineId}`
    );
  }

  /**
   * Get pipeline jobs
   */
  async getPipelineJobs(pipelineId: number): Promise<ApiResponse<GitLabJob[]>> {
    return this.request<GitLabJob[]>(
      `/projects/${encodeURIComponent(this.config.projectId)}/pipelines/${pipelineId}/jobs`
    );
  }

  /**
   * Retry a failed pipeline
   */
  async retryPipeline(pipelineId: number): Promise<ApiResponse<GitLabPipeline>> {
    return this.request<GitLabPipeline>(
      `/projects/${encodeURIComponent(this.config.projectId)}/pipelines/${pipelineId}/retry`,
      { method: "POST" }
    );
  }

  /**
   * Cancel a running pipeline
   */
  async cancelPipeline(pipelineId: number): Promise<ApiResponse<GitLabPipeline>> {
    return this.request<GitLabPipeline>(
      `/projects/${encodeURIComponent(this.config.projectId)}/pipelines/${pipelineId}/cancel`,
      { method: "POST" }
    );
  }

  /**
   * Get latest pipeline for a branch
   */
  async getLatestPipeline(ref = "main"): Promise<ApiResponse<GitLabPipeline | null>> {
    const { data, error } = await this.getPipelines({ ref, per_page: 1 });
    if (error) return { data: null, error };
    return { data: data?.[0] || null, error: null };
  }
}

/**
 * Create a GitLab client from project configuration
 */
export function createGitLabClient(
  gitlabUrl: string,
  projectId: string,
  apiToken: string,
  proxyUrl?: string
): GitLabClient {
  return new GitLabClient({
    baseUrl: gitlabUrl,
    projectId,
    privateToken: apiToken,
    proxyUrl,
  });
}

/**
 * Utility to format pipeline duration
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}분 ${secs}초` : `${minutes}분`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}

/**
 * Get status color for pipeline status
 */
export function getStatusColor(status: string | null): string {
  switch (status) {
    case "success":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "running":
      return "text-blue-500";
    case "pending":
      return "text-yellow-500";
    case "canceled":
      return "text-gray-500";
    case "skipped":
      return "text-gray-400";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Get status background color for pipeline status
 */
export function getStatusBgColor(status: string | null): string {
  switch (status) {
    case "success":
      return "bg-green-500/10 border-green-500/20";
    case "failed":
      return "bg-red-500/10 border-red-500/20";
    case "running":
      return "bg-blue-500/10 border-blue-500/20";
    case "pending":
      return "bg-yellow-500/10 border-yellow-500/20";
    case "canceled":
      return "bg-gray-500/10 border-gray-500/20";
    case "skipped":
      return "bg-gray-400/10 border-gray-400/20";
    default:
      return "bg-muted border-muted-foreground/20";
  }
}

/**
 * Get status label in Korean
 */
export function getStatusLabel(status: string | null): string {
  switch (status) {
    case "success":
      return "성공";
    case "failed":
      return "실패";
    case "running":
      return "실행 중";
    case "pending":
      return "대기 중";
    case "canceled":
      return "취소됨";
    case "skipped":
      return "건너뜀";
    case "manual":
      return "수동";
    default:
      return "알 수 없음";
  }
}
