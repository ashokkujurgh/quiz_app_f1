import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import connectDB from './config/db';
import { initFirebase } from './config/firebase';
import rabbitMQ from './config/rabbitmq';
import authRoutes from './routes/auth';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4001', 10);

// ── Bootstrap ─────────────────────────────────────────────
(async () => {
  await connectDB();
  initFirebase();
  await rabbitMQ.connect();   // non-fatal — service starts even if RabbitMQ is down
})().catch(console.error);

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many upload requests. Please try again later.' },
});

// ── Parsers ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'quizhub-auth-service',
    status: 'healthy',
    rabbitmq: rabbitMQ.isReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/upload', uploadLimiter);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Global error handler ──────────────────────────────────
app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status ?? 500).json({
    success: false,
    message: err.message ?? 'Internal server error.',
  });
});

// ── Graceful shutdown ─────────────────────────────────────
const shutdown = async () => {
  console.log('\n🛑 Shutting down auth service...');
  await rabbitMQ.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Auth Service  →  http://localhost:${PORT}`);
  console.log(`📋 Health check  →  http://localhost:${PORT}/health`);
  console.log(`🔑 Auth API      →  http://localhost:${PORT}/api/auth\n`);
});

export default app;
