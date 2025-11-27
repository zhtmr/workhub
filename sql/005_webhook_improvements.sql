-- Sprint 8: GitLab Webhook 개선
-- pipeline_events 테이블에 unique constraint 추가 (upsert 지원)

-- 기존 중복 데이터 정리 (있을 경우)
DELETE FROM pipeline_events a
USING pipeline_events b
WHERE a.id > b.id
  AND a.project_id = b.project_id
  AND a.pipeline_id = b.pipeline_id;

-- Unique constraint 추가
ALTER TABLE pipeline_events
ADD CONSTRAINT pipeline_events_project_pipeline_unique
UNIQUE (project_id, pipeline_id);

-- webhook_secret이 없는 프로젝트에 자동 생성
UPDATE deployment_projects
SET webhook_secret = gen_random_uuid()::text
WHERE webhook_secret IS NULL;

-- webhook_secret NOT NULL 제약 추가
ALTER TABLE deployment_projects
ALTER COLUMN webhook_secret SET NOT NULL;

-- 인덱스 추가 (webhook_secret으로 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_deployment_projects_webhook_secret
ON deployment_projects(webhook_secret);

-- pipeline_events에 인덱스 추가 (최근 파이프라인 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_pipeline_events_project_received
ON pipeline_events(project_id, received_at DESC);
