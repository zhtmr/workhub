-- Sprint 8: DB 연결 관리 스키마

-- DB 연결 정보 테이블
CREATE TABLE IF NOT EXISTS db_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  db_type VARCHAR(20) NOT NULL DEFAULT 'postgresql', -- postgresql, mysql, oracle, mssql
  host VARCHAR(200) NOT NULL,
  port INTEGER NOT NULL DEFAULT 5432,
  database_name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  -- 비밀번호는 암호화하여 저장 (실제 운영에서는 Vault 사용 권장)
  password_encrypted TEXT,
  ssl_mode VARCHAR(20) DEFAULT 'disable', -- disable, require, verify-ca, verify-full
  connection_options JSONB DEFAULT '{}',
  is_read_only BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_result BOOLEAN,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name)
);

-- RLS 정책
ALTER TABLE db_connections ENABLE ROW LEVEL SECURITY;

-- 팀 멤버만 조회/수정 가능
CREATE POLICY "Team members can manage db_connections"
ON db_connections
FOR ALL
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_db_connections_team ON db_connections(team_id);

-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_db_connections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_db_connections_updated
  BEFORE UPDATE ON db_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_db_connections_timestamp();

-- 쿼리 실행 이력 테이블 (Sprint 9 준비)
CREATE TABLE IF NOT EXISTS query_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
  mapper_id UUID,
  statement_id VARCHAR(200),
  sql_query TEXT NOT NULL,
  parameters JSONB,
  result_row_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  executed_by UUID NOT NULL REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE query_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view query_executions"
ON query_executions
FOR SELECT
USING (
  connection_id IN (
    SELECT dc.id FROM db_connections dc
    JOIN team_members tm ON dc.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can insert query_executions"
ON query_executions
FOR INSERT
WITH CHECK (
  connection_id IN (
    SELECT dc.id FROM db_connections dc
    JOIN team_members tm ON dc.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
  )
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_query_executions_connection ON query_executions(connection_id);
CREATE INDEX IF NOT EXISTS idx_query_executions_executed_at ON query_executions(executed_at DESC);
