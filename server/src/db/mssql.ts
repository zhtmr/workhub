/**
 * MSSQL 연결 및 쿼리 실행
 */

import sql from 'mssql';
import { ConnectionInfo } from '../utils/validation';
import { QueryResult } from './postgres';

export async function executeMssqlQuery(
  connection: ConnectionInfo,
  sqlQuery: string,
  explainOnly: boolean = false
): Promise<QueryResult> {
  const startTime = Date.now();

  const config: sql.config = {
    server: connection.host,
    port: connection.port,
    database: connection.database_name,
    user: connection.username,
    password: connection.password,
    options: {
      encrypt: false, // 내부망은 암호화 비활성화
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sql.connect(config);

    let finalSql = sqlQuery;

    // EXPLAIN 모드 (MSSQL은 SET SHOWPLAN_TEXT)
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

    const result = await pool.request().query(finalSql);
    const executionTimeMs = Date.now() - startTime;

    // 컬럼 이름 추출
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

export async function testMssqlConnection(connection: ConnectionInfo): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
}> {
  const config: sql.config = {
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

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sql.connect(config);
    const result = await pool.request().query('SELECT @@VERSION as version');
    const version = result.recordset[0]?.version || 'Unknown';

    return {
      success: true,
      message: '연결 성공',
      serverVersion: version.split('\n')[0], // 첫 줄만
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
