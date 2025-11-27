// Supabase Edge Function: DB 연결 테스트
// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionRequest {
  connectionId: string;
}

interface DbConnectionRow {
  id: string;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string | null;
  ssl_mode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { connectionId }: TestConnectionRequest = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: "connectionId is required" }),
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
    let testResult = false;
    let errorMessage: string | null = null;

    // Test connection based on db_type
    try {
      switch (conn.db_type) {
        case "postgresql":
          testResult = await testPostgresConnection(conn);
          break;
        case "mysql":
          // MySQL 테스트는 별도 라이브러리 필요
          // 현재는 간단한 TCP 연결 테스트로 대체
          testResult = await testTcpConnection(conn.host, conn.port);
          if (testResult) {
            errorMessage = "TCP 연결 성공 (MySQL 드라이버 미지원, 실제 인증 테스트 불가)";
          }
          break;
        case "oracle":
        case "mssql":
          // TCP 연결 테스트만 수행
          testResult = await testTcpConnection(conn.host, conn.port);
          if (testResult) {
            errorMessage = `TCP 연결 성공 (${conn.db_type} 드라이버 미지원, 실제 인증 테스트 불가)`;
          }
          break;
        default:
          errorMessage = `Unsupported database type: ${conn.db_type}`;
      }
    } catch (err: any) {
      testResult = false;
      errorMessage = err.message || "Connection test failed";
    }

    // Update test result in database
    const { error: updateError } = await supabase
      .from("db_connections")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_result: testResult,
      })
      .eq("id", connectionId);

    if (updateError) {
      console.error("Failed to update test result:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: testResult,
        message: testResult
          ? (errorMessage || "연결 성공")
          : (errorMessage || "연결 실패"),
        testedAt: new Date().toISOString(),
      }),
      {
        status: 200,
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
 * PostgreSQL 연결 테스트
 */
async function testPostgresConnection(conn: DbConnectionRow): Promise<boolean> {
  const connectionString = buildPostgresConnectionString(conn);

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    // 간단한 쿼리 실행으로 연결 테스트
    const result = await sql`SELECT 1 as test`;
    await sql.end();
    return result.length > 0;
  } catch (error) {
    await sql.end();
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

/**
 * TCP 연결 테스트 (기본적인 포트 연결 확인)
 */
async function testTcpConnection(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({
      hostname: host,
      port: port,
    });
    conn.close();
    return true;
  } catch {
    return false;
  }
}
