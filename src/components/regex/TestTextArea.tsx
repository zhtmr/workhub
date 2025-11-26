import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TestTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  regex: RegExp | null;
  className?: string;
}

export function TestTextArea({
  value,
  onChange,
  regex,
  className,
}: TestTextAreaProps) {
  // 매칭 부분을 하이라이트한 HTML 생성
  const highlightedHtml = useMemo(() => {
    if (!regex || !value) return value;

    try {
      // 전역 플래그가 없으면 추가
      const globalRegex = regex.global
        ? regex
        : new RegExp(regex.source, regex.flags + "g");

      let result = "";
      let lastIndex = 0;
      let match;

      const colors = [
        "bg-yellow-200 dark:bg-yellow-800",
        "bg-green-200 dark:bg-green-800",
        "bg-blue-200 dark:bg-blue-800",
        "bg-pink-200 dark:bg-pink-800",
        "bg-purple-200 dark:bg-purple-800",
      ];

      let colorIndex = 0;

      while ((match = globalRegex.exec(value)) !== null) {
        // 매칭 전 텍스트
        if (match.index > lastIndex) {
          result += escapeHtml(value.substring(lastIndex, match.index));
        }

        // 매칭된 텍스트
        const color = colors[colorIndex % colors.length];
        result += `<mark class="${color} px-0.5 rounded">${escapeHtml(match[0])}</mark>`;

        lastIndex = match.index + match[0].length;
        colorIndex++;

        // 빈 문자열 매칭 무한 루프 방지
        if (match[0].length === 0) {
          globalRegex.lastIndex++;
        }
      }

      // 남은 텍스트
      if (lastIndex < value.length) {
        result += escapeHtml(value.substring(lastIndex));
      }

      return result;
    } catch {
      return escapeHtml(value);
    }
  }, [value, regex]);

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b">
        <Label>테스트 텍스트</Label>
      </div>

      <div className="flex-1 relative">
        {/* 하이라이트 레이어 */}
        <div
          className="absolute inset-0 p-4 font-mono text-sm whitespace-pre-wrap break-words overflow-auto pointer-events-none"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />

        {/* 투명 textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "absolute inset-0 w-full h-full p-4 font-mono text-sm",
            "bg-transparent resize-none border-0 outline-none",
            "text-transparent caret-foreground",
            "overflow-auto"
          )}
          placeholder="매칭할 텍스트를 입력하세요..."
          spellCheck={false}
        />
      </div>
    </Card>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}
