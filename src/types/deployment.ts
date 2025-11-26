// Sprint 7: Deployment Dashboard Types

import type { Json } from "./database";

// =====================================================
// Team Types
// =====================================================

export type TeamRole = "owner" | "admin" | "member";

export interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  invited_by: string | null;
  joined_at: string;
  // Joined data
  user?: {
    email: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface InsertTeam {
  name: string;
  description?: string | null;
  owner_id: string;
}

export interface UpdateTeam {
  name?: string;
  description?: string | null;
}

export interface InsertTeamMember {
  team_id: string;
  user_id: string;
  role?: TeamRole;
  invited_by?: string;
}

// =====================================================
// Deployment Project Types
// =====================================================

export interface DeploymentProject {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  // GitLab
  gitlab_url: string | null;
  gitlab_project_id: string | null;
  gitlab_api_token_encrypted: string | null;
  // Prometheus
  prometheus_endpoint: string | null;
  prometheus_auth_token_encrypted: string | null;
  // Docker
  docker_host: string | null;
  // Webhook
  webhook_secret: string;
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed/Joined
  latest_pipeline?: PipelineEvent | null;
  pipeline_stats?: PipelineStats;
}

export interface InsertDeploymentProject {
  team_id: string;
  name: string;
  description?: string | null;
  gitlab_url?: string | null;
  gitlab_project_id?: string | null;
  gitlab_api_token_encrypted?: string | null;
  prometheus_endpoint?: string | null;
  prometheus_auth_token_encrypted?: string | null;
  docker_host?: string | null;
  is_active?: boolean;
}

export interface UpdateDeploymentProject {
  name?: string;
  description?: string | null;
  gitlab_url?: string | null;
  gitlab_project_id?: string | null;
  gitlab_api_token_encrypted?: string | null;
  prometheus_endpoint?: string | null;
  prometheus_auth_token_encrypted?: string | null;
  docker_host?: string | null;
  is_active?: boolean;
}

// =====================================================
// Pipeline Types
// =====================================================

export type PipelineStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "canceled"
  | "skipped"
  | "manual";

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  jobs: PipelineJob[];
}

export interface PipelineJob {
  name: string;
  status: PipelineStatus;
  duration?: number;
}

export interface PipelineEvent {
  id: string;
  project_id: string;
  pipeline_id: string;
  ref: string | null;
  status: PipelineStatus | null;
  source: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  author_name: string | null;
  author_email: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  stages: PipelineStage[] | null;
  raw_payload: Json | null;
  received_at: string;
}

export interface PipelineStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  success_rate: number;
}

// =====================================================
// GitLab API Types
// =====================================================

export interface GitLabPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
  user: {
    id: number;
    username: string;
    name: string;
    avatar_url: string;
  };
}

export interface GitLabJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
}

export interface GitLabWebhookPayload {
  object_kind: "pipeline";
  object_attributes: {
    id: number;
    iid: number;
    ref: string;
    sha: string;
    status: string;
    source: string;
    created_at: string;
    finished_at: string | null;
    duration: number | null;
    stages: string[];
  };
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
    avatar_url: string;
  };
  project: {
    id: number;
    name: string;
    web_url: string;
  };
  commit: {
    id: string;
    message: string;
    title: string;
    author: {
      name: string;
      email: string;
    };
  };
  builds: Array<{
    id: number;
    stage: string;
    name: string;
    status: string;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
    duration: number | null;
  }>;
}

// =====================================================
// Form Types
// =====================================================

export interface ProjectFormData {
  name: string;
  description: string;
  gitlab_url: string;
  gitlab_project_id: string;
  gitlab_api_token: string;
  prometheus_endpoint: string;
  prometheus_auth_token: string;
  docker_host: string;
}

// =====================================================
// Dashboard View Types
// =====================================================

export interface DashboardStats {
  total_projects: number;
  active_pipelines: number;
  success_rate: number;
  total_deployments_today: number;
}

export interface ProjectWithStatus extends DeploymentProject {
  status: "healthy" | "warning" | "error" | "unknown";
  last_deployment_at: string | null;
}
