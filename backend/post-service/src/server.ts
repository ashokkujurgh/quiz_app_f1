import 'dotenv/config';

import connectDB from './config/db';
import { initFirebase } from './config/firebase';
import app from './app';
import { startPremiumJobs } from './jobs/premiumJobs';

initFirebase();

const PORT = parseInt(process.env.PORT ?? '4004', 10);

connectDB().then(() => startPremiumJobs()).catch(console.error);

const shutdown = () => { console.log('\n🛑 Shutting down post service...'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

app.listen(PORT, () => {
  console.log(`\n🚀 Post Service   →  http://localhost:${PORT}`);
  console.log(`📋 Health check   →  http://localhost:${PORT}/health`);
  console.log(`📝 Posts API      →  http://localhost:${PORT}/api/posts\n`);
});

export default app;
