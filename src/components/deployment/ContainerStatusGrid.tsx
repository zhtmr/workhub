import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Container,
  RefreshCw,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Square,
  RotateCw,
  Cpu,
  HardDrive,
  Network,
  FlaskConical,
} from "lucide-react";
import {
  createDockerClient,
  getContainerStateColor,
  type ContainerInfo,
  type ContainerMetrics,
} from "@/utils/dockerApi";
import type { DeploymentProject } from "@/types/deployment";
import { cn } from "@/lib/utils";

interface ContainerStatusGridProps {
  project: DeploymentProject | null;
  demoMode?: boolean;
}

// 데모 모드용 모의 컨테이너 데이터
const DEMO_CONTAINERS: ContainerWithMetrics[] = [
  {
    id: "abc123def456",
    name: "frontend-app",
    image: "nginx:1.25-alpine",
    state: "running",
    status: "Up 3 days",
    created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    ports: ["80:80", "443:443"],
    ipAddress: "172.17.0.2",
    labels: { env: "production" },
    metrics: {
      cpuPercent: 12.5,
      memoryUsageMB: 128,
      memoryLimitMB: 512,
      memoryPercent: 25,
      networkRxMB: 1.24,
      networkTxMB: 0.89,
    },
  },
  {
    id: "def456ghi789",
    name: "backend-api",
    image: "node:20-alpine",
    state: "running",
    status: "Up 3 days",
    created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    ports: ["3000:3000"],
    ipAddress: "172.17.0.3",
    labels: { env: "production" },
    metrics: {
      cpuPercent: 35.2,
      memoryUsageMB: 384,
      memoryLimitMB: 1024,
      memoryPercent: 37.5,
      networkRxMB: 5.67,
      networkTxMB: 3.21,
    },
  },
  {
    id: "ghi789jkl012",
    name: "postgres-db",
    image: "postgres:15-alpine",
    state: "running",
    status: "Up 5 days",
    created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ports: ["5432:5432"],
    ipAddress: "172.17.0.4",
    labels: { env: "production" },
    metrics: {
      cpuPercent: 8.3,
      memoryUsageMB: 256,
      memoryLimitMB: 512,
      memoryPercent: 50,
      networkRxMB: 2.15,
      networkTxMB: 1.87,
    },
  },
  {
    id: "jkl012mno345",
    name: "redis-cache",
    image: "redis:7-alpine",
    state: "running",
    status: "Up 5 days",
    created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ports: ["6379:6379"],
    ipAddress: "172.17.0.5",
    labels: { env: "production" },
    metrics: {
      cpuPercent: 2.1,
      memoryUsageMB: 64,
      memoryLimitMB: 256,
      memoryPercent: 25,
      networkRxMB: 0.45,
      networkTxMB: 0.32,
    },
  },
  {
    id: "mno345pqr678",
    name: "worker-stopped",
    image: "node:20-alpine",
    state: "exited",
    status: "Exited (0) 2 hours ago",
    created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ports: [],
    ipAddress: null,
    labels: { env: "production" },
  },
];

interface ContainerWithMetrics extends ContainerInfo {
  metrics?: ContainerMetrics;
  metricsLoading?: boolean;
}

const stateIcons = {
  running: Play,
  paused: Pause,
  exited: Square,
  created: Container,
  restarting: RotateCw,
  dead: AlertCircle,
};

