/**
 * 프록시 서버 설정 관리
 * localStorage에 프록시 URL을 저장하고 관리
 * Electron 환경에서는 자동으로 내장 프록시 사용
 */

import { isElectronEnvironment, getEmbeddedProxyUrl, getEmbeddedProxyStatus } from './electron-bridge';

const PROXY_URL_KEY = 'workhub_proxy_url';

/**
 * 프록시 URL 가져오기
 */
export function getProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PROXY_URL_KEY);
}

/**
 * 프록시 URL 설정
 */
export function setProxyUrl(url: string): void {
  if (typeof window === 'undefined') return;

  // URL 정규화 (끝에 / 제거)
  const normalizedUrl = url.trim().replace(/\/+$/, '');
  localStorage.setItem(PROXY_URL_KEY, normalizedUrl);
}

/**
 * 프록시 URL 제거
 */
export function clearProxyUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROXY_URL_KEY);
}

/**
 * 프록시 모드인지 확인
 */
export function isProxyMode(): boolean {
  const url = getProxyUrl();
  return !!url && url.length > 0;
}

/**
 * 프록시 서버 상태 확인
 */
export async function checkProxyHealth(proxyUrl?: string): Promise<{
  healthy: boolean;
  message: string;
}> {
  const url = proxyUrl || getProxyUrl();
  if (!url) {
    return { healthy: false, message: '프록시 URL이 설정되지 않았습니다' };
  }

  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { healthy: false, message: `서버 응답 오류: ${response.status}` };
    }

    const data = await response.json();
    if (data.status === 'ok') {
      return { healthy: true, message: '프록시 서버 정상' };
    }

    return { healthy: false, message: '프록시 서버 상태 이상' };
  } catch (error) {
    const err = error as Error;
    return { healthy: false, message: `연결 실패: ${err.message}` };
  }
}

/**
 * 프록시 서버로 쿼리 실행
 */
export interface ProxyConnectionInfo {
  db_type: 'postgresql' | 'mysql' | 'oracle' | 'mssql';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
}

export interface ProxyQueryResult {
  success: boolean;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  columns?: string[];
  executionTimeMs?: number;
  explainPlan?: unknown;
  error?: string;
  warning?: string;
}

export async function executeQueryViaProxy(
  connection: ProxyConnectionInfo,
  sql: string,
  options?: {
    parameters?: Record<string, unknown>;
    explainOnly?: boolean;
  }
): Promise<ProxyQueryResult> {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return { success: false, error: '프록시 URL이 설정되지 않았습니다' };
  }

  try {
    const response = await fetch(`${proxyUrl}/api/execute-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection,
        sql,
        parameters: options?.parameters,
        explainOnly: options?.explainOnly,
      }),
    });

    const data = await response.json();
    return data as ProxyQueryResult;
  } catch (error) {
    const err = error as Error;
    return { success: false, error: `프록시 요청 실패: ${err.message}` };
  }
}

/**
 * 프록시 서버로 연결 테스트
 */
export async function testConnectionViaProxy(
  connection: ProxyConnectionInfo
): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
}> {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return { success: false, message: '프록시 URL이 설정되지 않았습니다' };
  }

  try {
    const response = await fetch(`${proxyUrl}/api/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `프록시 요청 실패: ${err.message}` };
  }
}

// ============================================================
// Electron 환경 자동 감지 함수들
// ============================================================

/**
 * 프록시 URL 가져오기 (Electron 우선)
 * Electron 환경이면 내장 프록시 자동 사용
 */
export async function getProxyUrlAuto(): Promise<string | null> {
  // Electron 환경이면 내장 프록시 자동 사용
  if (isElectronEnvironment()) {
    const embeddedUrl = await getEmbeddedProxyUrl();
    if (embeddedUrl) {
      return embeddedUrl;
    }
  }

  // 수동 설정된 URL 사용
  return getProxyUrl();
}

/**
 * 프록시 모드인지 확인 (Electron 포함)
 */
export async function isProxyModeAuto(): Promise<boolean> {
  if (isElectronEnvironment()) {
    const embeddedUrl = await getEmbeddedProxyUrl();
    if (embeddedUrl) {
      return true;
    }
  }
  return isProxyMode();
}

/**
 * 프록시 서버 상태 확인 (Electron 포함)
 */
export async function checkProxyHealthAuto(): Promise<{
  healthy: boolean;
  message: string;
  embedded?: boolean;
}> {
  // Electron 환경이면 내장 프록시 확인
  if (isElectronEnvironment()) {
    const status = await getEmbeddedProxyStatus();
    if (status.running && status.url) {
      const health = await checkProxyHealth(status.url);
      return { ...health, embedded: true };
    }
  }

  // 수동 설정된 프록시 확인
  return checkProxyHealth();
}

/**
 * Electron 환경 여부 재노출 (편의성)
 */
export { isElectronEnvironment } from './electron-bridge';
