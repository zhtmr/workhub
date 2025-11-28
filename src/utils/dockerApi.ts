// Docker Engine API Client
// Sprint 8: 컨테이너 상태 모니터링

import { isElectronEnvironment, getEmbeddedProxyUrl } from "@/lib/electron-bridge";

export interface DockerConfig {
  host: string; // tcp://localhost:2375 또는 프록시 URL
}

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: DockerPort[];
  Labels: Record<string, string>;
  NetworkSettings: {
    Networks: Record<string, { IPAddress: string }>;
  };
}

export interface DockerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface DockerContainerStats {
  read: string;
  cpu_stats: {
    cpu_usage: {
      total_usage: number;
      percpu_usage?: number[];
    };
    system_cpu_usage: number;
    online_cpus: number;
  };
  precpu_stats: {
    cpu_usage: {
      total_usage: number;
    };
    system_cpu_usage: number;
  };
  memory_stats: {
    usage: number;
    limit: number;
    stats?: {
      cache?: number;
    };
  };
  networks?: Record<
    string,
    {
      rx_bytes: number;
      tx_bytes: number;
    }
  >;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: "running" | "paused" | "exited" | "created" | "restarting" | "dead";
  status: string;
  created: Date;
  ports: string[];
  ipAddress: string | null;
  labels: Record<string, string>;
}

export interface ContainerMetrics {
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  networkRxMB: number;
  networkTxMB: number;
}

class DockerClient {
  private config: DockerConfig;
  private proxyUrl: string | null = null;
  private proxyInitialized: boolean = false;

  constructor(config: DockerConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    // Docker host URL을 HTTP API로 변환
    let host = this.config.host;

    // tcp:// -> http://
    if (host.startsWith("tcp://")) {
      host = host.replace("tcp://", "http://");
    }

    // unix:// 소켓은 브라우저에서 직접 접근 불가 -> 프록시 필요
    if (host.startsWith("unix://")) {
      console.warn("Unix socket not supported in browser. Use a proxy.");
      return "";
    }

    return host.replace(/\/$/, "");
  }

  /**
   * Electron 환경에서 프록시 URL 초기화
   */
  private async initProxy(): Promise<void> {
    if (this.proxyInitialized) return;

    if (isElectronEnvironment()) {
      this.proxyUrl = await getEmbeddedProxyUrl();
    }
    this.proxyInitialized = true;
  }

  /**
   * Electron 환경에서는 프록시를 통해 요청, 그 외에는 직접 요청
   */
  private async fetch(path: string): Promise<Response> {
    await this.initProxy();

    // Electron 환경: 프록시 서버를 통해 요청
    if (this.proxyUrl) {
      const response = await fetch(`${this.proxyUrl}/api/docker/proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          host: this.config.host,
          path: path,
          method: "GET",
        }),
      });

      // 프록시 응답을 원래 Docker API 응답처럼 변환
      const result = await response.json();

      if (!result.success) {
        // 에러 응답 생성
        return new Response(JSON.stringify({ message: result.error }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 성공 응답 생성
      return new Response(JSON.stringify(result.data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 일반 웹 환경: 직접 요청
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      throw new Error("Invalid Docker host configuration");
    }

    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: "application/json",
      },
    });

    return response;
  }

  /**
   * 모든 컨테이너 목록 조회
   */
  async listContainers(all: boolean = true): Promise<{ data: ContainerInfo[] | null; error: Error | null }> {
    try {
      const response = await this.fetch(`/containers/json?all=${all}`);

      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: new Error(`Failed to list containers: ${text}`) };
      }

      const containers: DockerContainer[] = await response.json();

      const result: ContainerInfo[] = containers.map((c) => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace(/^\//, "") || c.Id.substring(0, 12),
        image: c.Image,
        state: c.State as ContainerInfo["state"],
        status: c.Status,
        created: new Date(c.Created * 1000),
        ports: c.Ports.map((p) =>
          p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}/${p.Type}` : `${p.PrivatePort}/${p.Type}`
        ),
        ipAddress: Object.values(c.NetworkSettings.Networks)[0]?.IPAddress || null,
        labels: c.Labels,
      }));

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }

  /**
   * 컨테이너 상세 통계 조회
   */
  async getContainerStats(containerId: string): Promise<{ data: ContainerMetrics | null; error: Error | null }> {
    try {
      // stream=false로 즉시 반환
      const response = await this.fetch(`/containers/${containerId}/stats?stream=false`);

      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: new Error(`Failed to get stats: ${text}`) };
      }

      const stats: DockerContainerStats = await response.json();

      // CPU 사용률 계산
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

      // 메모리 사용량 계산
      const memoryUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      // 네트워크 사용량 계산
      let networkRx = 0;
      let networkTx = 0;
      if (stats.networks) {
        Object.values(stats.networks).forEach((net) => {
          networkRx += net.rx_bytes;
          networkTx += net.tx_bytes;
        });
      }

      const metrics: ContainerMetrics = {
        cpuPercent: Number(cpuPercent.toFixed(2)),
        memoryUsageMB: Number((memoryUsage / 1024 / 1024).toFixed(2)),
        memoryLimitMB: Number((memoryLimit / 1024 / 1024).toFixed(2)),
        memoryPercent: Number(memoryPercent.toFixed(2)),
        networkRxMB: Number((networkRx / 1024 / 1024).toFixed(2)),
        networkTxMB: Number((networkTx / 1024 / 1024).toFixed(2)),
      };

      return { data: metrics, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<{ success: boolean; version?: string; error: Error | null }> {
    try {
      const response = await this.fetch("/version");

      if (!response.ok) {
        return { success: false, error: new Error(`Connection failed: ${response.status}`) };
      }

      const data = await response.json();
      return { success: true, version: data.Version, error: null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error("Connection failed") };
    }
  }

  /**
   * Docker 정보 조회
   */
  async getInfo(): Promise<{ data: { containers: number; images: number; memoryTotal: number } | null; error: Error | null }> {
    try {
      const response = await this.fetch("/info");

      if (!response.ok) {
        return { data: null, error: new Error("Failed to get Docker info") };
      }

      const info = await response.json();
      return {
        data: {
          containers: info.Containers || 0,
          images: info.Images || 0,
          memoryTotal: info.MemTotal || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }
}

/**
 * Docker 클라이언트 생성
 */
export function createDockerClient(config: DockerConfig): DockerClient {
  return new DockerClient(config);
}

/**
 * 컨테이너 상태 색상
 */
export function getContainerStateColor(state: ContainerInfo["state"]): string {
  switch (state) {
    case "running":
      return "text-green-500";
    case "paused":
      return "text-yellow-500";
    case "exited":
      return "text-red-500";
    case "created":
      return "text-blue-500";
    case "restarting":
      return "text-orange-500";
    case "dead":
      return "text-gray-500";
    default:
      return "text-gray-400";
  }
}

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
