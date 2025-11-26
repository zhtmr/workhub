# WorkHub 남은 스프린트 구현 계획

> 마지막 업데이트: 2025-11-27 Sprint 7 완료

## 프로젝트 현황

| 항목 | 내용 |
|------|------|
| 타겟 사용자 | 개인 개발자 + 팀 협업 |
| 배포 환경 | 클라우드 (Vercel/Netlify) |
| 데이터 저장 | Supabase (인증 + PostgreSQL) |

### 스프린트 진행 현황

| Sprint | 상태 | 내용 | 주요 산출물 |
|--------|------|------|-------------|
| Sprint 1 | ✅ 완료 | 인증/저장 시스템 | Supabase, OAuth, 다크모드, 히스토리 |
| Sprint 1.5 | ✅ 완료 | DDL 엑셀 포맷 개선 | ExcelJS 템플릿 기반, 서식 보존, 메타데이터 입력 |
| Sprint 2 | ✅ 완료 | Markdown 에디터 | 에디터/미리보기, GFM, 코드 하이라이팅 |
| Sprint 3 | ✅ 완료 | 데이터 분석 도구 | 데이터 테이블, 차트(4종), 통계, 피벗 |
| Sprint 4 | ✅ 완료 | JSON/정규식 도구 | JSON 뷰어, 정규식 테스터, TS 인터페이스 생성 |
| Sprint 5 | ✅ 완료 | 인코딩/Diff 도구 | Base64, URL, UUID, 해시, Diff 비교 |
| Sprint 6 | ✅ 완료 | UX 개선 | 단축키, 드래그앤드롭, 명령 팔레트, 온보딩 |
| Sprint 7 | ✅ 완료 | 팀 인프라 + 배포 대시보드 | 팀/조직, GitLab CI/CD, 대시보드 MVP |
| Sprint 8 | 🔜 예정 | 배포 완성 + MyBatis 기초 | Webhook, Docker, XML 파서 |
| Sprint 9 | 🔜 예정 | MyBatis 완성 + 환경변수 | 쿼리 실행, EXPLAIN, 환경변수 CRUD |
| Sprint 10 | 🔜 예정 | 환경변수 완성 + 코드 리뷰 | 감사 로그, Spring Boot 체크리스트 |
| Sprint 11 | 🔜 예정 | 코드 리뷰 완성 + API 영향도 | 통계, OpenAPI, 영향도 그래프 |

---

## Sprint 1.5: DDL 엑셀 포맷 개선 (우선 작업)

> 참조: `sample.xlsx` - 테이블 정의서 표준 포맷

### 목표

현재 엑셀 내보내기 포맷을 `sample.xlsx` 형태의 표준 테이블 정의서 포맷으로 개선

### sample.xlsx 시트 구성

| 시트 | 내용 |
|------|------|
| 표지 | 문서 표지 (시스템명, 작성자, 문서번호, 버전 등) |
| 개정이력 | 변경 이력 (NO, 변경내용, 등록일, 등록자) |
| 테이블 설명 | 테이블 목록 (NO, 스키마명, 테이블명, 테이블 설명) |
| [테이블명] | 각 테이블별 컬럼 정의 시트 |

### 사용자 입력 필드 (다운로드 전 입력)

| 필드 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| 시스템명 | ✅ | - | 프로젝트/시스템 이름 |
| 문서번호 | ❌ | 자동생성 | 문서 식별번호 |
| 작성자 | ✅ | - | 작성자 이름 (소속 포함) |
| 작성일 | ❌ | 오늘 날짜 | 문서 작성일 |
| 버전 | ❌ | v1.0 | 문서 버전 |
| 데이터베이스명 | ✅ | - | DB 이름 |
| 스키마명 | ✅ | public | 스키마 이름 |

### 테이블별 시트 구조

**헤더 영역:**
```
시스템명: [시스템명]     | 작성일: [작성일]
데이터베이스명: [DB명]    | 스키마명: [스키마명]
테이블명: [테이블명]      | 신규/변경여부: Y
테이블 설명: [테이블 설명]
```

**컬럼 정의 영역:**
| NO | 칼럼명 | TYPE | 길이 | PK | FK | NULL | DEFAULT | 컬럼설명 |
|----|--------|------|------|----|----|------|---------|----------|

**특이사항 영역:** (하단)

### 구현 작업

