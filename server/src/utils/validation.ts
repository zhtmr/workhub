/**
 * SQL 검증 유틸리티
 */

// 위험한 SQL 키워드
const DANGEROUS_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'INTO OUTFILE',
  'LOAD_FILE', 'BENCHMARK', 'SLEEP',
];

// EXPLAIN 허용 키워드
const EXPLAIN_KEYWORDS = ['EXPLAIN', 'ANALYZE'];

/**
 * SELECT 쿼리만 허용 (EXPLAIN 포함)
 */
export function validateSelectOnly(sql: string): { valid: boolean; error?: string } {
  const trimmedSql = sql.trim().toUpperCase();

  // 빈 쿼리 체크
  if (!trimmedSql) {
    return { valid: false, error: '빈 쿼리입니다' };
  }

  // EXPLAIN으로 시작하는 경우 허용
  if (EXPLAIN_KEYWORDS.some(kw => trimmedSql.startsWith(kw))) {
    return { valid: true };
  }

  // SELECT로 시작해야 함
  if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('WITH')) {
    return { valid: false, error: 'SELECT 쿼리만 실행할 수 있습니다' };
  }

  // 위험한 키워드 체크 (서브쿼리 등에서 사용될 수 있으므로 단어 경계로 체크)
  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      return { valid: false, error: `위험한 키워드가 포함되어 있습니다: ${keyword}` };
    }
  }

  // 세미콜론으로 분리된 다중 쿼리 체크
  const statements = sql.split(';').filter(s => s.trim());
  if (statements.length > 1) {
    return { valid: false, error: '다중 쿼리는 지원하지 않습니다' };
  }

  return { valid: true };
}

/**
 * 연결 정보 검증
 */
export interface ConnectionInfo {
  db_type: 'postgresql' | 'mysql' | 'oracle' | 'mssql';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
}

export function validateConnection(conn: unknown): { valid: boolean; error?: string; connection?: ConnectionInfo } {
  if (!conn || typeof conn !== 'object') {
    return { valid: false, error: '연결 정보가 필요합니다' };
  }

  const c = conn as Record<string, unknown>;

  if (!['postgresql', 'mysql', 'oracle', 'mssql'].includes(c.db_type as string)) {
    return { valid: false, error: '지원하지 않는 DB 타입입니다' };
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
