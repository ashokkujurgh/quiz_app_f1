import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import postRoutes from './routes/posts';
import seoRoutes from './routes/seo';
import premiumRoutes from './routes/premium';
import moderationRoutes from './routes/moderation';

const app = express();
// Production: host nginx → frontend nginx → this service. TRUST_PROXY_HOPS=2 makes req.ip the real
// client when the host nginx sends X-Forwarded-For (used only for the hashed anti-abuse signal).
app.set('trust proxy', Math.max(1, parseInt(process.env.TRUST_PROXY_HOPS ?? '2', 10) || 2));

// SEO pages serve the SPA's HTML — keep them out of helmet's API-oriented headers
app.use('/seo', seoRoutes);

app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'meenzo-post-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Mounted before /api/posts so /api/posts/premium/* never falls into /api/posts/:id
app.use('/api/posts/premium', limiter, premiumRoutes);
app.use('/api/posts', limiter, postRoutes);
app.use('/api/moderation', limiter, moderationRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Internal server error.' });
});

export default app;