1. **ExportSettingsDialog 컴포넌트 생성**
   - 다운로드 전 메타데이터 입력 다이얼로그
   - 필수 필드 검증
   - 기본값 자동 설정

2. **excelExporter.ts 개선**
   - 4개 시트 생성 로직 (표지, 개정이력, 테이블목록, 테이블별)
   - 셀 병합, 스타일링 적용
   - 헤더/푸터 레이아웃

3. **DdlConverter.tsx 수정**
   - 내보내기 버튼 클릭 시 다이얼로그 표시
   - 메타데이터 전달

### 파일 구조

```
src/
├── components/
│   └── ExportSettingsDialog.tsx   # 메타데이터 입력 다이얼로그
├── utils/
│   └── excelExporter.ts           # 기존 파일 개선
└── types/
    └── excel.ts                   # 엑셀 내보내기 타입 정의
```

### 수정 필요 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/utils/excelExporter.ts` | 4개 시트 생성, 스타일링 |
| `src/pages/DdlConverter.tsx` | 다이얼로그 연동 |
| `src/components/ExportSettingsDialog.tsx` | 신규 생성 |

---

## Sprint 1 완료 내용 (참고)

### 구현된 파일

```
src/
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트
│   └── supabase-fetch.ts        # Direct fetch wrapper (SDK 우회)
├── providers/
│   ├── AuthProvider.tsx         # 인증 컨텍스트 (이메일/Google OAuth)
│   └── ThemeProvider.tsx        # 다크모드 프로바이더
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── UserMenu.tsx
│   │   └── ThemeToggle.tsx
│   └── history/
│       ├── HistoryList.tsx
│       └── HistoryCard.tsx
├── hooks/
│   └── use-history.ts
├── types/
│   └── database.ts
└── pages/
    ├── Auth.tsx
    └── History.tsx
```

### 기술적 참고사항

- **Supabase SDK 이슈**: SDK의 `await`가 완료되지 않는 문제 → `supabase-fetch.ts`로 direct fetch 방식 사용
- **인증 토큰**: AuthProvider의 `session.access_token` 활용

---

## Sprint 2: Markdown 에디터 (완료)

### 구현된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| Markdown Editor | 툴바 + textarea 에디터 | ✅ |
| Markdown Preview | 실시간 미리보기 (GFM) | ✅ |
| 코드 하이라이팅 | highlight.js 연동 | ✅ |
| 파일 업로드 | 드래그앤드롭 .md 파일 | ✅ |
| 복사/다운로드 | 클립보드 복사, .md 다운로드 | ✅ |

> PDF 변환은 추후 구현 예정

### 사용 패키지

```bash
npm install react-markdown remark-gfm rehype-highlight highlight.js
```

### 구현된 파일

```
src/
├── components/
│   └── document/
│       ├── MarkdownToolbar.tsx    # 포맷팅 툴바 (볼드, 헤딩, 리스트 등)
│       ├── MarkdownEditor.tsx     # 에디터 (툴바 + textarea + 드래그앤드롭)
│       └── MarkdownPreview.tsx    # 실시간 미리보기 (GFM, 코드 하이라이팅)
└── pages/
    └── DocumentConverter.tsx      # 통합 페이지 (좌우 분할 레이아웃)
```

### 주요 기능

- **MarkdownToolbar**: 볼드, 이탤릭, 취소선, 헤딩(H1-H3), 목록, 인용, 코드, 링크, 이미지, 테이블, 구분선
- **MarkdownEditor**: 커서 위치 기반 텍스트 삽입, .md 파일 드래그앤드롭
- **MarkdownPreview**: react-markdown + GFM + rehype-highlight, 테이블/코드블록/체크리스트 스타일링

---

## Sprint 3: 데이터 분석 도구 (완료)

### 구현된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| CSV/Excel 업로드 | 드래그앤드롭, papaparse/xlsx | ✅ |
| 데이터 테이블 | 정렬/필터/페이지네이션 | ✅ |
| 기본 통계 | 개수, 합계, 평균, 최소, 최대, 표준편차, 중앙값 | ✅ |
| 차트 시각화 | 막대, 라인, 파이, 스캐터 (4종) | ✅ |
| 피벗 테이블 | 행/열/값 필드 선택, 집계 (Sum/Count/Avg/Min/Max) | ✅ |

### 사용 패키지

```bash
npm install papaparse simple-statistics
```

### 구현된 파일

