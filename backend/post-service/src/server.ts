import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db';
import { initFirebase } from './config/firebase';
import postRoutes from './routes/posts';

initFirebase();

const app  = express();
const PORT = parseInt(process.env.PORT ?? '4004', 10);

connectDB().catch(console.error);

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

app.use('/api/posts', limiter, postRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Internal server error.' });
});

const shutdown = () => { console.log('\n🛑 Shutting down post service...'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

app.listen(PORT, () => {
  console.log(`\n🚀 Post Service   →  http://localhost:${PORT}`);
  console.log(`📋 Health check   →  http://localhost:${PORT}/health`);
  console.log(`📝 Posts API      →  http://localhost:${PORT}/api/posts\n`);
});

export default app;
