import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import connectDB from './config/db';
import { initFirebase } from './config/firebase';
import { setIO } from './config/socket';
import messageRoutes from './routes/messages';
import { authenticateSocket } from './middleware/auth';
import { registerChatHandlers } from './socket/chatHandler';

initFirebase();

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT ?? 4007;

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'];

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'message-service' }));
app.use('/api/messages', messageRoutes);
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const io = new Server(server, {
  path: '/messages.io/',
  cors: { origin: allowedOrigins, credentials: true },
});

setIO(io);

io.use(authenticateSocket as Parameters<typeof io.use>[0]);
io.on('connection', (socket) => {
  registerChatHandlers(io, socket as Parameters<typeof registerChatHandlers>[1]);
});

connectDB()
  .then(() => server.listen(PORT, () => console.log(`🚀 message-service running on port ${PORT}`)))
  .catch((err) => { console.error('Failed to start:', err); process.exit(1); });
