# WorkHub - 통합 업무 시스템

## 프로젝트 개요

WorkHub는 업무 효율을 높이는 다양한 도구를 통합 제공하는 웹 기반 업무 시스템입니다.

### 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| DDL 변환기 | DDL 파싱, 테이블 정의서 Excel 내보내기, ERD 시각화 | ✅ 완료 |
| Excel/데이터 도구 | 파일 병합, 정제, 포맷 변환 | 🔜 예정 |
| 업무 자동화 | 워크플로우, 배치 작업 | 🔜 예정 |
| 협업/문서 관리 | 팀 공유, 버전 관리 | 🔜 예정 |

### 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:8080)
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint
```

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.3.x | UI 라이브러리 |
| TypeScript | 5.8.x | 타입 안전성 |
| Vite | 5.4.x | 빌드 도구 |
| React Router | 6.30.x | 클라이언트 사이드 라우팅 |
| TanStack Query | 5.x | 서버 상태 관리 |
| Tailwind CSS | 3.4.x | 유틸리티 CSS |
| shadcn/ui | latest | UI 컴포넌트 라이브러리 |
| Lucide React | 0.462.x | 아이콘 |

### Backend (BaaS)

| 기술 | 용도 |
|------|------|
| Supabase | 인증, 데이터베이스, 스토리지 |
| PostgreSQL | Supabase 기본 DB |
| Row Level Security | 데이터 접근 제어 |

### 주요 라이브러리

- `xlsx` - Excel 파일 처리
- `mermaid` - ERD/다이어그램 시각화
- `zod` - 스키마 유효성 검사
- `react-hook-form` - 폼 상태 관리
- `recharts` - 차트/시각화
- `sonner` - Toast 알림

---

## 디렉토리 구조

```
src/
├── components/           # 재사용 가능한 컴포넌트
│   ├── ui/              # shadcn/ui 기본 컴포넌트 (수정 금지)
│   ├── layout/          # 레이아웃 컴포넌트 (Header, Sidebar, Layout)
│   ├── common/          # 공통 비즈니스 컴포넌트
│   └── [feature]/       # 기능별 컴포넌트 (DDLUploader 등)
│
├── pages/               # 페이지 컴포넌트 (라우트당 1개)
│   ├── Dashboard.tsx
│   ├── DdlConverter.tsx
│   └── [FeatureName].tsx
│
├── features/            # 기능 모듈 (대규모 기능용)
│   └── [feature-name]/
│       ├── components/  # 기능 전용 컴포넌트
│       ├── hooks/       # 기능 전용 훅
│       ├── api/         # API 호출 함수
│       └── types.ts     # 기능 전용 타입
│
├── hooks/               # 전역 커스텀 훅
│   ├── use-toast.ts
│   ├── use-mobile.tsx
│   └── use-auth.ts      # Supabase 인증 훅
│
├── lib/                 # 유틸리티 및 설정
│   ├── utils.ts         # cn() 등 공통 유틸
│   ├── supabase.ts      # Supabase 클라이언트
│   └── constants.ts     # 상수 정의
│
├── utils/               # 비즈니스 로직 유틸리티
│   ├── ddlParser.ts     # DDL 파싱 로직
│   ├── excelExporter.ts # Excel 내보내기
│   └── [domain].ts      # 도메인별 유틸
│
├── types/               # 전역 타입 정의
│   ├── database.ts      # Supabase DB 타입
│   └── common.ts        # 공통 타입
│
├── App.tsx              # 앱 진입점 + 라우팅
├── main.tsx             # React 마운트
└── index.css            # 전역 스타일
```

---

## 컴포넌트 단위 개발 원칙

> **핵심 원칙**: 모든 개발은 재사용 가능하고 독립적인 컴포넌트 단위로 진행한다.

### 컴포넌트 분리 기준

| 기준 | 설명 |
|------|------|
| **단일 책임 원칙** | 한 컴포넌트는 하나의 역할만 담당 |
| **적정 크기** | 200줄 이상이면 분리 고려 |
| **재사용성** | 2회 이상 사용되면 공통 컴포넌트로 분리 |

### 컴포넌트 계층 구조 (Atomic Design)

```
UI 컴포넌트 (Atoms)
  └─ Button, Input, Card, Badge 등
  └─ 위치: src/components/ui/

복합 컴포넌트 (Molecules)
  └─ SearchBar, FileUploader, DataTable 등
  └─ 위치: src/components/common/

기능 컴포넌트 (Organisms)
  └─ DDLUploader, TablePreview, ErdViewer 등
  └─ 위치: src/components/[feature]/

페이지 컴포넌트 (Pages)
  └─ Dashboard, DdlConverter, Settings 등
  └─ 위치: src/pages/
