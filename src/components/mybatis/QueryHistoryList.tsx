// Sprint 9: 쿼리 실행 이력 목록 컴포넌트

import { useState } from "react";
import {
  Clock,
  Database,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useQueryHistory,
  type QueryExecutionRow,
} from "@/hooks/use-query-execution";

interface QueryHistoryListProps {
  connectionId: string | null;
  onSelectQuery?: (sql: string) => void;
  className?: string;
}

export function QueryHistoryList({
  connectionId,
  onSelectQuery,
  className,
}: QueryHistoryListProps) {
  const { history, isLoading, error, refetch } = useQueryHistory(connectionId, 30);

  // 결과 없음
  if (!connectionId) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">DB 연결을 선택하면 실행 이력이 표시됩니다</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">이력 로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4" />
            실행 이력
            <Badge variant="secondary" className="ml-1">
              {history.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">실행 이력이 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {history.map((item) => (
                <QueryHistoryItem
                  key={item.id}
                  item={item}
                  onSelectQuery={onSelectQuery}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface QueryHistoryItemProps {
  item: QueryExecutionRow;
  onSelectQuery?: (sql: string) => void;
}

function QueryHistoryItem({ item, onSelectQuery }: QueryHistoryItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSuccess = !item.error_message;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.sql_query);
    toast.success("SQL 복사됨");
  };

  const handleSelect = () => {
    onSelectQuery?.(item.sql_query);
    toast.success("SQL이 입력되었습니다");
  };

  // 시간 포맷팅
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 1시간 이내
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return minutes < 1 ? "방금 전" : `${minutes}분 전`;
    }
    // 24시간 이내
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}시간 전`;
    }
    // 그 외
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // SQL 미리보기 (첫 줄만)
  const sqlPreview = item.sql_query.split("\n")[0].trim().substring(0, 60);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "px-4 py-3 hover:bg-muted/50 transition-colors",
          !isSuccess && "bg-destructive/5"
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-start gap-3 cursor-pointer">
            {/* 상태 아이콘 */}
            <div className="shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* SQL 미리보기 */}
                <code className="text-sm font-mono truncate flex-1">
                  {sqlPreview}
                  {item.sql_query.length > 60 && "..."}
                </code>

                {/* 펼치기 아이콘 */}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                )}
              </div>

              {/* 메타 정보 */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(item.executed_at)}
                </span>
                {item.execution_time_ms !== null && (
                  <span>{item.execution_time_ms}ms</span>
                )}
                {item.result_row_count !== null && isSuccess && (
                  <span>{item.result_row_count}행</span>
                )}
                {item.statement_id && (
                  <Badge variant="outline" className="text-xs h-5">
                    {item.statement_id}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* 상세 내용 */}
        <CollapsibleContent>
          <div className="mt-3 ml-7 space-y-3">
            {/* 전체 SQL */}
            <div className="relative">
              <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[200px]">
                {item.sql_query}
              </pre>
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* 파라미터 */}
            {item.parameters && Object.keys(item.parameters).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">파라미터</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(item.parameters).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {item.error_message && (
              <div className="p-2 bg-destructive/10 rounded-lg">
                <p className="text-xs font-medium text-destructive mb-1">에러</p>
                <p className="text-xs text-destructive/90">{item.error_message}</p>
              </div>
            )}

            {/* 액션 버튼 */}
            {onSelectQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelect}
                className="w-full"
              >
                이 SQL 사용하기
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