```
src/
├── components/
│   └── analysis/
│       ├── DataUploader.tsx      # 드래그앤드롭 파일 업로드
│       ├── DataTable.tsx         # 정렬/필터/페이지네이션 테이블
│       ├── DataStats.tsx         # 통계 카드 (6개 지표)
│       ├── ChartBuilder.tsx      # 차트 설정 UI
│       ├── ChartPreview.tsx      # recharts 기반 차트
│       └── PivotTable.tsx        # 피벗 테이블 (행/열/값 집계)
├── utils/
│   ├── dataParser.ts             # CSV/Excel 통합 파싱
│   └── statistics.ts             # 통계 계산 (simple-statistics)
└── pages/
    └── DataAnalysis.tsx          # 탭 기반 통합 페이지
```

### 주요 기능

- **DataUploader**: CSV/Excel 드래그앤드롭, 파일 타입 자동 감지
- **DataTable**: 컬럼 정렬, 텍스트 필터, 페이지네이션 (10/25/50/100)
- **DataStats**: 숫자형 컬럼 자동 감지, 6개 통계 카드 + 추가 통계
- **ChartBuilder/Preview**: 4가지 차트 타입, X/Y축 선택, recharts 렌더링
- **PivotTable**: 행/열/값 필드 선택, 5가지 집계 함수, 행/열 합계

---

## Sprint 4: JSON/정규식 도구 (완료)

### 구현된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| JSON 편집기 | 라인 번호, 문법 오류 표시, 포맷/압축 | ✅ |
| JSON 트리 뷰 | 접기/펼치기, 타입별 색상, 복사 | ✅ |
| TS 인터페이스 생성 | JSON → TypeScript 타입 자동 변환 | ✅ |
| 정규식 테스터 | 패턴 입력, 플래그 옵션 (g,i,m,s,u) | ✅ |
| 실시간 하이라이팅 | 매칭 텍스트 색상 구분 | ✅ |
| 캡처 그룹 표시 | 그룹별 매칭 결과 및 위치 | ✅ |

### 구현된 파일

```
src/
├── components/
│   ├── json/
│   │   ├── JsonEditor.tsx           # JSON 편집기 (라인 번호, 에러 표시)
│   │   ├── JsonTreeView.tsx         # 재귀적 트리 뷰
│   │   └── TypeScriptGenerator.tsx  # TS 인터페이스 생성기
│   └── regex/
│       ├── RegexInput.tsx           # 패턴 + 플래그 입력
│       ├── TestTextArea.tsx         # 하이라이트 텍스트 영역
│       └── MatchResults.tsx         # 매칭 결과 목록
├── utils/
│   ├── jsonUtils.ts                 # JSON 파싱/포맷팅/검증
│   └── tsGenerator.ts               # JSON → TypeScript 변환
└── pages/
    ├── JsonViewer.tsx               # 탭 기반 JSON 도구
    └── RegexTester.tsx              # 정규식 테스터 페이지
```

### 주요 기능

- **JsonEditor**: 라인 번호 표시, 에러 위치 표시, 포맷/압축/복사 버튼
- **JsonTreeView**: 객체/배열 접기/펼치기, 타입별 색상 (문자열=녹색, 숫자=파랑 등)
- **TypeScriptGenerator**: 중첩 인터페이스 생성, 배열 타입 추론, 복사 기능
- **RegexInput**: 슬래시 형식 표시, 5가지 플래그 (g, i, m, s, u)
- **TestTextArea**: 실시간 매칭 하이라이팅, 색상 순환
- **MatchResults**: 매칭 번호, 위치, 캡처 그룹 상세 표시

---

## Sprint 5: 인코딩/Diff 도구 (완료)

### 구현된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| Base64 인코딩 | 텍스트/파일 인코드/디코드, 파일 다운로드 | ✅ |
| URL 인코딩 | encodeURIComponent 기반 인코드/디코드 | ✅ |
| UUID 생성 | v4 랜덤 UUID, 다중 생성, 복사 | ✅ |
| 해시 생성 | MD5, SHA-1, SHA-256, SHA-384, SHA-512 | ✅ |
| Diff 비교 | 좌우 비교/인라인 뷰, 라인 번호, 추가/삭제 표시 | ✅ |

### 사용 패키지

```bash
npm install diff
```

### 구현된 파일

