/**
 * MySQL 연결 및 쿼리 실행
 */

import mysql from 'mysql2/promise';
import { ConnectionInfo } from '../utils/validation';
import { QueryResult } from './postgres';

export async function executeMysqlQuery(
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
    // 쿼리 타임아웃 설정
    await conn.query('SET SESSION MAX_EXECUTION_TIME=30000');

    let finalSql = sql;

    // EXPLAIN 모드
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

    // 결과 처리
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

export async function testMysqlConnection(connection: ConnectionInfo): Promise<{
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
