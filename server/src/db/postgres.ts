/**
 * PostgreSQL 연결 및 쿼리 실행
 */

import { Pool, PoolConfig } from 'pg';
import { ConnectionInfo } from '../utils/validation';

export interface QueryResult {
  success: boolean;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  columns?: string[];
  executionTimeMs?: number;
  explainPlan?: unknown;
  error?: string;
  warning?: string;
}

export async function executePostgresQuery(
  connection: ConnectionInfo,
  sql: string,
  explainOnly: boolean = false
): Promise<QueryResult> {
  const startTime = Date.now();

  const poolConfig: PoolConfig = {
    host: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: connection.password,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    max: 1,
  };

  const pool = new Pool(poolConfig);

  try {
    const client = await pool.connect();

    try {
      let finalSql = sql;

      // EXPLAIN 모드
      if (explainOnly) {
        finalSql = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${sql}`;
      }

      const result = await client.query(finalSql);
      const executionTimeMs = Date.now() - startTime;

      if (explainOnly) {
        return {
          success: true,
          explainPlan: result.rows[0]['QUERY PLAN'],
          executionTimeMs,
        };
      }

      // 컬럼 이름 추출
      const columns = result.fields.map(f => f.name);

      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount || result.rows.length,
        columns,
        executionTimeMs,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    await pool.end();
  }
}

export async function testPostgresConnection(connection: ConnectionInfo): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
}> {
  const poolConfig: PoolConfig = {
    host: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: connection.password,
    connectionTimeoutMillis: 10000,
    max: 1,
  };

  const pool = new Pool(poolConfig);

  try {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT version()');
      const version = result.rows[0]?.version || 'Unknown';

      return {
        success: true,
        message: '연결 성공',
        serverVersion: version,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `연결 실패: ${err.message}`,
    };
  } finally {
    await pool.end();
  }
}