```
src/
├── components/
│   ├── encoding/
│   │   ├── Base64Tool.tsx       # 텍스트/파일 Base64 변환
│   │   ├── UrlEncoder.tsx       # URL 인코딩/디코딩
│   │   ├── UuidGenerator.tsx    # UUID v4 생성 (다중)
│   │   └── HashGenerator.tsx    # MD5, SHA-1/256/384/512
│   └── diff/
│       ├── DiffEditor.tsx       # 라인 번호 에디터
│       └── DiffViewer.tsx       # 좌우/인라인 비교 뷰
├── utils/
│   └── encodingUtils.ts         # 인코딩/해시 유틸리티
└── pages/
    ├── EncodingTools.tsx        # 탭 기반 인코딩 도구
    └── DiffTool.tsx             # Diff 비교 페이지
```

### 주요 기능

- **Base64Tool**: 텍스트/파일 변환, 파일 업로드/다운로드, 좌우 교체
- **UrlEncoder**: URL 인코딩/디코딩, 예시 표시
- **UuidGenerator**: 1-100개 UUID 생성, 개별/전체 복사, UUID v4 정보
- **HashGenerator**: 5가지 해시 알고리즘, 비트 길이 표시, 개별/전체 복사
- **DiffViewer**: 좌우 비교(side-by-side)/인라인 뷰, 라인 번호, 추가/삭제 통계

---

## Sprint 6: UX 개선 (완료)

### 구현된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 키보드 단축키 | Ctrl+K 명령팔레트, Ctrl+/ 사이드바, Ctrl+1 대시보드 등 | ✅ |
| 명령 팔레트 | 빠른 페이지 이동, 테마 변경, 단축키 보기 | ✅ |
| 전역 드래그앤드롭 | 파일 드롭 시 해당 도구로 자동 이동 | ✅ |
| 실행 취소/재실행 | Ctrl+Z/Y 기반 히스토리 관리 훅 | ✅ |
| 최근 작업 | 로컬 스토리지 기반 최근 작업 추적 | ✅ |
| 온보딩 투어 | 첫 방문자 가이드, 설정에서 재시작 가능 | ✅ |

### 구현된 파일

```
src/
├── hooks/
│   ├── use-keyboard-shortcuts.ts  # 전역 키보드 단축키 훅
│   ├── use-recent-work.ts         # 최근 작업 추적 훅
│   └── use-undo-redo.ts           # 실행 취소/재실행 훅
├── components/
│   ├── common/
│   │   ├── CommandPalette.tsx     # 명령 팔레트 (Ctrl+K)
│   │   ├── GlobalDropzone.tsx     # 전역 드래그앤드롭
│   │   └── OnboardingTour.tsx     # 온보딩 투어
│   └── layout/
│       └── Layout.tsx             # UX 기능 통합
└── pages/
    └── Settings.tsx               # UX 설정 추가
```

### 주요 단축키

| 단축키 | 기능 |
|--------|------|
| Ctrl+K | 명령 팔레트 열기 |
| Ctrl+/ | 사이드바 토글 |
| Ctrl+1 | 대시보드로 이동 |
| Ctrl+, | 설정으로 이동 |
| Ctrl+Z | 실행 취소 |
| Ctrl+Shift+Z | 다시 실행 |
| ? | 단축키 도움말 |

---

## Critical Files (참조용)

새 기능 구현 시 반드시 확인해야 할 파일:

| 파일 | 용도 |
|------|------|
| `src/App.tsx` | 라우팅, Provider 구조 |
| `src/components/layout/AppSidebar.tsx` | 사이드바 메뉴 추가 |
| `src/pages/DdlConverter.tsx` | 페이지 컴포넌트 패턴 |
| `src/utils/ddlParser.ts` | 유틸리티 패턴 |
| `src/hooks/use-history.ts` | 훅 패턴 (direct fetch 방식) |
| `src/lib/supabase-fetch.ts` | Supabase API 호출 패턴 |
| `CLAUDE.md` | 코딩 컨벤션 및 프로젝트 가이드 |

---

## Sprint 7: 팀 인프라 + 배포 대시보드 기초 (완료)

### 목표

팀/조직 구조 구축 및 배포 대시보드 MVP

### 구현 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 팀/조직 관리 | 팀 생성, 멤버 초대, 역할 관리 | ✅ |
| 프로젝트 등록 | GitLab URL, API 토큰, Prometheus 엔드포인트 | ✅ |
| GitLab API 연동 | 파이프라인 상태 조회 | ✅ |
| 배포 대시보드 UI | 프로젝트별 상태 카드, 타임라인 | ✅ |

