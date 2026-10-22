import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import billingRoutes from './routes/billing';
import internalRoutes from './routes/internal';
import creatorRoutes from './routes/creator';
import { razorpayWebhook } from './controllers/webhookController';
import { ah, errorHandler } from './utils/http';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Webhook needs the exact raw bytes for its signature, so it is mounted before the JSON parser
app.post('/api/billing/webhook/razorpay', express.raw({ type: '*/*', limit: '1mb' }), ah(razorpayWebhook));

app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'meenzo-billing-service', status: 'healthy', timestamp: new Date().toISOString() });
});

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

app.use('/api/billing', limiter, billingRoutes);
app.use('/api/creator', limiter, creatorRoutes);
app.use('/internal', internalRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use(errorHandler);

export default app;
