import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit, GitBranch, Loader2, ChevronDown } from "lucide-react";
import { PipelineStatusBadge } from "./PipelineStatusBadge";
import { formatDuration } from "@/utils/gitlabApi";
import type { PipelineEvent } from "@/types/deployment";

interface PipelineTimelineProps {
  events: PipelineEvent[];
  maxHeight?: string;
  title?: string;
  // 페이지네이션
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function PipelineTimeline({
  events,
  maxHeight = "400px",
  title = "파이프라인 이력",
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: PipelineTimelineProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}분 전`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}일 전`;
    }

    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>파이프라인 이력이 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">{events.length}개</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="px-6 pb-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

              {/* Events */}
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${
                        event.status === "success"
                          ? "bg-green-500"
                          : event.status === "failed"
                          ? "bg-red-500"
                          : event.status === "running"
                          ? "bg-blue-500"
                          : "bg-muted"
                      }`}
                    >
                      <GitCommit className="w-3 h-3 text-white" />
                    </div>

                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <PipelineStatusBadge status={event.status} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              #{event.pipeline_id}
                            </span>
                          </div>

                          {event.commit_message && (
                            <p className="text-sm truncate" title={event.commit_message}>
                              {event.commit_message}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              <span>{event.ref || "main"}</span>
                            </div>
                            {event.commit_sha && (
                              <span className="font-mono">
                                {event.commit_sha.substring(0, 7)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div>{formatDate(event.received_at)}</div>
                          {event.duration_seconds && (
                            <div className="mt-1">
                              {formatDuration(event.duration_seconds)}
                            </div>
                          )}
                        </div>
                      </div>

                      {event.author_name && (
                        <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                          {event.author_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasNextPage && onLoadMore && (
                <div className="mt-4 pl-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onLoadMore}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        더 보기
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
