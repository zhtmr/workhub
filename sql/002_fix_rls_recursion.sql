-- Sprint 7: RLS 무한 재귀 수정
-- 기존 정책을 삭제하고 새로 생성

-- =====================================================
-- 1. 기존 정책 삭제
-- =====================================================
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;

DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Team admins can add members" ON team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON team_members;

DROP POLICY IF EXISTS "Team members can view projects" ON deployment_projects;
DROP POLICY IF EXISTS "Team admins can manage projects" ON deployment_projects;

DROP POLICY IF EXISTS "Team members can view pipeline events" ON pipeline_events;
DROP POLICY IF EXISTS "Service role can insert pipeline events" ON pipeline_events;

-- =====================================================
-- 2. Teams 정책 (수정 없음)
-- =====================================================
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
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

-- =====================================================
-- 3. Team Members 정책 (무한 재귀 수정!)
-- =====================================================

-- SELECT: 자신의 멤버십은 직접 확인, 같은 팀원은 teams 테이블 통해 확인
CREATE POLICY "Users can view their own memberships"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- INSERT: 팀 소유자는 직접 멤버 추가 가능
-- 트리거는 SECURITY DEFINER로 실행되므로 별도 처리
CREATE POLICY "Team owners can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    OR user_id = auth.uid() -- 자기 자신 추가 허용 (트리거용)
  );

-- DELETE: 팀 소유자만 멤버 삭제 가능
CREATE POLICY "Team owners can remove members"
  ON team_members FOR DELETE
  USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 4. Deployment Projects 정책
-- =====================================================

-- SELECT: 팀 멤버 또는 팀 소유자
CREATE POLICY "Team members can view projects"
  ON deployment_projects FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- INSERT: 팀 소유자만
CREATE POLICY "Team owners can create projects"
  ON deployment_projects FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- UPDATE: 팀 소유자만
CREATE POLICY "Team owners can update projects"
  ON deployment_projects FOR UPDATE
  USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- DELETE: 팀 소유자만
CREATE POLICY "Team owners can delete projects"
  ON deployment_projects FOR DELETE
  USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 5. Pipeline Events 정책
-- =====================================================
CREATE POLICY "Team members can view pipeline events"
  ON pipeline_events FOR SELECT
  USING (
    project_id IN (
      SELECT dp.id FROM deployment_projects dp
      WHERE dp.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
         OR dp.team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    )
  );

-- Webhook을 통한 삽입은 service_role 키 사용
CREATE POLICY "Service role can insert pipeline events"
  ON pipeline_events FOR INSERT
  WITH CHECK (true);
