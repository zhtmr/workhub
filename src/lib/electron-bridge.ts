/**
 * Electron 환경 감지 및 IPC 통신 브리지
 */

// Electron API 타입 정의
declare global {
  interface Window {
    electronAPI?: {
      getProxyPort: () => Promise<number | null>;
      getProxyStatus: () => Promise<{ running: boolean; port: number | null }>;
      getElectronInfo: () => Promise<{
        isElectron: boolean;
        isDev: boolean;
        platform: string;
        version: string;
      }>;
      platform: string;
      isElectron: boolean;
    };
  }
}

/**
 * Electron 환경인지 확인
 */
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * 내장 프록시 서버 URL 가져오기
 */
export async function getEmbeddedProxyUrl(): Promise<string | null> {
  if (!isElectronEnvironment()) {
    return null;
  }

  try {
    const port = await window.electronAPI!.getProxyPort();
    if (port) {
      return `http://localhost:${port}`;
    }
  } catch (error) {
    console.error('[ElectronBridge] Failed to get proxy port:', error);
  }
  return null;
}

/**
 * 내장 프록시 서버 상태 조회
 */
export async function getEmbeddedProxyStatus(): Promise<{
  running: boolean;
  port: number | null;
  url: string | null;
}> {
  if (!isElectronEnvironment()) {
    return { running: false, port: null, url: null };
  }

  try {
    const status = await window.electronAPI!.getProxyStatus();
    return {
      ...status,
      url: status.port ? `http://localhost:${status.port}` : null,
    };
  } catch (error) {
    console.error('[ElectronBridge] Failed to get proxy status:', error);
    return { running: false, port: null, url: null };
  }
}

/**
 * Electron 환경 정보 조회
 */
export async function getElectronInfo(): Promise<{
  isElectron: boolean;
  isDev: boolean;
  platform: string;
  version: string;
} | null> {
  if (!isElectronEnvironment()) {
    return null;
  }

  try {
    return await window.electronAPI!.getElectronInfo();
  } catch (error) {
    console.error('[ElectronBridge] Failed to get electron info:', error);
    return null;
  }
}