export function ContainerStatusGrid({ project, demoMode = false }: ContainerStatusGridProps) {
  const [containers, setContainers] = useState<ContainerWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasDockerConfig = !!project?.docker_host;

  const fetchContainers = async () => {
    if (!project?.docker_host) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createDockerClient({ host: project.docker_host });

      // 먼저 컨테이너 목록 조회
      const { data, error: listError } = await client.listContainers();

      if (listError) {
        setError(listError.message);
        return;
      }

      if (!data) {
        setContainers([]);
        return;
      }

      // 컨테이너 목록 설정 (metrics는 나중에 로드)
      setContainers(data.map((c) => ({ ...c, metricsLoading: c.state === "running" })));

      // running 컨테이너의 metrics 병렬 로드
      const runningContainers = data.filter((c) => c.state === "running");
      const metricsPromises = runningContainers.map(async (container) => {
        const { data: metrics } = await client.getContainerStats(container.id);
        return { id: container.id, metrics };
      });

      const metricsResults = await Promise.all(metricsPromises);

      // metrics 업데이트
      setContainers((prev) =>
        prev.map((c) => {
          const result = metricsResults.find((r) => r.id === c.id);
          return result
            ? { ...c, metrics: result.metrics || undefined, metricsLoading: false }
            : { ...c, metricsLoading: false };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (demoMode) {
      setContainers(DEMO_CONTAINERS);
      setIsLoading(false);
      return;
    }

    if (hasDockerConfig) {
      fetchContainers();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.docker_host, demoMode]);

  // 데모 모드가 아니고 Docker 설정이 없는 경우
  if (!demoMode && !hasDockerConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="w-5 h-5" />
            컨테이너 상태
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Container className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Docker Host가 설정되지 않았습니다.</p>
          <p className="text-sm mt-1">프로젝트 설정에서 Docker Host를 입력하세요.</p>
        </CardContent>
      </Card>
    );
  }

  // 현재 표시할 컨테이너 목록
  const displayContainers = demoMode ? DEMO_CONTAINERS : containers;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Container className="w-5 h-5" />
            컨테이너 상태
            {displayContainers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {displayContainers.length}
              </Badge>
            )}
            {demoMode && (
              <Badge variant="outline" className="text-xs gap-1">
                <FlaskConical className="w-3 h-3" />
                데모
              </Badge>
            )}
          </CardTitle>
          {!demoMode && (
            <Button variant="ghost" size="icon" onClick={fetchContainers} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!demoMode && isLoading && containers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !demoMode && error ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
            <p className="text-sm">연결 실패</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        ) : displayContainers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Container className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">컨테이너 없음</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayContainers.map((container) => (
              <ContainerCard key={container.id} container={container} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContainerCard({ container }: { container: ContainerWithMetrics }) {
  const StateIcon = stateIcons[container.state] || Container;
  const stateColor = getContainerStateColor(container.state);

  return (
    <div className="p-3 border rounded-lg space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StateIcon className={cn("w-4 h-4", stateColor)} />
          <span className="font-medium text-sm">{container.name}</span>
        </div>
        <Badge
          variant={container.state === "running" ? "default" : "secondary"}
          className="text-xs"
        >
          {container.state}
        </Badge>
      </div>

      {/* 이미지 및 상태 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[200px]" title={container.image}>
          {container.image}
        </span>
        <span>{container.status}</span>
      </div>

      {/* 포트 */}
      {container.ports.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {container.ports.slice(0, 3).map((port, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {port}
            </Badge>
          ))}
          {container.ports.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{container.ports.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Metrics (running 컨테이너만) */}
      {container.state === "running" && (
        <div className="pt-2 border-t space-y-2">
          {container.metricsLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : container.metrics ? (
            <TooltipProvider>
              <div className="grid grid-cols-3 gap-2">
                {/* CPU */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Cpu className="w-3 h-3" />
                        <span>CPU</span>
                      </div>
                      <Progress value={container.metrics.cpuPercent} className="h-1" />
                      <span className="text-xs font-mono">
                        {container.metrics.cpuPercent}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>CPU 사용률</TooltipContent>
                </Tooltip>

                {/* Memory */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HardDrive className="w-3 h-3" />
                        <span>MEM</span>
                      </div>
                      <Progress value={container.metrics.memoryPercent} className="h-1" />
                      <span className="text-xs font-mono">
                        {container.metrics.memoryUsageMB.toFixed(0)}MB
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {container.metrics.memoryUsageMB.toFixed(0)} / {container.metrics.memoryLimitMB.toFixed(0)} MB
                  </TooltipContent>
                </Tooltip>

                {/* Network */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Network className="w-3 h-3" />
                        <span>NET</span>
                      </div>
                      <div className="text-xs font-mono">
                        <span className="text-green-500">↓{container.metrics.networkRxMB.toFixed(1)}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-blue-500">↑{container.metrics.networkTxMB.toFixed(1)}</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    RX: {container.metrics.networkRxMB.toFixed(2)} MB, TX: {container.metrics.networkTxMB.toFixed(2)} MB
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          ) : (
            <p className="text-xs text-muted-foreground text-center">메트릭 없음</p>
          )}
        </div>
      )}
    </div>
  );
}
