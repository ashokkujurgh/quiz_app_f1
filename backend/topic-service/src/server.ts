import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db';
import topicRoutes from './routes/topics';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '4002', 10);

// ── Bootstrap ──────────────────────────────────────────────
connectDB().catch(console.error);

// ── Security ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5174')
    .split(',')
    .map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Health ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'meenzo-topic-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ─────────────────────────────────────────────────
app.use('/api/topics', limiter, topicRoutes);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Error handler ──────────────────────────────────────────
app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Internal server error.' });
});

// ── Graceful shutdown ──────────────────────────────────────
const shutdown = () => { console.log('\n🛑 Shutting down topic service...'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Topic Service  →  http://localhost:${PORT}`);
  console.log(`📋 Health check   →  http://localhost:${PORT}/health`);
  console.log(`🏷️  Topics API     →  http://localhost:${PORT}/api/topics\n`);
});

export default app;
