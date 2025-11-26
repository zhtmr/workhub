import { useMemo } from "react";
import * as Diff from "diff";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type DiffViewMode = "side-by-side" | "inline";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  viewMode: DiffViewMode;
  className?: string;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  oldLineNum?: number;
  newLineNum?: number;
  content: string;
}

export function DiffViewer({
  oldText,
  newText,
  viewMode,
  className,
}: DiffViewerProps) {
  const diffResult = useMemo(() => {
    const changes = Diff.diffLines(oldText, newText);

    const lines: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const change of changes) {
      const changeLines = change.value.split("\n");
      // 마지막 빈 줄 제거 (split으로 인한)
      if (changeLines[changeLines.length - 1] === "") {
        changeLines.pop();
      }

      for (const line of changeLines) {
        if (change.added) {
          lines.push({
            type: "added",
            newLineNum: newLineNum++,
            content: line,
          });
        } else if (change.removed) {
          lines.push({
            type: "removed",
            oldLineNum: oldLineNum++,
            content: line,
          });
        } else {
          lines.push({
            type: "unchanged",
            oldLineNum: oldLineNum++,
            newLineNum: newLineNum++,
            content: line,
          });
        }
      }
    }

    return lines;
  }, [oldText, newText]);

  const stats = useMemo(() => {
    const added = diffResult.filter((l) => l.type === "added").length;
    const removed = diffResult.filter((l) => l.type === "removed").length;
    return { added, removed };
  }, [diffResult]);

  if (!oldText && !newText) {
    return (
      <Card className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-muted-foreground">
          비교할 텍스트를 입력하세요
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium">비교 결과</span>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            +{stats.added} 추가
          </Badge>
          <Badge variant="outline" className="text-red-600 border-red-600">
            -{stats.removed} 삭제
          </Badge>
        </div>
      </div>

      {/* Diff 뷰 */}
      <ScrollArea className="flex-1">
        {viewMode === "inline" ? (
          <InlineView lines={diffResult} />
        ) : (
          <SideBySideView lines={diffResult} />
        )}
      </ScrollArea>
    </Card>
  );
}

function InlineView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="font-mono text-sm">
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "flex px-2 py-0.5",
            line.type === "added" && "bg-green-100 dark:bg-green-900/30",
            line.type === "removed" && "bg-red-100 dark:bg-red-900/30"
          )}
        >
          {/* 라인 번호 */}
          <span className="w-10 text-right text-muted-foreground select-none pr-2">
            {line.oldLineNum || ""}
          </span>
          <span className="w-10 text-right text-muted-foreground select-none pr-2">
            {line.newLineNum || ""}
          </span>

          {/* 변경 타입 표시 */}
          <span
            className={cn(
              "w-5 text-center select-none",
              line.type === "added" && "text-green-600",
              line.type === "removed" && "text-red-600"
            )}
          >
            {line.type === "added" && "+"}
            {line.type === "removed" && "-"}
          </span>

          {/* 내용 */}
          <span className="flex-1 whitespace-pre">
            {line.content || " "}
          </span>
        </div>
      ))}
    </div>
  );
}

function SideBySideView({ lines }: { lines: DiffLine[] }) {
  // 좌측(old)과 우측(new) 라인 분리
  const leftLines: (DiffLine | null)[] = [];
  const rightLines: (DiffLine | null)[] = [];

  let leftIdx = 0;
  let rightIdx = 0;

  for (const line of lines) {
    if (line.type === "unchanged") {
      // 동기화
      while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
        if (leftIdx < leftLines.length && rightIdx < rightLines.length) {
          leftIdx++;
          rightIdx++;
        } else if (leftIdx < leftLines.length) {
          rightLines.push(null);
          rightIdx++;
        } else {
          leftLines.push(null);
          leftIdx++;
        }
      }
      leftLines.push(line);
      rightLines.push(line);
      leftIdx++;
      rightIdx++;
    } else if (line.type === "removed") {
      leftLines.push(line);
      leftIdx++;
    } else {
      rightLines.push(line);
      rightIdx++;
    }
  }

  // 나머지 동기화
  while (leftLines.length < rightLines.length) {
    leftLines.push(null);
  }
  while (rightLines.length < leftLines.length) {
    rightLines.push(null);
  }

  return (
    <div className="flex font-mono text-sm">
      {/* 좌측 (Original) */}
      <div className="flex-1 border-r">
        {leftLines.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              "flex px-2 py-0.5",
              line?.type === "removed" && "bg-red-100 dark:bg-red-900/30"
            )}
          >
            <span className="w-10 text-right text-muted-foreground select-none pr-2">
              {line?.oldLineNum || ""}
            </span>
            <span
              className={cn(
                "w-5 text-center select-none",
                line?.type === "removed" && "text-red-600"
              )}
            >
              {line?.type === "removed" && "-"}
            </span>
            <span className="flex-1 whitespace-pre">
              {line?.content || " "}
            </span>
          </div>
        ))}
      </div>

      {/* 우측 (Modified) */}
      <div className="flex-1">
        {rightLines.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              "flex px-2 py-0.5",
              line?.type === "added" && "bg-green-100 dark:bg-green-900/30"
            )}
          >
            <span className="w-10 text-right text-muted-foreground select-none pr-2">
              {line?.newLineNum || ""}
            </span>
            <span
              className={cn(
                "w-5 text-center select-none",
                line?.type === "added" && "text-green-600"
              )}
            >
              {line?.type === "added" && "+"}
            </span>
            <span className="flex-1 whitespace-pre">
              {line?.content || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
