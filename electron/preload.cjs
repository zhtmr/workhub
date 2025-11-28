/**
 * Electron Preload Script (CommonJS)
 * - 렌더러 프로세스에 안전한 API 노출
 * - contextBridge를 통한 IPC 통신
 */

const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에 노출할 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 프록시 서버 포트 조회
  getProxyPort: () => {
    return ipcRenderer.invoke('get-proxy-port');
  },

  // 프록시 서버 상태 조회
  getProxyStatus: () => {
    return ipcRenderer.invoke('get-proxy-status');
  },

  // Electron 환경 정보 조회
  getElectronInfo: () => {
    return ipcRenderer.invoke('get-electron-info');
  },

  // 플랫폼 정보
  platform: process.platform,

  // Electron 환경 여부
  isElectron: true,
});