### 구현된 파일

```
sql/
├── 001_sprint7_teams_deployment.sql  # DB 스키마
└── 003_fix_all_rls.sql               # RLS 정책 (무한재귀 수정)

src/
├── types/
│   └── deployment.ts                 # 타입 정의
├── hooks/
│   ├── use-teams.ts                  # 팀 CRUD 훅
│   └── use-deployment-projects.ts    # 프로젝트/파이프라인 훅
├── utils/
│   └── gitlabApi.ts                  # GitLab API 클라이언트
├── components/
│   └── deployment/
│       ├── index.ts
│       ├── PipelineStatusBadge.tsx
│       ├── DeploymentStats.tsx
│       ├── ProjectCard.tsx
│       ├── PipelineTimeline.tsx
│       └── ProjectRegistrationDialog.tsx
├── pages/
│   └── DeploymentDashboard.tsx
└── components/layout/
    └── AppSidebar.tsx                # DevOps 메뉴 추가
```

### Database Schema

```sql
-- 팀 테이블
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 팀 멤버
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 배포 프로젝트
CREATE TABLE deployment_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  gitlab_url VARCHAR(500),
  gitlab_project_id VARCHAR(50),
  gitlab_api_token_encrypted TEXT,
  prometheus_endpoint VARCHAR(500),
  docker_host VARCHAR(500),
  webhook_secret VARCHAR(100) DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 파이프라인 이벤트
CREATE TABLE pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES deployment_projects(id) ON DELETE CASCADE,
  pipeline_id VARCHAR(50) NOT NULL,
  ref VARCHAR(200),
  status VARCHAR(50), -- 'pending', 'running', 'success', 'failed'
  commit_sha VARCHAR(40),
  commit_message TEXT,
  author_name VARCHAR(100),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  stages JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 파일 구조

```
src/
├── pages/
│   └── DeploymentDashboard.tsx
├── components/
│   └── deployment/
│       ├── ProjectRegistrationDialog.tsx
│       ├── ProjectCard.tsx
│       ├── PipelineTimeline.tsx
│       ├── PipelineStatusBadge.tsx
│       └── DeploymentStats.tsx
├── hooks/
│   ├── use-teams.ts
│   └── use-deployment-projects.ts
├── utils/
│   └── gitlabApi.ts
└── types/
    └── deployment.ts
```

---

## Sprint 8: 배포 대시보드 완성 + MyBatis 기초

### 목표

Webhook 수신, Prometheus/Docker 연동, MyBatis 파서 구현

### 구현 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| GitLab Webhook | Edge Function으로 파이프라인 이벤트 수신 | 🔜 |
| Prometheus 연동 | 메트릭 조회, 차트 시각화 | 🔜 |
| Docker 상태 | 컨테이너 헬스체크 모니터링 | 🔜 |
| MyBatis XML 파서 | select/insert/update/delete 구문 파싱 | 🔜 |
| DB 연결 관리 | 연결 정보 암호화 저장 | 🔜 |

### 추가 Database Schema

```sql
-- 컨테이너 스냅샷
CREATE TABLE container_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES deployment_projects(id),
  container_name VARCHAR(200),
  status VARCHAR(50),
  health_status VARCHAR(50),
  cpu_percent DECIMAL(5,2),
  memory_usage_mb DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DB 연결 정보
CREATE TABLE db_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  db_type VARCHAR(20) DEFAULT 'postgresql',
  host_encrypted TEXT NOT NULL,
  port INTEGER DEFAULT 5432,
  database_name VARCHAR(100),
  username_encrypted TEXT,
  password_vault_key VARCHAR(100),
  is_read_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MyBatis 매퍼
CREATE TABLE mybatis_mappers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name VARCHAR(200) NOT NULL,
  namespace VARCHAR(200),
  xml_content TEXT NOT NULL,
  parsed_statements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 파일 구조 (추가)

```
src/
├── pages/
│   └── MybatisQueryTester.tsx
├── components/
│   ├── deployment/
│   │   ├── ContainerStatusGrid.tsx
│   │   ├── PrometheusChart.tsx
│   │   └── WebhookSettings.tsx
│   └── mybatis/
│       ├── XmlUploader.tsx
│       ├── XmlEditor.tsx
│       ├── StatementList.tsx
│       └── DbConnectionDialog.tsx
├── hooks/
│   ├── use-container-status.ts
│   ├── use-prometheus-metrics.ts
│   └── use-db-connections.ts
└── utils/
    ├── prometheusApi.ts
    └── mybatisParser.ts

supabase/functions/
└── gitlab-webhook/index.ts
```

