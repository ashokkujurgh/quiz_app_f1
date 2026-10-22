import 'dotenv/config';
import http from 'http';

import connectDB from './config/db';
import { initFirebase } from './config/firebase';
import appModule from './app';
import { rehydrateSchedules, startCleanupJob, startPostRecoveryJob, startInviteExpiryJob } from './jobs/scheduler';
import { initGameSocket } from './socket/gameController';

// Push notifications only — never let a bad/missing Firebase key take the quiz service down
try {
  initFirebase();
} catch (err) {
  console.warn('⚠️  Firebase Admin init failed — push notifications disabled:', (err as Error).message);
}

const app    = appModule;
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT ?? '4005', 10);

connectDB()
  .then(() => rehydrateSchedules())
  .then(() => startCleanupJob())
  .then(() => startPostRecoveryJob())
  .then(() => startInviteExpiryJob())
  .catch(console.error);

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
