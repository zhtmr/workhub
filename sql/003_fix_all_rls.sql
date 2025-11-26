-- Sprint 7: RLS 완전 재설계 (무한 재귀 방지)
-- SECURITY DEFINER 함수를 사용해 RLS 우회

-- =====================================================
-- 1. 모든 기존 정책 삭제
-- =====================================================
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;

DROP POLICY IF EXISTS "Users can view their own memberships" ON team_members;
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;
DROP POLICY IF EXISTS "Team admins can add members" ON team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON team_members;

DROP POLICY IF EXISTS "Team members can view projects" ON deployment_projects;
DROP POLICY IF EXISTS "Team owners can create projects" ON deployment_projects;
DROP POLICY IF EXISTS "Team owners can update projects" ON deployment_projects;
DROP POLICY IF EXISTS "Team owners can delete projects" ON deployment_projects;
DROP POLICY IF EXISTS "Team admins can manage projects" ON deployment_projects;

DROP POLICY IF EXISTS "Team members can view pipeline events" ON pipeline_events;
DROP POLICY IF EXISTS "Service role can insert pipeline events" ON pipeline_events;

-- =====================================================
-- 2. Helper Function (SECURITY DEFINER로 RLS 우회)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_team_owner(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams WHERE id = check_team_id AND owner_id = auth.uid()
  )
$$;

-- =====================================================
-- 3. Teams 정책
-- =====================================================
-- SELECT: 소유자이거나 멤버인 팀
CREATE POLICY "teams_select"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT get_user_team_ids())
  );

-- INSERT: 누구나 팀 생성 가능 (본인이 소유자로)
CREATE POLICY "teams_insert"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: 소유자만
CREATE POLICY "teams_update"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

-- DELETE: 소유자만
CREATE POLICY "teams_delete"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- =====================================================
-- 4. Team Members 정책
-- =====================================================
-- SELECT: 자신의 멤버십 또는 소유한 팀의 멤버
CREATE POLICY "team_members_select"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_team_owner(team_id)
  );

-- INSERT: 팀 소유자만 (트리거용 자기자신 추가 포함)
CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT
  WITH CHECK (
    is_team_owner(team_id)
    OR user_id = auth.uid()
  );

-- UPDATE: 팀 소유자만
CREATE POLICY "team_members_update"
  ON team_members FOR UPDATE
  USING (is_team_owner(team_id));

-- DELETE: 팀 소유자만
CREATE POLICY "team_members_delete"
  ON team_members FOR DELETE
  USING (is_team_owner(team_id));

-- =====================================================
-- 5. Deployment Projects 정책
-- =====================================================
-- SELECT: 팀 멤버
CREATE POLICY "deployment_projects_select"
  ON deployment_projects FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids()));

-- INSERT: 팀 소유자
CREATE POLICY "deployment_projects_insert"
  ON deployment_projects FOR INSERT
  WITH CHECK (is_team_owner(team_id));

-- UPDATE: 팀 소유자
CREATE POLICY "deployment_projects_update"
  ON deployment_projects FOR UPDATE
  USING (is_team_owner(team_id));

-- DELETE: 팀 소유자
CREATE POLICY "deployment_projects_delete"
  ON deployment_projects FOR DELETE
  USING (is_team_owner(team_id));

-- =====================================================
-- 6. Pipeline Events 정책
-- =====================================================
-- SELECT: 프로젝트 팀 멤버
CREATE POLICY "pipeline_events_select"
  ON pipeline_events FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM deployment_projects
      WHERE team_id IN (SELECT get_user_team_ids())
    )
  );

-- INSERT: 누구나 (Webhook용, 실제로는 Edge Function에서 service_role 사용)
CREATE POLICY "pipeline_events_insert"
  ON pipeline_events FOR INSERT
  WITH CHECK (true);
