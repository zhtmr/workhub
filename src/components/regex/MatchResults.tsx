import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MatchInfo {
  fullMatch: string;
  groups: string[];
  index: number;
  endIndex: number;
}

interface MatchResultsProps {
  regex: RegExp | null;
  testText: string;
  className?: string;
}

export function MatchResults({ regex, testText, className }: MatchResultsProps) {
  const matches = useMemo((): MatchInfo[] => {
    if (!regex || !testText) return [];

    try {
      const results: MatchInfo[] = [];
      const globalRegex = regex.global
        ? regex
        : new RegExp(regex.source, regex.flags + "g");

      let match;
      let count = 0;
      const maxMatches = 100; // 최대 100개 매칭

      while ((match = globalRegex.exec(testText)) !== null && count < maxMatches) {
        results.push({
          fullMatch: match[0],
          groups: match.slice(1),
          index: match.index,
          endIndex: match.index + match[0].length,
        });

        count++;

        // 빈 문자열 매칭 무한 루프 방지
        if (match[0].length === 0) {
          globalRegex.lastIndex++;
        }
      }

      return results;
    } catch {
      return [];
    }
  }, [regex, testText]);

  const matchCount = matches.length;

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <span className="font-medium">매칭 결과</span>
        <Badge variant={matchCount > 0 ? "default" : "secondary"}>
          {matchCount}개 매칭
        </Badge>
      </div>

      {/* 결과 목록 */}
      <ScrollArea className="flex-1">
        {matchCount === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {!regex
              ? "정규식을 입력하세요."
              : !testText
                ? "테스트 텍스트를 입력하세요."
                : "매칭되는 결과가 없습니다."}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {matches.map((match, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-muted/50 border space-y-2"
              >
                {/* 매칭 번호 및 위치 */}
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">매칭 #{idx + 1}</Badge>
                  <span className="text-muted-foreground">
                    위치: {match.index} - {match.endIndex}
                  </span>
                </div>

                {/* 전체 매칭 */}
                <div className="font-mono text-sm bg-background p-2 rounded border">
                  <span className="text-muted-foreground mr-2">[0]</span>
                  <span className="text-green-600 dark:text-green-400">
                    "{match.fullMatch}"
                  </span>
                </div>

                {/* 캡처 그룹 */}
                {match.groups.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      캡처 그룹:
                    </span>
                    {match.groups.map((group, groupIdx) => (
                      <div
                        key={groupIdx}
                        className="font-mono text-sm bg-background p-2 rounded border"
                      >
                        <span className="text-muted-foreground mr-2">
                          [{groupIdx + 1}]
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {group !== undefined ? `"${group}"` : "undefined"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {matchCount >= 100 && (
              <div className="text-center text-sm text-muted-foreground">
                최대 100개까지만 표시됩니다.
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
