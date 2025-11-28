/**
 * 번들된 서버 모듈의 타입 선언
 */

export function startProxyServer(preferredPort?: number): Promise<number>;
export function stopProxyServer(): Promise<void>;
export function getProxyPort(): number | null;
