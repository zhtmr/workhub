import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react";
import type { PipelineStats } from "@/types/deployment";

interface DeploymentStatsProps {
  stats: PipelineStats;
  className?: string;
}

export function DeploymentStats({ stats, className }: DeploymentStatsProps) {
  const statItems = [
    {
      label: "전체 파이프라인",
      value: stats.total,
      icon: Activity,
      color: "text-foreground",
      bgColor: "bg-primary/10",
    },
    {
      label: "성공",
      value: stats.success,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "실패",
      value: stats.failed,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "실행 중",
      value: stats.running,
      icon: Loader2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Success Rate Bar */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">성공률</span>
            <span className="text-sm font-bold">{stats.success_rate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.success_rate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
