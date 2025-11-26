import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
  SkipForward,
  HelpCircle,
} from "lucide-react";
import { getStatusLabel, getStatusBgColor } from "@/utils/gitlabApi";

interface PipelineStatusBadgeProps {
  status: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

function StatusIcon({ status, size }: { status: string | null; size: "sm" | "md" | "lg" }) {
  const iconClass = cn(iconSizes[size]);

  switch (status) {
    case "success":
      return <CheckCircle2 className={cn(iconClass, "text-green-500")} />;
    case "failed":
      return <XCircle className={cn(iconClass, "text-red-500")} />;
    case "running":
      return <Loader2 className={cn(iconClass, "text-blue-500 animate-spin")} />;
    case "pending":
      return <Clock className={cn(iconClass, "text-yellow-500")} />;
    case "canceled":
      return <Ban className={cn(iconClass, "text-gray-500")} />;
    case "skipped":
      return <SkipForward className={cn(iconClass, "text-gray-400")} />;
    default:
      return <HelpCircle className={cn(iconClass, "text-muted-foreground")} />;
  }
}

export function PipelineStatusBadge({
  status,
  size = "md",
  showLabel = true,
  className,
}: PipelineStatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        sizeClasses[size],
        getStatusBgColor(status),
        className
      )}
    >
      <StatusIcon status={status} size={size} />
      {showLabel && <span>{getStatusLabel(status)}</span>}
    </div>
  );
}
