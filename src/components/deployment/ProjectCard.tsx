import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch,
  MoreVertical,
  Settings,
  Trash2,
  ExternalLink,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { PipelineStatusBadge } from "./PipelineStatusBadge";
import { formatDuration } from "@/utils/gitlabApi";
import { cn } from "@/lib/utils";
import type { ProjectWithStatus } from "@/types/deployment";

interface ProjectCardProps {
  project: ProjectWithStatus;
  onEdit?: (project: ProjectWithStatus) => void;
  onDelete?: (project: ProjectWithStatus) => void;
  onRefresh?: (project: ProjectWithStatus) => void;
  onClick?: (project: ProjectWithStatus) => void;
  onWebhook?: (project: ProjectWithStatus) => void;
}

const statusColors = {
  healthy: "border-l-green-500",
  warning: "border-l-yellow-500",
  error: "border-l-red-500",
  unknown: "border-l-gray-400",
};

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onRefresh,
  onClick,
  onWebhook,
}: ProjectCardProps) {
  const latestPipeline = project.latest_pipeline;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card
      className={cn(
        "border-l-4 hover:shadow-md transition-shadow cursor-pointer",
        statusColors[project.status]
      )}
      onClick={() => onClick?.(project)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {project.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {project.gitlab_url && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(project.gitlab_url!, "_blank");
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  GitLab에서 열기
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh?.(project);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onWebhook?.(project);
                }}
              >
                <Webhook className="w-4 h-4 mr-2" />
                Webhook 설정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(project);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                프로젝트 설정
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(project);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {latestPipeline ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <PipelineStatusBadge status={latestPipeline.status} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDuration(latestPipeline.duration_seconds)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="w-4 h-4" />
              <span className="truncate">{latestPipeline.ref || "main"}</span>
            </div>

            {latestPipeline.commit_message && (
              <p className="text-sm truncate" title={latestPipeline.commit_message}>
                {latestPipeline.commit_message}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>{latestPipeline.author_name || "Unknown"}</span>
              <span>{formatDate(latestPipeline.received_at)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">파이프라인 데이터 없음</p>
            <p className="text-xs mt-1">Webhook을 설정하거나 GitLab API를 연동하세요</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
