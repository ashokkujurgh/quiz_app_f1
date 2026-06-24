import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db';
import { initFirebase } from './config/firebase';
import friendRoutes from './routes/friends';

initFirebase();

const app  = express();
const PORT = process.env.PORT ?? 4006;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'friend-service' }));
app.use('/api/friends', friendRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

connectDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 friend-service running on port ${PORT}`)))
  .catch((err) => { console.error('Failed to start:', err); process.exit(1); });