```

### 컴포넌트 작성 템플릿

```typescript
// 1. imports (외부 라이브러리 → 내부 모듈)
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 2. Props 인터페이스 정의
interface ComponentNameProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

// 3. 상수 정의 (컴포넌트 외부)
const DEFAULT_VALUE = 10;

// 4. 헬퍼 함수 (컴포넌트 외부)
function formatValue(value: number): string {
  return value.toLocaleString();
}

// 5. 컴포넌트 정의
export function ComponentName({ title, onAction, className }: ComponentNameProps) {
  // 5-1. 훅 호출 (최상단)
  const [state, setState] = useState<string>("");

  // 5-2. 이벤트 핸들러
  const handleClick = () => {
    onAction?.();
  };

  // 5-3. 사이드 이펙트
  useEffect(() => {
    // 초기화 로직
  }, []);

  // 5-4. Early return (로딩/에러 상태)
  if (!title) return null;

  // 5-5. 메인 렌더링
  return (
    <div className={cn("base-class", className)}>
      <h2>{title}</h2>
      <Button onClick={handleClick}>액션</Button>
    </div>
  );
}
```

### 컴포넌트 분류별 Export 규칙

```typescript
// UI/공통 컴포넌트: named export
export function Button({ ... }: ButtonProps) { }
export { Button };

// 페이지 컴포넌트: default export
const Dashboard = () => { ... };
export default Dashboard;
```

---

## 코딩 컨벤션

### 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `TablePreview`, `DDLUploader` |
| 컴포넌트 파일 | PascalCase.tsx | `TablePreview.tsx` |
| 훅 | camelCase + use- 접두사 | `useAuth`, `useToast` |
| 유틸 함수 | camelCase | `parseDDL`, `exportToExcel` |
| 유틸 파일 | camelCase.ts | `ddlParser.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_URL` |
| 타입/인터페이스 | PascalCase | `Table`, `Column`, `DatabaseType` |
| 변수 | camelCase | `parsedTables`, `dbType` |

### TypeScript 규칙

```typescript
// 객체 형태: interface 사용
interface User {
  id: string;
  name: string;
  email: string;
}

// 유니온/유틸리티: type 사용
type DatabaseType = 'mysql' | 'postgresql' | 'auto';
type UserWithRole = User & { role: 'admin' | 'user' };

// 제네릭 활용
interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

// 함수 오버로딩 (복잡한 반환 타입)
export function parseDDL(ddlText: string, dbType?: DatabaseType): Table[];
export function parseDDL(ddlText: string, dbType: DatabaseType, debug: true): ParseResult;
```

### Import 규칙

```typescript
// @/ 별칭 사용 (절대 경로) - 권장
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// 상대 경로 사용 금지
// ❌ import { Button } from "../../components/ui/button";
// ✅ import { Button } from "@/components/ui/button";

// Import 순서
// 1. React/외부 라이브러리
// 2. 내부 컴포넌트
// 3. 유틸/훅
// 4. 타입
```

---

## Supabase 연동

### 클라이언트 설정

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### 환경 변수 설정

```env
# .env.local (gitignore에 포함)
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 인증 훅 구현

