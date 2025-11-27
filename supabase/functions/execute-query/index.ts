// Supabase Edge Function: 쿼리 실행
// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 타임아웃 설정 (30초)
const QUERY_TIMEOUT_MS = 30000;
const MAX_ROWS = 1000;

interface ExecuteQueryRequest {
  connectionId: string;
  sql: string;
  parameters?: Record<string, any>;
  explainOnly?: boolean;
  statementId?: string; // MyBatis statement ID (for logging)
}

interface DbConnectionRow {
  id: string;
  team_id: string;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string | null;
  ssl_mode: string;
  is_read_only: boolean;
}

interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  columns?: string[];
  executionTimeMs?: number;
  explainPlan?: any;
  error?: string;
  warning?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract user from JWT
    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token and get user info
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = userData.user.id;

    // Parse request body
    const body: ExecuteQueryRequest = await req.json();
    const { connectionId, sql, parameters, explainOnly, statementId } = body;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: "connectionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sql || !sql.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "sql is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate SQL (SELECT only)
    const sqlValidation = validateSelectOnly(sql);
    if (!sqlValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: sqlValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch connection details
    const { data: connection, error: fetchError } = await supabase
      .from("db_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (fetchError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conn = connection as DbConnectionRow;

    // Verify user has access to this connection (team member check)
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", conn.team_id)
      .eq("user_id", userId)
      .single();

    if (teamError || !teamMember) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied: not a team member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute query based on db_type
    let result: QueryResult;

    try {
      switch (conn.db_type) {
        case "postgresql":
          result = await executePostgresQuery(conn, sql, explainOnly);
          break;
        case "mysql":
          result = await executeMysqlQuery(conn, sql, explainOnly);
          break;
        case "oracle":
        case "mssql":
          // Oracle/MSSQL는 Deno에서 제한적 지원
          result = {
            success: false,
            error: `${conn.db_type} 쿼리 실행은 현재 지원하지 않습니다. PostgreSQL 또는 MySQL을 사용해주세요.`,
          };
          break;
        default:
          result = {
            success: false,
            error: `Unsupported database type: ${conn.db_type}`,
          };
      }
    } catch (err: any) {
      result = {
        success: false,
        error: err.message || "Query execution failed",
      };
    }

    const executionTimeMs = Date.now() - startTime;
    result.executionTimeMs = executionTimeMs;

    // Log query execution
    try {
      await supabase.from("query_executions").insert({
        connection_id: connectionId,
        statement_id: statementId || null,
        sql_query: sql,
        parameters: parameters || null,
        result_row_count: result.rowCount || null,
        execution_time_ms: executionTimeMs,
        error_message: result.error || null,
        executed_by: userId,
      });
    } catch (logError) {
      console.error("Failed to log query execution:", logError);
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * SELECT 쿼리만 허용하는지 검증
 */
function validateSelectOnly(sql: string): { valid: boolean; error?: string } {
  const trimmedSql = sql.trim().toLowerCase();

  // EXPLAIN으로 시작하는 경우 허용
  if (trimmedSql.startsWith("explain")) {
    return { valid: true };
  }

  // SELECT로 시작하는 경우만 허용
  if (!trimmedSql.startsWith("select") && !trimmedSql.startsWith("with")) {
    return {
      valid: false,
      error: "보안상 SELECT 쿼리만 실행할 수 있습니다. INSERT, UPDATE, DELETE 등은 허용되지 않습니다.",
    };
  }

  // 위험한 키워드 체크 (서브쿼리 내 DML 방지)
  const dangerousPatterns = [
    /;\s*(insert|update|delete|drop|truncate|alter|create|grant|revoke)/i,
    /into\s+outfile/i,
    /load_file\s*\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return {
        valid: false,
        error: "위험한 SQL 패턴이 감지되었습니다.",
      };
    }
  }

  return { valid: true };
}

/**
 * PostgreSQL 쿼리 실행
 */
async function executePostgresQuery(
  conn: DbConnectionRow,
  sql: string,
  explainOnly?: boolean
): Promise<QueryResult> {
  const connectionString = buildPostgresConnectionString(conn);

  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    let queryToExecute = sql;

    // EXPLAIN 모드
    if (explainOnly) {
      // 이미 EXPLAIN으로 시작하지 않으면 추가
      if (!sql.trim().toLowerCase().startsWith("explain")) {
        queryToExecute = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${sql}`;
      }
    }

    // 타임아웃 설정
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("쿼리 실행 시간이 30초를 초과했습니다.")), QUERY_TIMEOUT_MS);
    });

    // 쿼리 실행
    const queryPromise = client.unsafe(queryToExecute);
    const rows = await Promise.race([queryPromise, timeoutPromise]);

    await client.end();

    // 결과 처리
    if (explainOnly) {
      return {
        success: true,
        explainPlan: rows[0]?.["QUERY PLAN"] || rows,
        rowCount: 0,
      };
    }

    // 행 수 제한
    const limitedRows = rows.slice(0, MAX_ROWS);
    const columns = limitedRows.length > 0 ? Object.keys(limitedRows[0]) : [];

    return {
      success: true,
      rows: limitedRows,
      rowCount: rows.length,
      columns,
      warning: rows.length > MAX_ROWS
        ? `결과가 ${MAX_ROWS}행으로 제한되었습니다. (전체: ${rows.length}행)`
        : undefined,
    };

  } catch (error: any) {
    await client.end();
    throw error;
  }
}

/**
 * MySQL 쿼리 실행
 */
async function executeMysqlQuery(
  conn: DbConnectionRow,
  sql: string,
  explainOnly?: boolean
): Promise<QueryResult> {
  // MySQL은 Deno에서 직접 지원하는 드라이버가 제한적
  // esm.sh를 통한 mysql2 사용 시도
  try {
    // Dynamic import for mysql2
    const mysql = await import("https://esm.sh/mysql2@3.6.5/promise");

    const connection = await mysql.createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.username,
      password: conn.password_encrypted || "",
      database: conn.database_name,
      connectTimeout: 10000,
    });

    let queryToExecute = sql;

    // EXPLAIN 모드
    if (explainOnly) {
      if (!sql.trim().toLowerCase().startsWith("explain")) {
        queryToExecute = `EXPLAIN FORMAT=JSON ${sql}`;
      }
    }

    // 타임아웃 설정
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("쿼리 실행 시간이 30초를 초과했습니다.")), QUERY_TIMEOUT_MS);
    });

    const queryPromise = connection.execute(queryToExecute);
    const [rows] = await Promise.race([queryPromise, timeoutPromise]) as [any[], any];

    await connection.end();

    // 결과 처리
    if (explainOnly) {
      const explainData = rows[0]?.EXPLAIN || rows;
      return {
        success: true,
        explainPlan: typeof explainData === "string" ? JSON.parse(explainData) : explainData,
        rowCount: 0,
      };
    }

    // 행 수 제한
    const limitedRows = rows.slice(0, MAX_ROWS);
    const columns = limitedRows.length > 0 ? Object.keys(limitedRows[0]) : [];

    return {
      success: true,
      rows: limitedRows,
      rowCount: rows.length,
      columns,
      warning: rows.length > MAX_ROWS
        ? `결과가 ${MAX_ROWS}행으로 제한되었습니다. (전체: ${rows.length}행)`
        : undefined,
    };

  } catch (error: any) {
    // MySQL 드라이버 로드 실패 시 대체 메시지
    if (error.message?.includes("import") || error.message?.includes("module")) {
      return {
        success: false,
        error: "MySQL 드라이버를 로드할 수 없습니다. Edge Function 환경에서 MySQL 지원이 제한적입니다.",
      };
    }
    throw error;
  }
}

/**
 * PostgreSQL 연결 문자열 생성
 */
function buildPostgresConnectionString(conn: DbConnectionRow): string {
  const password = conn.password_encrypted || "";
  const sslMode = conn.ssl_mode || "disable";

  let connStr = `postgres://${encodeURIComponent(conn.username)}:${encodeURIComponent(password)}@${conn.host}:${conn.port}/${conn.database_name}`;

  if (sslMode !== "disable") {
    connStr += `?sslmode=${sslMode}`;
  }

  return connStr;
}
