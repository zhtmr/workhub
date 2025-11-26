import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  Minus,
} from "lucide-react";

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string, placeholder?: string) => void;
}

interface ToolbarButton {
  icon: React.ElementType;
  label: string;
  before: string;
  after?: string;
  placeholder?: string;
}

const toolbarButtons: ToolbarButton[] = [
  { icon: Bold, label: "굵게", before: "**", after: "**", placeholder: "굵은 텍스트" },
  { icon: Italic, label: "기울임", before: "_", after: "_", placeholder: "기울임 텍스트" },
  { icon: Strikethrough, label: "취소선", before: "~~", after: "~~", placeholder: "취소선 텍스트" },
];

const headingButtons: ToolbarButton[] = [
  { icon: Heading1, label: "제목 1", before: "# ", placeholder: "제목 1" },
  { icon: Heading2, label: "제목 2", before: "## ", placeholder: "제목 2" },
  { icon: Heading3, label: "제목 3", before: "### ", placeholder: "제목 3" },
];

const listButtons: ToolbarButton[] = [
  { icon: List, label: "목록", before: "- ", placeholder: "목록 항목" },
  { icon: ListOrdered, label: "번호 목록", before: "1. ", placeholder: "번호 목록 항목" },
  { icon: Quote, label: "인용", before: "> ", placeholder: "인용문" },
];

const codeButtons: ToolbarButton[] = [
  { icon: Code, label: "인라인 코드", before: "`", after: "`", placeholder: "코드" },
];

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const handleClick = (button: ToolbarButton) => {
    onInsert(button.before, button.after, button.placeholder);
  };

  const insertCodeBlock = () => {
    onInsert("```\n", "\n```", "코드를 입력하세요");
  };

  const insertLink = () => {
    onInsert("[", "](url)", "링크 텍스트");
  };

  const insertImage = () => {
    onInsert("![", "](이미지URL)", "대체 텍스트");
  };

  const insertTable = () => {
    const table = `| 헤더 1 | 헤더 2 | 헤더 3 |
|--------|--------|--------|
| 셀 1   | 셀 2   | 셀 3   |
| 셀 4   | 셀 5   | 셀 6   |`;
    onInsert(table + "\n");
  };

  const insertHorizontalRule = () => {
    onInsert("\n---\n");
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      {/* 텍스트 스타일 */}
      {toolbarButtons.map((button) => (
        <Button
          key={button.label}
          variant="ghost"
          size="sm"
          onClick={() => handleClick(button)}
          title={button.label}
          className="h-8 w-8 p-0"
        >
          <button.icon className="h-4 w-4" />
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* 헤딩 */}
      {headingButtons.map((button) => (
        <Button
          key={button.label}
          variant="ghost"
          size="sm"
          onClick={() => handleClick(button)}
          title={button.label}
          className="h-8 w-8 p-0"
        >
          <button.icon className="h-4 w-4" />
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* 리스트 */}
      {listButtons.map((button) => (
        <Button
          key={button.label}
          variant="ghost"
          size="sm"
          onClick={() => handleClick(button)}
          title={button.label}
          className="h-8 w-8 p-0"
        >
          <button.icon className="h-4 w-4" />
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* 코드 */}
      {codeButtons.map((button) => (
        <Button
          key={button.label}
          variant="ghost"
          size="sm"
          onClick={() => handleClick(button)}
          title={button.label}
          className="h-8 w-8 p-0"
        >
          <button.icon className="h-4 w-4" />
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={insertCodeBlock}
        title="코드 블록"
        className="h-8 px-2 text-xs"
      >
        {"</>"}
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* 링크, 이미지, 테이블 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={insertLink}
        title="링크"
        className="h-8 w-8 p-0"
      >
        <Link className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={insertImage}
        title="이미지"
        className="h-8 w-8 p-0"
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={insertTable}
        title="테이블"
        className="h-8 w-8 p-0"
      >
        <Table className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={insertHorizontalRule}
        title="구분선"
        className="h-8 w-8 p-0"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}
