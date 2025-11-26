import { useState } from "react";
import { FileText, Download, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/document/MarkdownEditor";
import { MarkdownPreview } from "@/components/document/MarkdownPreview";
import { toast } from "sonner";

const DEFAULT_MARKDOWN = `# Markdown 에디터

마크다운을 작성하고 실시간으로 미리보기를 확인하세요.

## 기능

- **굵은 글씨**와 *기울임체* 지원
- ~~취소선~~ 텍스트
- [링크](https://example.com) 삽입
- 이미지 삽입

## 코드 블록

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

인라인 코드: \`const x = 10;\`

## 테이블

| 이름 | 설명 |
|------|------|
| React | UI 라이브러리 |
| TypeScript | 타입 안전성 |

## 목록

1. 첫 번째 항목
2. 두 번째 항목
3. 세 번째 항목

- 순서 없는 목록
- 항목 2
- 항목 3

## 인용구

> 마크다운은 간단하고 강력합니다.

## 체크리스트

- [x] 완료된 항목
- [ ] 미완료 항목
`;

const DocumentConverter = () => {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success("클립보드에 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleDownload = () => {
    if (!markdown.trim()) {
      toast.error("내용이 없습니다.");
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("파일이 다운로드되었습니다.");
  };

  const handleClear = () => {
    setMarkdown("");
    toast.info("내용이 초기화되었습니다.");
  };

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      {/* 페이지 헤더 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Markdown 에디터
              </h1>
              <p className="text-sm text-muted-foreground">
                마크다운 작성 및 실시간 미리보기
              </p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              복사
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 에디터 / 미리보기 분할 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-5rem)]">
        {/* 에디터 */}
        <div className="flex flex-col min-h-0">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            에디터
          </div>
          <MarkdownEditor
            value={markdown}
            onChange={setMarkdown}
            className="flex-1 min-h-0"
          />
        </div>

        {/* 미리보기 */}
        <div className="flex flex-col min-h-0">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            미리보기
          </div>
          <MarkdownPreview content={markdown} className="flex-1 min-h-0" />
        </div>
      </div>
    </div>
  );
};

export default DocumentConverter;
