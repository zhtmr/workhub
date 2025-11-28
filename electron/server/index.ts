/**
 * Electron 내장 프록시 서버
 * - Express 기반 프록시 서버
 * - PostgreSQL, MySQL, MSSQL 지원
 * - 동적 포트 할당
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { AddressInfo } from 'net';
import { Pool, PoolConfig } from 'pg';
import mysql from 'mysql2/promise';
import mssql from 'mssql';

let server: http.Server | null = null;
let currentPort: number | null = null;

// ============================================================
// Types
// ============================================================

interface ConnectionInfo {
  db_type: 'postgresql' | 'mysql' | 'mssql';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
}

interface QueryResult {
  success: boolean;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  columns?: string[];
  executionTimeMs?: number;
  explainPlan?: unknown;
  error?: string;
  warning?: string;
}

// ============================================================
// Validation Utils
// ============================================================

const DANGEROUS_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'INTO OUTFILE',
  'LOAD_FILE', 'BENCHMARK', 'SLEEP',
];

const EXPLAIN_KEYWORDS = ['EXPLAIN', 'ANALYZE'];

function validateSelectOnly(sql: string): { valid: boolean; error?: string } {
  const trimmedSql = sql.trim().toUpperCase();

  if (!trimmedSql) {
    return { valid: false, error: '빈 쿼리입니다' };
  }

  if (EXPLAIN_KEYWORDS.some(kw => trimmedSql.startsWith(kw))) {
    return { valid: true };
  }

  if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('WITH')) {
    return { valid: false, error: 'SELECT 쿼리만 실행할 수 있습니다' };
  }

  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      return { valid: false, error: `위험한 키워드가 포함되어 있습니다: ${keyword}` };
    }
  }

  const statements = sql.split(';').filter(s => s.trim());
  if (statements.length > 1) {
    return { valid: false, error: '다중 쿼리는 지원하지 않습니다' };
  }

  return { valid: true };
}

function validateConnection(conn: unknown): { valid: boolean; error?: string; connection?: ConnectionInfo } {
  if (!conn || typeof conn !== 'object') {
    return { valid: false, error: '연결 정보가 필요합니다' };
  }

  const c = conn as Record<string, unknown>;

  if (!['postgresql', 'mysql', 'mssql'].includes(c.db_type as string)) {
    return { valid: false, error: '지원하지 않는 DB 타입입니다 (postgresql, mysql, mssql만 지원)' };
  }

  if (!c.host || typeof c.host !== 'string') {
    return { valid: false, error: 'host가 필요합니다' };
  }

  if (!c.port || typeof c.port !== 'number') {
    return { valid: false, error: 'port가 필요합니다' };
  }

  if (!c.database_name || typeof c.database_name !== 'string') {
    return { valid: false, error: 'database_name이 필요합니다' };
  }

  if (!c.username || typeof c.username !== 'string') {
    return { valid: false, error: 'username이 필요합니다' };
  }

  if (c.password === undefined || c.password === null) {
    return { valid: false, error: 'password가 필요합니다' };
  }

  return {
    valid: true,
    connection: {
      db_type: c.db_type as ConnectionInfo['db_type'],
      host: c.host as string,
      port: c.port as number,
      database_name: c.database_name as string,
      username: c.username as string,
      password: String(c.password),
    },
  };
}

// ============================================================
// PostgreSQL
// ============================================================

async function executePostgresQuery(
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

async function testPostgresConnection(connection: ConnectionInfo): Promise<{
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

// ============================================================
// MySQL
// ============================================================

async function executeMysqlQuery(
  connection: ConnectionInfo,
  sql: string,
  explainOnly: boolean = false
): Promise<QueryResult> {
  const startTime = Date.now();

  const conn = await mysql.createConnection({
    host: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: connection.password,
    connectTimeout: 10000,
  });

  try {
    await conn.query('SET SESSION MAX_EXECUTION_TIME=30000');

    let finalSql = sql;

    if (explainOnly) {
      finalSql = `EXPLAIN ${sql}`;
    }

    const [rows, fields] = await conn.query(finalSql);
    const executionTimeMs = Date.now() - startTime;

    if (explainOnly) {
      return {
        success: true,
        explainPlan: rows,
        executionTimeMs,
      };
    }

    const resultRows = Array.isArray(rows) ? rows : [rows];
    const columns = fields ? (fields as mysql.FieldPacket[]).map(f => f.name) : [];

    return {
      success: true,
      rows: resultRows as Record<string, unknown>[],
      rowCount: resultRows.length,
      columns,
      executionTimeMs,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    await conn.end();
  }
}

async function testMysqlConnection(connection: ConnectionInfo): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
}> {
  try {
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      database: connection.database_name,
      user: connection.username,
      password: connection.password,
      connectTimeout: 10000,
    });

    try {
      const [rows] = await conn.query('SELECT VERSION() as version');
      const version = (rows as { version: string }[])[0]?.version || 'Unknown';

      return {
        success: true,
        message: '연결 성공',
        serverVersion: `MySQL ${version}`,
      };
    } finally {
      await conn.end();
    }
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `연결 실패: ${err.message}`,
    };
  }
}

// ============================================================
// MSSQL
// ============================================================

async function executeMssqlQuery(
  connection: ConnectionInfo,
  sqlQuery: string,
  explainOnly: boolean = false
): Promise<QueryResult> {
  const startTime = Date.now();

  const config: mssql.config = {
    server: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: connection.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  };

  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);

    if (explainOnly) {
      await pool.request().query('SET SHOWPLAN_TEXT ON');
      const result = await pool.request().query(sqlQuery);
      await pool.request().query('SET SHOWPLAN_TEXT OFF');

      const executionTimeMs = Date.now() - startTime;
      return {
        success: true,
        explainPlan: result.recordset,
        executionTimeMs,
      };
    }

    const result = await pool.request().query(sqlQuery);
    const executionTimeMs = Date.now() - startTime;

    const columns = result.recordset.columns
      ? Object.keys(result.recordset.columns)
      : result.recordset.length > 0
        ? Object.keys(result.recordset[0])
        : [];

    return {
      success: true,
      rows: result.recordset,
      rowCount: result.recordset.length,
      columns,
      executionTimeMs,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('MSSQL connection close error:', closeErr);
      }
    }
  }
}

async function testMssqlConnection(connection: ConnectionInfo): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
}> {
  const config: mssql.config = {
    server: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: connection.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
  };

  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);
    const result = await pool.request().query('SELECT @@VERSION as version');
    const version = result.recordset[0]?.version || 'Unknown';

    return {
      success: true,
      message: '연결 성공',
      serverVersion: version.split('\n')[0],
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `연결 실패: ${err.message}`,
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error('MSSQL connection close error:', closeErr);
      }
    }
  }
}

// ============================================================
// Express Server
// ============================================================

export async function startProxyServer(preferredPort: number = 3001): Promise<number> {
  if (server) {
    console.log('[ProxyServer] Already running');
    return currentPort!;
  }

  const app = express();

  // Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      embedded: true,
      port: currentPort,
    });
  });

  // Execute query
  app.post('/api/execute-query', async (req: Request, res: Response) => {
    try {
      const { connection: connInput, sql, explainOnly } = req.body;

      const connValidation = validateConnection(connInput);
      if (!connValidation.valid || !connValidation.connection) {
        res.status(400).json({ success: false, error: connValidation.error });
        return;
      }

      const connection = connValidation.connection;

      if (!sql || typeof sql !== 'string') {
        res.status(400).json({ success: false, error: 'SQL이 필요합니다' });
        return;
      }

      const sqlValidation = validateSelectOnly(sql);
      if (!sqlValidation.valid) {
        res.status(400).json({ success: false, error: sqlValidation.error });
        return;
      }

      let result: QueryResult;

      switch (connection.db_type) {
        case 'postgresql':
          result = await executePostgresQuery(connection, sql, explainOnly);
          break;
        case 'mysql':
          result = await executeMysqlQuery(connection, sql, explainOnly);
          break;
        case 'mssql':
          result = await executeMssqlQuery(connection, sql, explainOnly);
          break;
        default:
          res.status(400).json({ success: false, error: `지원하지 않는 DB 타입` });
          return;
      }

      if (result.rows && result.rows.length > 1000) {
        result.rows = result.rows.slice(0, 1000);
        result.warning = `결과가 1000행을 초과하여 잘렸습니다 (전체: ${result.rowCount}행)`;
      }

      res.json(result);
    } catch (error) {
      console.error('[ProxyServer] Execute query error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || '쿼리 실행 중 오류가 발생했습니다',
      });
    }
  });

  // Test connection
  app.post('/api/test-connection', async (req: Request, res: Response) => {
    try {
      const { connection: connInput } = req.body;

      const connValidation = validateConnection(connInput);
      if (!connValidation.valid || !connValidation.connection) {
        res.status(400).json({ success: false, message: connValidation.error });
        return;
      }

      const connection = connValidation.connection;

      let result: { success: boolean; message: string; serverVersion?: string };

      switch (connection.db_type) {
        case 'postgresql':
          result = await testPostgresConnection(connection);
          break;
        case 'mysql':
          result = await testMysqlConnection(connection);
          break;
        case 'mssql':
          result = await testMssqlConnection(connection);
          break;
        default:
          res.status(400).json({ success: false, message: `지원하지 않는 DB 타입` });
          return;
      }

      res.json(result);
    } catch (error) {
      console.error('[ProxyServer] Test connection error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || '연결 테스트 중 오류가 발생했습니다',
      });
    }
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[ProxyServer] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  // Start server
  return new Promise((resolve, reject) => {
    server = app.listen(preferredPort, () => {
      currentPort = (server!.address() as AddressInfo).port;
      console.log(`[ProxyServer] Started on port ${currentPort}`);
      resolve(currentPort);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && preferredPort === 3001) {
        console.log(`[ProxyServer] Port ${preferredPort} in use, trying dynamic port...`);
        server = app.listen(0, () => {
          currentPort = (server!.address() as AddressInfo).port;
          console.log(`[ProxyServer] Started on port ${currentPort}`);
          resolve(currentPort);
        });
      } else {
        reject(err);
      }
    });
  });
}

export async function stopProxyServer(): Promise<void> {
  if (server) {
    return new Promise((resolve) => {
      server!.close(() => {
        console.log('[ProxyServer] Stopped');
        server = null;
        currentPort = null;
        resolve();
      });
    });
  }
}

export function getProxyPort(): number | null {
  return currentPort;
}
