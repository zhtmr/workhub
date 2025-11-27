// Sprint 9: EXPLAIN Plan Viewer 컴포넌트

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileSearch,
  Layers,
  TrendingUp,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type QueryExecutionResult,
} from "@/hooks/use-query-execution";
import {
  parseExplainPlan,
  getExplainSummary,
  type ExplainNode,
  type ParsedExplainPlan,
} from "@/utils/explainParser";

interface ExplainViewerProps {
  result: QueryExecutionResult | null;
  dbType?: "postgresql" | "mysql" | "oracle" | "mssql";
  className?: string;
}

export function ExplainViewer({ result, dbType = "postgresql", className }: ExplainViewerProps) {
  const [showRaw, setShowRaw] = useState(false);

  const parsedPlan = useMemo<ParsedExplainPlan | null>(() => {
    if (!result?.explainPlan) return null;
    return parseExplainPlan(dbType, result.explainPlan);
  }, [result?.explainPlan, dbType]);

  const summary = useMemo(() => {
    if (!parsedPlan) return null;
    return getExplainSummary(parsedPlan);
  }, [parsedPlan]);

  const copyRawPlan = () => {
    if (result?.explainPlan) {
      const text = typeof result.explainPlan === "string"
        ? result.explainPlan
        : JSON.stringify(result.explainPlan, null, 2);
      navigator.clipboard.writeText(text);
      toast.success("실행 계획 복사됨");
    }
  };

  // 결과 없음
  if (!result?.explainPlan) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>EXPLAIN 실행 결과가 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="w-4 h-4" />
            실행 계획
            <Badge variant="outline">{dbType.toUpperCase()}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {result.executionTimeMs && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {result.executionTimeMs}ms
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? "트리 보기" : "원본 보기"}
            </Button>
            <Button variant="ghost" size="icon" onClick={copyRawPlan}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 요약 정보 */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryCard
              label="총 비용"
              value={summary.totalCost?.toLocaleString() || "-"}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <SummaryCard
              label="예상 행 수"
              value={summary.totalRows?.toLocaleString() || "-"}
              icon={<Layers className="w-4 h-4" />}
            />
            <SummaryCard
              label="노드 수"
              value={summary.nodeCount}
              icon={<Database className="w-4 h-4" />}
            />
            <SummaryCard
              label="경고"
              value={summary.warningCount}
              icon={<AlertTriangle className="w-4 h-4" />}
              variant={summary.warningCount > 0 ? "warning" : "default"}
            />
          </div>
        )}

        {/* 경고 표시 */}
        {parsedPlan && parsedPlan.warnings.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {parsedPlan.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 성능 힌트 */}
        {summary && (summary.hasFullScan || summary.hasSort || summary.hasTemp) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {summary.hasFullScan && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                Full Scan 감지
              </Badge>
            )}
            {summary.hasSort && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                정렬 작업
              </Badge>
            )}
            {summary.hasTemp && (
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                임시 저장소 사용
              </Badge>
            )}
          </div>
        )}

        {/* 실행 계획 트리 또는 원본 */}
        {showRaw ? (
          <ScrollArea className="h-[400px]">
            <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              {typeof result.explainPlan === "string"
                ? result.explainPlan
                : JSON.stringify(result.explainPlan, null, 2)}
            </pre>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[400px]">
            {parsedPlan && parsedPlan.nodes.length > 0 ? (
              <div className="space-y-1">
                {parsedPlan.nodes.map((node) => (
                  <ExplainNodeItem key={node.id} node={node} level={0} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                실행 계획 노드가 없습니다
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "default" | "warning";
}

function SummaryCard({ label, value, icon, variant = "default" }: SummaryCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        variant === "warning" && Number(value) > 0
          ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
          : "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div
        className={cn(
          "text-lg font-semibold",
          variant === "warning" && Number(value) > 0 && "text-yellow-600"
        )}
      >
        {value}
      </div>
    </div>
  );
}

interface ExplainNodeItemProps {
  node: ExplainNode;
  level: number;
}

function ExplainNodeItem({ node, level }: ExplainNodeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 3);
  const hasChildren = node.children && node.children.length > 0;
  const hasWarnings = node.warnings && node.warnings.length > 0;

  return (
    <div className={cn("border-l-2", level > 0 && "ml-4", hasWarnings ? "border-yellow-400" : "border-muted")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            "flex items-start gap-2 p-2 rounded-r-lg hover:bg-muted/50 transition-colors",
            hasWarnings && "bg-yellow-50 dark:bg-yellow-950/30"
          )}
        >
          {/* 펼치기/접기 버튼 */}
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                {isOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5 h-5" />
          )}

          {/* 노드 내용 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Operation 이름 */}
              <span className="font-medium text-sm">{node.operation}</span>

              {/* Object 이름 (테이블/인덱스) */}
              {node.object && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {node.object}
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>대상 객체</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* 경고 아이콘 */}
              {hasWarnings && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <ul className="text-xs space-y-1">
                        {node.warnings!.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* 상세 정보 */}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {node.rows !== undefined && (
                <span>
                  행: <span className="font-medium">{node.rows.toLocaleString()}</span>
                </span>
              )}
              {node.cost !== undefined && (
                <span>
                  비용: <span className="font-medium">{node.cost.toLocaleString()}</span>
                </span>
              )}
              {node.time !== undefined && (
                <span>
                  시간: <span className="font-medium">{node.time.toFixed(2)}ms</span>
                </span>
              )}
              {node.width !== undefined && (
                <span>
                  너비: <span className="font-medium">{node.width.toLocaleString()}B</span>
                </span>
              )}
            </div>

            {/* 필터 조건 */}
            {node.filter && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Filter:</span>{" "}
                <code className="bg-muted px-1 rounded">{node.filter}</code>
              </div>
            )}

            {/* 추가 정보 (접었다 펼 수 있게) */}
            {node.extra && Object.keys(node.extra).length > 0 && (
              <ExtraInfo extra={node.extra} />
            )}
          </div>
        </div>

        {/* 자식 노드 */}
        {hasChildren && (
          <CollapsibleContent>
            <div className="mt-1">
              {node.children!.map((child) => (
                <ExplainNodeItem key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

interface ExtraInfoProps {
  extra: Record<string, unknown>;
}

function ExtraInfo({ extra }: ExtraInfoProps) {
  const [expanded, setExpanded] = useState(false);

  // 표시할 주요 키들
  const displayKeys = Object.keys(extra).filter(
    (key) => !["oracleId", "parentId", "level"].includes(key)
  );

  if (displayKeys.length === 0) return null;

  const previewKeys = displayKeys.slice(0, 2);
  const hasMore = displayKeys.length > 2;

  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-2 text-xs">
        {previewKeys.map((key) => (
          <span key={key} className="text-muted-foreground">
            <span className="font-medium">{key}:</span>{" "}
            <span className="bg-muted px-1 rounded">
              {formatValue(extra[key])}
            </span>
          </span>
        ))}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "접기" : `+${displayKeys.length - 2}개 더보기`}
          </Button>
        )}
      </div>
      {expanded && (
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          {displayKeys.slice(2).map((key) => (
            <span key={key} className="text-muted-foreground">
              <span className="font-medium">{key}:</span>{" "}
              <span className="bg-muted px-1 rounded">
                {formatValue(extra[key])}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") {
    return value.length > 50 ? value.slice(0, 50) + "..." : value;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return JSON.stringify(value);
}
