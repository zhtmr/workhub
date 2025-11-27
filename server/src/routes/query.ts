/**
 * 쿼리 실행 라우트
 */

import { Router, Request, Response } from 'express';
import { validateSelectOnly, validateConnection, ConnectionInfo } from '../utils/validation';
import { executePostgresQuery, QueryResult } from '../db/postgres';
import { executeMysqlQuery } from '../db/mysql';
import { executeOracleQuery } from '../db/oracle';
import { executeMssqlQuery } from '../db/mssql';

export const queryRouter = Router();

interface ExecuteQueryRequest {
  connection: ConnectionInfo;
  sql: string;
  parameters?: Record<string, unknown>;
  explainOnly?: boolean;
}

/**
 * POST /api/execute-query
 * 쿼리 실행
 */
queryRouter.post('/execute-query', async (req: Request, res: Response) => {
  try {
    const body = req.body as ExecuteQueryRequest;

    // 연결 정보 검증
    const connValidation = validateConnection(body.connection);
    if (!connValidation.valid || !connValidation.connection) {
      res.status(400).json({
        success: false,
        error: connValidation.error,
      });
      return;
    }

    const connection = connValidation.connection;

    // SQL 검증
    if (!body.sql || typeof body.sql !== 'string') {
      res.status(400).json({
        success: false,
        error: 'SQL이 필요합니다',
      });
      return;
    }

    const sqlValidation = validateSelectOnly(body.sql);
    if (!sqlValidation.valid) {
      res.status(400).json({
        success: false,
        error: sqlValidation.error,
      });
      return;
    }

    // DB 타입에 따라 실행
    let result: QueryResult;

    switch (connection.db_type) {
      case 'postgresql':
        result = await executePostgresQuery(connection, body.sql, body.explainOnly);
        break;
      case 'mysql':
        result = await executeMysqlQuery(connection, body.sql, body.explainOnly);
        break;
      case 'oracle':
        result = await executeOracleQuery(connection, body.sql, body.explainOnly);
        break;
      case 'mssql':
        result = await executeMssqlQuery(connection, body.sql, body.explainOnly);
        break;
      default:
        res.status(400).json({
          success: false,
          error: `지원하지 않는 DB 타입: ${connection.db_type}`,
        });
        return;
    }

    // 결과 행 수 제한 (최대 1000행)
    if (result.rows && result.rows.length > 1000) {
      result.rows = result.rows.slice(0, 1000);
      result.warning = `결과가 1000행을 초과하여 잘렸습니다 (전체: ${result.rowCount}행)`;
    }

    res.json(result);
  } catch (error) {
    console.error('Execute query error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || '쿼리 실행 중 오류가 발생했습니다',
    });
  }
});
