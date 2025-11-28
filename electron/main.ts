/**
 * Electron Main Process
 * - BrowserWindow 생성 및 관리
 * - 내장 프록시 서버 시작/종료 (별도 프로세스)
 * - IPC 통신 핸들러
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// 프록시 서버 프로세스 관리
let serverProcess: ChildProcess | null = null;
let proxyPort: number | null = null;

// 개발 모드 여부
const isDev = !app.isPackaged;

// ============================================================
// Proxy Server Process Management
// ============================================================

function startProxyServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (serverProcess) {
      console.log('[Electron] Server already running on port', proxyPort);
      resolve(proxyPort!);
      return;
    }

    // 서버 스크립트 경로 (번들된 CJS 파일)
    const serverPath = path.join(__dirname, 'server.cjs');
    console.log('[Electron] Starting server from:', serverPath);

    // Electron 내장 Node.js로 서버 실행
    serverProcess = spawn(process.execPath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',  // Electron을 일반 Node.js로 실행
      },
    });

    // 서버로부터 메시지 수신
    serverProcess.on('message', (msg: { type: string; port?: number; error?: string }) => {
      if (msg.type === 'ready' && msg.port) {
        proxyPort = msg.port;
        console.log('[Electron] Server ready on port:', proxyPort);
        resolve(proxyPort);
      } else if (msg.type === 'error') {
        console.error('[Electron] Server error:', msg.error);
        reject(new Error(msg.error || 'Server failed to start'));
      }
    });

    // stdout/stderr 로깅
    serverProcess.stdout?.on('data', (data) => {
      console.log('[Server]', data.toString().trim());
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[Server Error]', data.toString().trim());
    });

    // 프로세스 종료 처리
    serverProcess.on('exit', (code) => {
      console.log('[Electron] Server process exited with code:', code);
      serverProcess = null;
      proxyPort = null;
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron] Failed to spawn server:', err);
      reject(err);
    });

    // 타임아웃 (15초)
    setTimeout(() => {
      if (!proxyPort) {
        reject(new Error('Server start timeout'));
      }
    }, 15000);
  });
}

async function stopProxyServer(): Promise<void> {
  if (serverProcess) {
    console.log('[Electron] Stopping server...');

    // 우아한 종료 시도
    serverProcess.send({ type: 'shutdown' });

    // 3초 대기 후 강제 종료
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (serverProcess) {
          console.log('[Electron] Force killing server...');
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 3000);

      serverProcess!.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    serverProcess = null;
    proxyPort = null;
  }
}

function getProxyPort(): number | null {
  return proxyPort;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // 네이티브 모듈 사용을 위해 필요
    },
    titleBarStyle: 'default',
    show: false, // 준비되면 표시
  });

  // 준비되면 윈도우 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 내장 프록시 서버 시작
  try {
    const proxyPort = await startProxyServer();
    console.log(`[Electron] Embedded proxy server started on port ${proxyPort}`);
  } catch (error) {
    console.error('[Electron] Failed to start proxy server:', error);
  }

  // 페이지 로드
  if (isDev) {
    // 개발 모드: Vite dev server 연결
    await mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션: 빌드된 파일 로드
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 앱 초기화
app.whenReady().then(createWindow);

// 모든 윈도우가 닫히면 종료 (Windows/Linux)
app.on('window-all-closed', async () => {
  await stopProxyServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: 독 클릭 시 윈도우 재생성
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 앱 종료 전 정리
app.on('before-quit', async () => {
  await stopProxyServer();
});

// IPC 핸들러: 프록시 포트 조회
ipcMain.handle('get-proxy-port', () => {
  return getProxyPort();
});

// IPC 핸들러: 프록시 상태 조회
ipcMain.handle('get-proxy-status', () => {
  return {
    running: getProxyPort() !== null,
    port: getProxyPort(),
  };
});

// IPC 핸들러: Electron 환경 정보
ipcMain.handle('get-electron-info', () => {
  return {
    isElectron: true,
    isDev,
    platform: process.platform,
    version: app.getVersion(),
  };
});
