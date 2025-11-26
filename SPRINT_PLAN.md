# WorkHub 남은 스프린트 구현 계획

> 마지막 업데이트: 2024년 Sprint 1 완료 후

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
| Sprint 1.5 | 🔜 다음 | DDL 엑셀 포맷 개선 | 표준 테이블 정의서 포맷, 메타데이터 입력 |
| Sprint 2 | ⏳ 대기 | 문서 변환 도구 | MD↔PDF 변환, 실시간 미리보기 |
| Sprint 3 | ⏳ 대기 | 데이터 분석 도구 | 데이터 테이블, 차트, 통계 |
| Sprint 4 | ⏳ 대기 | JSON/정규식 도구 | JSON 뷰어, 정규식 테스터 |
| Sprint 5 | ⏳ 대기 | 인코딩/Diff 도구 | Base64, URL, UUID, 해시, Diff |
| Sprint 6 | ⏳ 대기 | UX 개선 | 단축키, 드래그앤드롭 |

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

## Sprint 2: 문서 변환 도구

### 기능 범위

| 기능 | 설명 |
|------|------|
| Markdown → PDF | MD 파일을 PDF로 변환 |
| Markdown Preview | 실시간 미리보기 |
| PDF → Markdown | PDF 텍스트 추출 (기본) |
| 템플릿 시스템 | 문서 템플릿 제공 |

### 필요 패키지

```bash
npm install @react-pdf/renderer react-markdown remark-gfm rehype-highlight
```

### 파일 구조

```
src/
├── components/
│   └── document/
│       ├── MarkdownEditor.tsx     # 마크다운 에디터 (툴바 + textarea)
│       ├── MarkdownPreview.tsx    # 실시간 미리보기
│       ├── PdfPreview.tsx         # PDF 미리보기
│       └── DocumentUploader.tsx   # 파일 업로드
├── utils/
│   ├── markdownToPdf.ts          # MD → PDF 변환 유틸
│   └── pdfToMarkdown.ts          # PDF → MD 변환 유틸
└── pages/
    └── DocumentConverter.tsx      # 통합 페이지
```

### 구현 순서

1. MarkdownEditor 컴포넌트 (툴바 + textarea)
2. MarkdownPreview (react-markdown + GFM 지원)
3. markdownToPdf 변환 유틸리티
4. PdfPreview 컴포넌트
5. DocumentConverter 페이지 통합
6. 사이드바 메뉴 추가
7. 히스토리 저장 연동 (선택)

---

## Sprint 3: 데이터 분석 도구

### 기능 범위

| 기능 | 설명 |
|------|------|
| CSV/Excel 업로드 | 파일 파싱 및 데이터 추출 |
| 데이터 테이블 | 정렬/필터/페이지네이션 |
| 기본 통계 | 합계, 평균, 최대/최소, 표준편차 |
| 차트 시각화 | 막대, 라인, 파이, 스캐터 |
| 피벗 테이블 | 그룹핑 및 집계 |

### 활용 가능한 기존 패키지

- `xlsx` - Excel/CSV 파싱 (이미 설치됨)
- `recharts` - 차트 (이미 설치됨)
- `@tanstack/react-table` - 데이터 테이블 (이미 설치됨)

### 추가 패키지

```bash
npm install papaparse simple-statistics
```

### 파일 구조

```
src/
├── components/
│   └── analysis/
│       ├── DataUploader.tsx      # 파일 업로드
│       ├── DataTable.tsx         # 데이터 테이블 (정렬/필터)
│       ├── DataStats.tsx         # 통계 카드
│       ├── ChartBuilder.tsx      # 차트 설정 UI
│       ├── ChartPreview.tsx      # 차트 미리보기
│       └── PivotTable.tsx        # 피벗 테이블
├── utils/
│   ├── dataParser.ts             # CSV/Excel 파싱
│   ├── statistics.ts             # 통계 계산
│   └── chartConfig.ts            # 차트 설정
├── hooks/
│   └── use-data-analysis.ts      # 분석 상태 관리
└── pages/
    └── DataAnalysis.tsx          # 통합 페이지
```

