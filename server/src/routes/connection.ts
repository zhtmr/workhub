/**
 * DB 연결 테스트 라우트
 */

import { Router, Request, Response } from 'express';
import { validateConnection, ConnectionInfo } from '../utils/validation';
import { testPostgresConnection } from '../db/postgres';
import { testMysqlConnection } from '../db/mysql';
import { testOracleConnection } from '../db/oracle';
import { testMssqlConnection } from '../db/mssql';

export const connectionRouter = Router();

interface TestConnectionRequest {
  connection: ConnectionInfo;
}

/**
 * POST /api/test-connection
 * DB 연결 테스트
 */
connectionRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const body = req.body as TestConnectionRequest;

    // 연결 정보 검증
    const connValidation = validateConnection(body.connection);
    if (!connValidation.valid || !connValidation.connection) {
      res.status(400).json({
        success: false,
        message: connValidation.error,
      });
      return;
    }

    const connection = connValidation.connection;

    // DB 타입에 따라 테스트
    let result: { success: boolean; message: string; serverVersion?: string };

    switch (connection.db_type) {
      case 'postgresql':
        result = await testPostgresConnection(connection);
        break;
      case 'mysql':
        result = await testMysqlConnection(connection);
        break;
      case 'oracle':
        result = await testOracleConnection(connection);
        break;
      case 'mssql':
        result = await testMssqlConnection(connection);
        break;
      default:
        res.status(400).json({
          success: false,
          message: `지원하지 않는 DB 타입: ${connection.db_type}`,
        });
        return;
    }

    res.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || '연결 테스트 중 오류가 발생했습니다',
    });
  }
});