---

## Sprint 9: MyBatis 완성 + 환경변수 관리 기초

### 목표

쿼리 실행/EXPLAIN 시각화, 환경변수 MVP

### 구현 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 파라미터 치환 | MyBatis 파라미터 → 실제 값 변환 | 🔜 |
| 쿼리 실행 | Edge Function으로 보안 실행 (SELECT만) | 🔜 |
| EXPLAIN 시각화 | 실행 계획 트리/테이블 표시 | 🔜 |
| 환경변수 CRUD | 환경별 변수 관리 (local/dev/prod) | 🔜 |
| .env 가져오기/내보내기 | 파일 파싱 및 생성 | 🔜 |

### 추가 Database Schema

```sql
-- 쿼리 실행 이력
CREATE TABLE query_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES db_connections(id),
  mapper_id UUID REFERENCES mybatis_mappers(id),
  statement_id VARCHAR(200),
  sql_executed TEXT NOT NULL,
  parameters JSONB,
  result_row_count INTEGER,
  execution_time_ms INTEGER,
  explain_result JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 환경 정의
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  UNIQUE(team_id, name)
);

-- 환경변수 그룹
CREATE TABLE env_variable_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 환경변수
CREATE TABLE env_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES env_variable_groups(id),
  environment_id UUID NOT NULL REFERENCES environments(id),
  key VARCHAR(200) NOT NULL,
  value_vault_key VARCHAR(200),
  value_plain TEXT,
  is_secret BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, environment_id, key)
);
```

### 파일 구조 (추가)

```
src/
├── pages/
│   └── EnvManager.tsx
├── components/
│   ├── mybatis/
│   │   ├── ParameterForm.tsx
│   │   ├── SqlPreview.tsx
│   │   ├── QueryExecutor.tsx
│   │   ├── ResultTable.tsx
│   │   └── ExplainViewer.tsx
│   └── env/
│       ├── EnvironmentTabs.tsx
│       ├── VariableGroupCard.tsx
│       ├── VariableTable.tsx
│       ├── VariableForm.tsx
│       └── ImportExportDialog.tsx
├── hooks/
│   ├── use-query-execution.ts
│   ├── use-environments.ts
│   └── use-env-variables.ts
└── utils/
    ├── sqlParameterizer.ts
    ├── envFileParser.ts
    └── envFileExporter.ts

supabase/functions/
└── execute-query/index.ts
```

---

## Sprint 10: 환경변수 완성 + 코드 리뷰 체크리스트

### 목표

변경 이력 추적, 팀 공유, 코드 리뷰 MVP

### 구현 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 감사 로그 | 환경변수 변경 이력 추적 | 🔜 |
| 환경별 비교 | local/dev/prod 값 비교 뷰 | 🔜 |
| 팀 공유 | 환경변수 그룹 팀원 공유 | 🔜 |
| Spring Boot 체크리스트 | 기본 템플릿 제공 | 🔜 |
| 리뷰 세션 관리 | 시작/완료, PR 연동 | 🔜 |

### 추가 Database Schema

```sql
-- 환경변수 감사 로그
CREATE TABLE env_variable_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_id UUID NOT NULL REFERENCES env_variables(id),
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
  old_value_hash VARCHAR(64),
  new_value_hash VARCHAR(64),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리뷰 템플릿
CREATE TABLE review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50), -- 'spring-boot', 'react', 'security'
  items JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리뷰 세션
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  template_id UUID REFERENCES review_templates(id),
  title VARCHAR(300) NOT NULL,
  pr_url VARCHAR(500),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 체크 결과
CREATE TABLE review_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES review_sessions(id),
  item_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'skipped'
  comment TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 파일 구조 (추가)

```
src/
├── pages/
│   └── CodeReviewHelper.tsx
├── components/
│   ├── env/
│   │   ├── AuditLogDrawer.tsx
│   │   ├── CompareView.tsx
│   │   └── TeamShareDialog.tsx
│   └── review/
│       ├── TemplateSelector.tsx
│       ├── ChecklistView.tsx
│       ├── CheckItem.tsx
│       ├── SessionSummary.tsx
│       └── ReviewStats.tsx
├── hooks/
│   ├── use-env-audit-log.ts
│   ├── use-review-templates.ts
│   └── use-review-sessions.ts
└── data/
    └── springBootChecklist.ts
