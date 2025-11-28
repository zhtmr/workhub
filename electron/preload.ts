/**
 * Electron Preload Script
 * - 렌더러 프로세스에 안전한 API 노출
 * - contextBridge를 통한 IPC 통신
 */

import { contextBridge, ipcRenderer } from 'electron';

// 렌더러 프로세스에 노출할 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 프록시 서버 포트 조회
  getProxyPort: (): Promise<number | null> => {
    return ipcRenderer.invoke('get-proxy-port');
  },

  // 프록시 서버 상태 조회
  getProxyStatus: (): Promise<{ running: boolean; port: number | null }> => {
    return ipcRenderer.invoke('get-proxy-status');
  },

  // Electron 환경 정보 조회
  getElectronInfo: (): Promise<{
    isElectron: boolean;
    isDev: boolean;
    platform: string;
    version: string;
  }> => {
    return ipcRenderer.invoke('get-electron-info');
  },

  // 플랫폼 정보
  platform: process.platform,

  // Electron 환경 여부
  isElectron: true,
});

// TypeScript 타입 정의 (글로벌)
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