### 구현 순서

1. DataUploader 컴포넌트
2. dataParser.ts (CSV/Excel 통합 파싱)
3. DataTable 컴포넌트 (정렬/필터)
4. statistics.ts 통계 유틸
5. DataStats 통계 카드 UI
6. ChartBuilder 차트 설정 UI
7. ChartPreview (recharts 활용)
8. DataAnalysis 페이지 통합

---

## Sprint 4: JSON/정규식 도구

### 4.1 JSON 뷰어/편집기

| 기능 | 설명 |
|------|------|
| JSON 포맷팅/검증 | 문법 오류 표시, 자동 포맷 |
| 트리 뷰 + 코드 뷰 | 계층 구조 탐색/원본 코드 |
| TS 인터페이스 생성 | JSON → TypeScript 타입 변환 |

**파일 구조:**
```
src/components/json/
├── JsonEditor.tsx           # JSON 편집기
├── JsonTreeView.tsx         # 트리 뷰
└── TypeScriptGenerator.tsx  # TS 인터페이스 생성
src/pages/JsonViewer.tsx
```

### 4.2 정규식 테스터

| 기능 | 설명 |
|------|------|
| 실시간 매칭 | 입력 텍스트에서 하이라이트 |
| 캡처 그룹 표시 | 그룹별 매칭 결과 |
| 패턴 저장 | 자주 쓰는 정규식 저장 |
| 플래그 옵션 | g, i, m, s 등 |

**파일 구조:**
```
src/components/regex/
├── RegexInput.tsx           # 정규식 입력
├── TestTextArea.tsx         # 테스트 텍스트
└── MatchResults.tsx         # 매칭 결과
src/pages/RegexTester.tsx
```

---

## Sprint 5: 인코딩/Diff 도구

### 5.1 인코딩 도구

| 기능 | 설명 |
|------|------|
| Base64 | 인코드/디코드 (텍스트, 이미지) |
| URL 인코딩 | encodeURIComponent |
| UUID 생성 | v4 랜덤 UUID |
| 해시 생성 | MD5, SHA-1, SHA-256 |

**파일 구조:**
```
src/components/encoding/
├── Base64Tool.tsx
├── UrlEncoder.tsx
├── UuidGenerator.tsx
└── HashGenerator.tsx
src/pages/EncodingTools.tsx
```

### 5.2 Diff 비교 도구

| 기능 | 설명 |
|------|------|
| 텍스트/코드 비교 | 두 입력 간 차이점 |
| 사이드바이사이드 | 좌우 비교 뷰 |
| 인라인 뷰 | 단일 뷰 변경점 표시 |
| 변경점 네비게이션 | 이전/다음 변경점 이동 |

**필요 패키지:**
```bash
npm install diff
```

**파일 구조:**
```
src/components/diff/
├── DiffEditor.tsx
├── DiffViewer.tsx
└── DiffNavigation.tsx
src/pages/DiffTool.tsx
```

---

## Sprint 6: UX 개선

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 키보드 단축키 | Ctrl+S 저장, Ctrl+Enter 실행 | 높음 |
| 전역 드래그앤드롭 | 어디서든 파일 업로드 | 높음 |
| 최근 작업 | 사이드바에 최근 사용 기능 | 중간 |
| 실행 취소/재실행 | 편집기 히스토리 | 중간 |
| 온보딩 튜토리얼 | 첫 방문자 가이드 | 낮음 |

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

## 향후 확장 (Phase 5)

### 팀 협업 기능

- 읽기 전용 공유 링크 생성
- 만료 시간 설정
- 조회 수 추적
- 조직/팀 생성
- 멤버 초대 및 권한 관리