```

---

## Sprint 11: 코드 리뷰 완성 + API 영향도 분석기

### 목표

리뷰 통계, API 영향도 분석 MVP

### 구현 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 리뷰 통계 | 팀/개인별 통계 대시보드 | 🔜 |
| 커스텀 템플릿 | 체크리스트 템플릿 편집 | 🔜 |
| API 수동 등록 | 엔드포인트 정보 입력 | 🔜 |
| OpenAPI 가져오기 | swagger.json/openapi.yaml 파싱 | 🔜 |
| 컨슈머 매핑 | API 사용처 연결 | 🔜 |
| 영향도 그래프 | 변경 영향 시각화 | 🔜 |

### 추가 Database Schema

```sql
-- API 엔드포인트
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  service_name VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  description TEXT,
  request_schema JSONB,
  response_schema JSONB,
  deprecated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, service_name, method, path)
);

-- API 컨슈머
CREATE TABLE api_consumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES api_endpoints(id),
  consumer_type VARCHAR(50) NOT NULL, -- 'frontend', 'external', 'mobile'
  consumer_name VARCHAR(200) NOT NULL,
  file_path VARCHAR(500),
  component_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 변경 기록
CREATE TABLE api_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES api_endpoints(id),
  change_type VARCHAR(50) NOT NULL, -- 'breaking', 'non-breaking', 'deprecation'
  description TEXT NOT NULL,
  impact_level VARCHAR(20),
  affected_consumers UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 파일 구조 (추가)

```
src/
├── pages/
│   └── ApiImpactAnalyzer.tsx
├── components/
│   ├── review/
│   │   ├── TemplateEditor.tsx
│   │   └── StatsByCategory.tsx
│   └── api-impact/
│       ├── EndpointRegistration.tsx
│       ├── EndpointList.tsx
│       ├── ConsumerMapping.tsx
│       ├── ImpactGraph.tsx
│       ├── ImpactReport.tsx
│       └── OpenApiImporter.tsx
├── hooks/
│   ├── use-review-stats.ts
│   ├── use-api-endpoints.ts
│   └── use-api-consumers.ts
└── utils/
    ├── impactCalculator.ts
    ├── reportGenerator.ts
    └── openApiParser.ts
```

---

## Sprint 7-11 공통 작업

### AppSidebar.tsx 메뉴 추가

```typescript
import {
  Rocket,         // 배포 대시보드
  Database,       // MyBatis 테스터
  KeyRound,       // 환경변수 관리
  ClipboardCheck, // 코드 리뷰
  GitBranch,      // API 영향도
} from "lucide-react";

const devOpsItems = [
  { title: "배포 현황", url: "/deployment-dashboard", icon: Rocket },
  { title: "MyBatis 테스터", url: "/mybatis-tester", icon: Database },
  { title: "환경변수 관리", url: "/env-manager", icon: KeyRound },
  { title: "코드 리뷰 헬퍼", url: "/code-review", icon: ClipboardCheck },
  { title: "API 영향도 분석", url: "/api-impact", icon: GitBranch },
];
```

### App.tsx 라우트 추가

```typescript
<Route path="/deployment-dashboard" element={<DeploymentDashboard />} />
<Route path="/mybatis-tester" element={<MybatisQueryTester />} />
<Route path="/env-manager" element={<EnvManager />} />
<Route path="/code-review" element={<CodeReviewHelper />} />
<Route path="/api-impact" element={<ApiImpactAnalyzer />} />
```

### 의존성 추가

```bash
npm install pg xmldom xpath jspdf file-saver
npm install -D @types/pg @types/file-saver
```

### 보안 고려사항

| 영역 | 조치 |
|------|------|
| API 토큰 | pgcrypto 또는 Supabase Vault 암호화 |
| DB 자격증명 | Vault 저장, Edge Function에서만 복호화 |
| 쿼리 실행 | SELECT만 허용, 타임아웃 30초 |
| Webhook | 프로젝트별 고유 시크릿 검증 |
| 환경변수 | 민감값 마스킹, 해시만 로깅 |

---

## 향후 확장 (Phase 6)

### 고급 기능

- 실시간 알림 (Supabase Realtime)
- 슬랙/디스코드 연동
- 대시보드 커스터마이징
- API 문서 자동 생성
- 테스트 커버리지 연동
