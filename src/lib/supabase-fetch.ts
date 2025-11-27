/**
 * Direct fetch wrapper for Supabase REST API
 * Workaround for Supabase SDK not working properly
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface FetchOptions {
  accessToken?: string;
}

async function getHeaders(options?: FetchOptions): Promise<HeadersInit> {
  const token = options?.accessToken || supabaseAnonKey;
  return {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${token}`,
  };
}

export interface DdlHistoryInsert {
  user_id: string;
  title: string;
  ddl_content: string;
  db_type: string;
  table_count: number;
  column_count: number;
  parsed_result?: unknown;
}

export interface DdlHistoryRow {
  id: string;
  user_id: string;
  title: string;
  ddl_content: string;
  db_type: string;
  table_count: number;
  column_count: number;
  parsed_result: unknown;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Team Types
// =====================================================
export interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInsert {
  name: string;
  description?: string | null;
  owner_id: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  joined_at: string;
}

export interface TeamMemberInsert {
  team_id: string;
  user_id: string;
  role?: string;
  invited_by?: string;
}

// =====================================================
// Deployment Project Types
// =====================================================
export interface DeploymentProjectRow {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  gitlab_url: string | null;
  gitlab_project_id: string | null;
  gitlab_api_token_encrypted: string | null;
  prometheus_endpoint: string | null;
  prometheus_auth_token_encrypted: string | null;
  docker_host: string | null;
  webhook_secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeploymentProjectInsert {
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

export interface PipelineEventRow {
  id: string;
  project_id: string;
  pipeline_id: string;
  ref: string | null;
  status: string | null;
  source: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  author_name: string | null;
  author_email: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  stages: unknown;
  raw_payload: unknown;
  received_at: string;
}

export const supabaseFetch = {
  /**
   * Fetch all history entries for a user
   */
  async getHistory(userId: string, accessToken?: string): Promise<{ data: DdlHistoryRow[] | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/ddl_history?user_id=eq.${userId}&order=created_at.desc`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to fetch history') };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Insert a new history entry
   */
  async insertHistory(entry: DdlHistoryInsert, accessToken?: string): Promise<{ data: DdlHistoryRow | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/ddl_history`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(entry),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to insert history') };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Delete a history entry
   */
  async deleteHistory(id: string, userId: string, accessToken?: string): Promise<{ error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/ddl_history?id=eq.${id}&user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.message || 'Failed to delete history') };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  // =====================================================
  // Team APIs
  // =====================================================

  /**
   * Fetch all teams for a user
   */
  async getTeams(accessToken?: string): Promise<{ data: TeamRow[] | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/teams?select=*&order=created_at.desc`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to fetch teams') };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Create a new team
   */
  async createTeam(team: TeamInsert, accessToken?: string): Promise<{ data: TeamRow | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/teams`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(team),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to create team') };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Update a team
   */
  async updateTeam(id: string, updates: Partial<TeamInsert>, accessToken?: string): Promise<{ data: TeamRow | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/teams?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to update team') };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Delete a team
   */
  async deleteTeam(id: string, accessToken?: string): Promise<{ error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/teams?id=eq.${id}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.message || 'Failed to delete team') };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Fetch team members
   */
  async getTeamMembers(teamId: string, accessToken?: string): Promise<{ data: TeamMemberRow[] | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/team_members?team_id=eq.${teamId}&order=joined_at.asc`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to fetch team members') };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Add team member
   */
  async addTeamMember(member: TeamMemberInsert, accessToken?: string): Promise<{ data: TeamMemberRow | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/team_members`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(member),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to add team member') };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Remove team member
   */
  async removeTeamMember(teamId: string, userId: string, accessToken?: string): Promise<{ error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/team_members?team_id=eq.${teamId}&user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.message || 'Failed to remove team member') };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  // =====================================================
  // Deployment Project APIs
  // =====================================================

  /**
   * Fetch deployment projects for a team
   */
  async getDeploymentProjects(teamId: string, accessToken?: string): Promise<{ data: DeploymentProjectRow[] | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/deployment_projects?team_id=eq.${teamId}&order=created_at.desc`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to fetch projects') };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Create a deployment project
   */
  async createDeploymentProject(project: DeploymentProjectInsert, accessToken?: string): Promise<{ data: DeploymentProjectRow | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/deployment_projects`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(project),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to create project') };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Update a deployment project
   */
  async updateDeploymentProject(id: string, updates: Partial<DeploymentProjectInsert>, accessToken?: string): Promise<{ data: DeploymentProjectRow | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/deployment_projects?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to update project') };
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Delete a deployment project
   */
  async deleteDeploymentProject(id: string, accessToken?: string): Promise<{ error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/deployment_projects?id=eq.${id}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.message || 'Failed to delete project') };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Fetch pipeline events for a project
   */
  async getPipelineEvents(projectId: string, limit = 20, accessToken?: string): Promise<{ data: PipelineEventRow[] | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/pipeline_events?project_id=eq.${projectId}&order=received_at.desc&limit=${limit}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || 'Failed to fetch pipeline events') };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  // =====================================================
  // User APIs
  // =====================================================

  /**
   * Find user by email using RPC function
   * Requires: get_user_id_by_email function in Supabase
   */
  async getUserByEmail(email: string, accessToken?: string): Promise<{ data: { id: string; email: string } | null; error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/rpc/get_user_id_by_email`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_email: email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: new Error(errorData.message || '사용자를 찾을 수 없습니다') };
      }

      const data = await response.json();
      if (!data) {
        return { data: null, error: new Error('해당 이메일로 가입된 사용자가 없습니다') };
      }

      return { data: { id: data, email }, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },

  /**
   * Update team member role
   */
  async updateTeamMemberRole(teamId: string, userId: string, role: string, accessToken?: string): Promise<{ error: Error | null }> {
    try {
      const headers = await getHeaders({ accessToken });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/team_members?team_id=eq.${teamId}&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ role }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.message || '역할 변경에 실패했습니다') };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },
};
