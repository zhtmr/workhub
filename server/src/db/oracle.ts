/**
 * Oracle 연결 및 쿼리 실행
 */

import oracledb from 'oracledb';
import { ConnectionInfo } from '../utils/validation';
import { QueryResult } from './postgres';

// Oracle 클라이언트 초기화 (선택적)
try {
  // Instant Client가 설치된 경우에만 초기화
  // oracledb.initOracleClient({ libDir: '/path/to/instantclient' });
} catch (err) {
  // Instant Client가 없어도 Thin 모드로 동작 가능 (Oracle 21c+)
}

export async function executeOracleQuery(
  connection: ConnectionInfo,
  sql: string,
  explainOnly: boolean = false
): Promise<QueryResult> {
  const startTime = Date.now();

  let conn: oracledb.Connection | null = null;

  try {
    conn = await oracledb.getConnection({
      user: connection.username,
      password: connection.password,
      connectString: `${connection.host}:${connection.port}/${connection.database_name}`,
    });

    // 쿼리 타임아웃 설정 (30초)
    conn.callTimeout = 30000;

    let finalSql = sql;
    let result: oracledb.Result<unknown>;

    // EXPLAIN 모드
    if (explainOnly) {
      // Oracle EXPLAIN PLAN
      await conn.execute(`EXPLAIN PLAN FOR ${sql}`);
      result = await conn.execute(
        `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'ALL'))`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const executionTimeMs = Date.now() - startTime;
      return {
        success: true,
        explainPlan: result.rows,
        executionTimeMs,
      };
    }

    result = await conn.execute(finalSql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: 1000, // 최대 1000행
    });

    const executionTimeMs = Date.now() - startTime;

    // 컬럼 이름 추출
    const columns = result.metaData?.map(m => m.name) || [];

    return {
      success: true,
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.rows?.length || 0,
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
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr);
      }
    }
  }
}

export async function testOracleConnection(connection: ConnectionInfo): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
}> {
  let conn: oracledb.Connection | null = null;

  try {
    conn = await oracledb.getConnection({
      user: connection.username,
      password: connection.password,
      connectString: `${connection.host}:${connection.port}/${connection.database_name}`,
    });

    const result = await conn.execute(
      `SELECT * FROM V$VERSION WHERE ROWNUM = 1`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const version = (result.rows as { BANNER: string }[])?.[0]?.BANNER || 'Unknown';

    return {
      success: true,
      message: '연결 성공',
      serverVersion: version,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `연결 실패: ${err.message}`,
    };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr);
      }
    }
  }
}