```typescript
// src/hooks/use-auth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### TanStack Query와 통합

```typescript
// API 함수 정의
async function getProjects(userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 컴포넌트에서 사용
function ProjectList() {
  const { user } = useAuth();
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => getProjects(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <Skeleton />;
  return <div>{/* 렌더링 */}</div>;
}
```

### RLS 정책 예시

```sql
-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can manage own data"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```

---

## UI/UX 가이드라인

### shadcn/ui 사용 원칙

```typescript
// UI 컴포넌트는 src/components/ui/에서만 import
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 기존 variant 우선 사용
<Button variant="default">기본</Button>
<Button variant="destructive">삭제</Button>
<Button variant="outline">윤곽선</Button>
<Button variant="ghost">고스트</Button>

// 새 컴포넌트 추가
// npx shadcn@latest add [component]
// src/components/ui/ 파일 직접 수정 금지
```

### 스타일링 규칙

```typescript
// cn() 유틸로 조건부 클래스 결합
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" && "primary-class",
  className
)} />

// CSS 변수 기반 색상 사용 (테마 호환)
// ✅ Good
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
<div className="text-muted-foreground" />

// ❌ Bad - 하드코딩된 색상
<div className="bg-white text-black" />
```

### 반응형 디자인

```typescript
// Tailwind 브레이크포인트
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px

<div className="
  grid
  grid-cols-1      // 모바일: 1열
  md:grid-cols-2   // 태블릿: 2열
  lg:grid-cols-3   // 데스크톱: 3열
  gap-4
  md:gap-6
" />
```

### Toast 알림

```typescript
import { toast } from "sonner";

toast.success("저장되었습니다.");
toast.error("오류가 발생했습니다.");
toast.info("처리 중입니다...");
toast.warning("주의가 필요합니다.");

// 상세 설명 포함
toast.success("변환 완료", {
  description: `${count}개의 테이블이 처리되었습니다.`
});
```

### 아이콘 사용

```typescript
import { Database, FileSpreadsheet, Settings } from "lucide-react";

// 표준 크기
<Database className="w-4 h-4" />  // 작은 (버튼 내부)
<Database className="w-5 h-5" />  // 중간 (사이드바)
<Database className="w-6 h-6" />  // 큰 (카드 헤더)
```

---

## 새 기능 추가 절차

### 1. 라우트 추가

```typescript
// src/App.tsx
import NewFeature from "./pages/NewFeature";

<Routes>
  {/* 기존 라우트들 */}
  <Route path="/new-feature" element={<NewFeature />} />
  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### 2. 사이드바 메뉴 추가

```typescript
// src/components/layout/AppSidebar.tsx
const toolsItems = [
  // 기존 항목들...
  {
    title: "새 기능",
    url: "/new-feature",
    icon: NewIcon,
    disabled: false  // 개발 완료 시 false
  },
];
```

### 3. 페이지 컴포넌트 생성

```typescript
// src/pages/NewFeature.tsx
import { PageIcon } from "lucide-react";

const NewFeature = () => {
  return (
    <div className="container mx-auto p-6">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <PageIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">새 기능</h1>
            <p className="text-sm text-muted-foreground">기능 설명</p>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div>
        {/* 기능 구현 */}
      </div>
    </div>
  );
};

export default NewFeature;
```

### 4. 체크리스트

- [ ] 페이지 컴포넌트 생성 (`src/pages/`)
- [ ] 라우트 추가 (`src/App.tsx`)
- [ ] 사이드바 메뉴 추가 (`src/components/layout/AppSidebar.tsx`)
- [ ] 필요한 UI 컴포넌트 확인/추가
- [ ] 비즈니스 로직 분리 (`src/utils/` 또는 `src/features/`)
- [ ] 에러 처리 및 로딩 상태
- [ ] Toast 알림 추가
- [ ] 반응형 디자인 확인
- [ ] 다크 모드 확인

---

## Git 전략

### 브랜치 전략

```
main                    # 프로덕션 배포 브랜치
├── feature/기능명       # 새 기능 개발
├── fix/버그명           # 버그 수정
├── refactor/대상        # 리팩토링
└── docs/문서명          # 문서 작업
```

### 브랜치 네이밍

```bash
# 형식: 타입/간단한-설명
feature/excel-merge-tool
feature/supabase-auth
fix/ddl-parser-comment-bug
refactor/component-structure
docs/claude-md-update
```

### 커밋 메시지 컨벤션

```
타입(범위): 제목

본문 (선택)

푸터 (선택)
```

| 타입 | 설명 |
|------|------|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| docs | 문서 변경 |
| style | 코드 포맷팅 (기능 변경 없음) |
| refactor | 리팩토링 (기능 변경 없음) |
| test | 테스트 추가/수정 |
| chore | 빌드, 설정 파일 변경 |

### 커밋 예시

```bash
feat(ddl): PostgreSQL SERIAL 타입 파싱 지원

- SERIAL, BIGSERIAL 타입 자동 감지
- AUTO_INCREMENT 키 자동 설정

Closes #123
```

```bash
fix(parser): 중첩 괄호 파싱 오류 수정
```

---

## 상태 관리 전략

```typescript
// 1. 로컬 상태: useState
const [isOpen, setIsOpen] = useState(false);

// 2. 서버 상태: TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['tables', userId],
  queryFn: () => fetchTables(userId),
});

// 3. 폼 상태: react-hook-form + zod
const form = useForm<FormType>({
  resolver: zodResolver(schema),
});

// 4. 전역 UI 상태: Context API
const { open } = useSidebar();

// 5. 인증 상태: Supabase Auth + Context
const { user, signIn, signOut } = useAuth();
```

---

## 에러 처리 패턴

```typescript
// API 호출 시 표준 패턴
try {
  const result = await apiCall();
  toast.success("성공!");
  return result;
} catch (error) {
  console.error("API Error:", error);
  toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
  throw error;
}
```

---

## 참고 파일

| 파일 | 설명 |
|------|------|
| `src/App.tsx` | 라우팅 패턴 참고 |
| `src/components/layout/AppSidebar.tsx` | 사이드바 메뉴 구조 |
| `src/pages/DdlConverter.tsx` | 페이지 컴포넌트 패턴 |
| `src/utils/ddlParser.ts` | 비즈니스 로직 분리 패턴 |
| `src/components/ui/` | shadcn/ui 컴포넌트 |
