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
};
