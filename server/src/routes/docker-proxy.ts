/**
 * Docker API Proxy Route
 * Electron 앱에서 Mixed Content 문제를 우회하기 위한 프록시
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Docker API 프록시 엔드포인트
 * POST /api/docker/proxy
 * Body: { host: string, path: string, method?: string }
 */
router.post('/docker/proxy', async (req: Request, res: Response) => {
  const { host, path, method = 'GET' } = req.body;

  if (!host || !path) {
    return res.status(400).json({
      success: false,
      error: 'host and path are required',
    });
  }

  // Docker host URL 정규화
  let dockerUrl = host;
  if (dockerUrl.startsWith('tcp://')) {
    dockerUrl = dockerUrl.replace('tcp://', 'http://');
  }
  dockerUrl = dockerUrl.replace(/\/$/, '');

  const fullUrl = `${dockerUrl}${path}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: errorText || `Docker API error: ${response.status}`,
      });
    }

    const data = await response.json();
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Docker Proxy] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timeout',
        });
      }
      return res.status(502).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Unknown error',
    });
  }
});

/**
 * Docker 연결 테스트 엔드포인트
 * POST /api/docker/test
 * Body: { host: string }
 */
router.post('/docker/test', async (req: Request, res: Response) => {
  const { host } = req.body;

  if (!host) {
    return res.status(400).json({
      success: false,
      error: 'host is required',
    });
  }

  // Docker host URL 정규화
  let dockerUrl = host;
  if (dockerUrl.startsWith('tcp://')) {
    dockerUrl = dockerUrl.replace('tcp://', 'http://');
  }
  dockerUrl = dockerUrl.replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    const response = await fetch(`${dockerUrl}/version`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.json({
        success: false,
        error: `Connection failed: ${response.status}`,
      });
    }

    const data = await response.json();
    return res.json({
      success: true,
      version: data.Version,
    });
  } catch (error) {
    console.error('[Docker Proxy] Test error:', error);
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
});

/**
 * Prometheus API 프록시 엔드포인트
 * POST /api/prometheus/proxy
 * Body: { endpoint: string, path: string, params?: Record<string, string>, authToken?: string }
 */
router.post('/prometheus/proxy', async (req: Request, res: Response) => {
  const { endpoint, path, params, authToken } = req.body;

  if (!endpoint || !path) {
    return res.status(400).json({
      success: false,
      error: 'endpoint and path are required',
    });
  }

  try {
    const url = new URL(path, endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value as string);
      });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: errorText || `Prometheus API error: ${response.status}`,
      });
    }

    const data = await response.json();
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Prometheus Proxy] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timeout',
        });
      }
      return res.status(502).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Unknown error',
    });
  }
});

/**
 * GitLab API 프록시 엔드포인트
 * POST /api/gitlab/proxy
 * Body: { baseUrl: string, endpoint: string, method?: string, privateToken: string, body?: any }
 */
router.post('/gitlab/proxy', async (req: Request, res: Response) => {
  const { baseUrl, endpoint, method = 'GET', privateToken, body } = req.body;

  if (!baseUrl || !endpoint || !privateToken) {
    return res.status(400).json({
      success: false,
      error: 'baseUrl, endpoint, and privateToken are required',
    });
  }

  // URL 정규화
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const fullUrl = `${normalizedBaseUrl}/api/v4${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': privateToken,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timeoutId);

    // 응답 헤더에서 페이지네이션 정보 추출
    const totalPages = response.headers.get('x-total-pages');
    const total = response.headers.get('x-total');
    const nextPage = response.headers.get('x-next-page');

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitLab API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return res.status(response.status).json({
        success: false,
        error: errorMessage,
      });
    }

    const data = await response.json();
    return res.json({
      success: true,
      data,
      pagination: {
        totalPages: totalPages ? parseInt(totalPages, 10) : null,
        total: total ? parseInt(total, 10) : null,
        nextPage: nextPage ? parseInt(nextPage, 10) : null,
      },
    });
  } catch (error) {
    console.error('[GitLab Proxy] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Request timeout',
        });
      }
      return res.status(502).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Unknown error',
    });
  }
});

export const dockerProxyRouter = router;
