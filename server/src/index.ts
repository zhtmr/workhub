/**
 * WorkHub Proxy Server
 * 내부망 DB 연결을 위한 프록시 서버
 */

import express from 'express';
import cors from 'cors';
import { queryRouter } from './routes/query';
import { connectionRouter } from './routes/connection';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // 내부망 전용이므로 모든 origin 허용
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', queryRouter);
app.use('/api', connectionRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  WorkHub Proxy Server                                  ║
║  Running on http://localhost:${PORT}                      ║
║  Health check: http://localhost:${PORT}/health            ║
╚════════════════════════════════════════════════════════╝
  `);
});
