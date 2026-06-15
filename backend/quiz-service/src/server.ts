import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db';
import quizRoutes from './routes/quiz';
import { rehydrateSchedules, startCleanupJob } from './jobs/scheduler';
import { initGameSocket } from './socket/gameController';

const app    = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT ?? '4005', 10);

connectDB()
  .then(() => rehydrateSchedules())
  .then(() => startCleanupJob())
  .catch(console.error);

app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5174')
    .split(',')
    .map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'meenzo-quiz-service', status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/quizzes', limiter, quizRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Internal server error.' });
});

initGameSocket(server);

const shutdown = () => { console.log('\n🛑 Shutting down quiz service...'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

server.listen(PORT, () => {
  console.log(`\n🚀 Quiz Service   →  http://localhost:${PORT}`);
  console.log(`📋 Health check   →  http://localhost:${PORT}/health`);
  console.log(`🎯 Quiz API       →  http://localhost:${PORT}/api/quizzes`);
  console.log(`🎮 Game Socket    →  ws://localhost:${PORT}/quiz.io/\n`);
});

export default app;
