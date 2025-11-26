-- Sprint 7: Teams & Deployment Dashboard Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. Teams (팀/조직)
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 팀 멤버
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- =====================================================
-- 2. Deployment Projects (배포 프로젝트)
-- =====================================================
CREATE TABLE IF NOT EXISTS deployment_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  -- GitLab 설정
  gitlab_url VARCHAR(500),
  gitlab_project_id VARCHAR(50),
  gitlab_api_token_encrypted TEXT,
  -- Prometheus 설정
  prometheus_endpoint VARCHAR(500),
  prometheus_auth_token_encrypted TEXT,
  -- Docker 설정
  docker_host VARCHAR(500),
  -- Webhook
  webhook_secret VARCHAR(100) DEFAULT gen_random_uuid()::text,
  -- 상태
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 파이프라인 이벤트
CREATE TABLE IF NOT EXISTS pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES deployment_projects(id) ON DELETE CASCADE,
  pipeline_id VARCHAR(50) NOT NULL,
  ref VARCHAR(200), -- branch name
  status VARCHAR(50) CHECK (status IN ('pending', 'running', 'success', 'failed', 'canceled', 'skipped', 'manual')),
  source VARCHAR(50), -- 'push', 'web', 'trigger', 'schedule', 'api'
  commit_sha VARCHAR(40),
  commit_message TEXT,
  author_name VARCHAR(100),
  author_email VARCHAR(200),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  stages JSONB, -- [{name, status, jobs: [{name, status}]}]
  raw_payload JSONB, -- 원본 webhook 데이터
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_deployment_projects_team ON deployment_projects(team_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_project ON pipeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_received ON pipeline_events(project_id, received_at DESC);

-- =====================================================
-- 3. Row Level Security (RLS)
-- =====================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;

-- Teams: 멤버만 조회 가능, 소유자만 수정 가능
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- Team Members: 같은 팀 멤버만 조회, admin 이상만 추가/삭제
CREATE POLICY "Team members can view members"
  ON team_members FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team admins can remove members"
  ON team_members FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Deployment Projects: 팀 멤버만 조회, admin 이상만 수정
CREATE POLICY "Team members can view projects"
  ON deployment_projects FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team admins can manage projects"
  ON deployment_projects FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Pipeline Events: 프로젝트 접근 권한이 있으면 조회 가능
CREATE POLICY "Team members can view pipeline events"
  ON pipeline_events FOR SELECT
  USING (
    project_id IN (
      SELECT dp.id FROM deployment_projects dp
      JOIN team_members tm ON dp.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Pipeline Events: 서비스 역할로만 삽입 가능 (Webhook용)
CREATE POLICY "Service role can insert pipeline events"
  ON pipeline_events FOR INSERT
  WITH CHECK (true); -- Edge Function에서 service role로 삽입

-- =====================================================
-- 4. Helper Functions
-- =====================================================

-- 팀 생성 시 자동으로 owner를 멤버로 추가하는 트리거
CREATE OR REPLACE FUNCTION add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_add_team_owner
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_team_owner_as_member();

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_deployment_projects_updated_at
  BEFORE UPDATE ON deployment_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
