import 'dotenv/config';
import app from './app';
import connectDB from './config/db';
import { seedPlans } from './models/Plan';
import { startJobs } from './jobs/scheduler';
import { isConfigured, isWebhookConfigured } from './services/razorpay';

const PORT = parseInt(process.env.PORT ?? '4008', 10);

(async () => {
  await connectDB();
  await seedPlans();
  startJobs();
  if (!isConfigured())        console.warn('⚠️  RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — checkout is disabled.');
  if (!isWebhookConfigured()) console.warn('⚠️  RAZORPAY_WEBHOOK_SECRET not set — webhooks are rejected.');
  if (!process.env.INTERNAL_SERVICE_SECRET) console.warn('⚠️  INTERNAL_SERVICE_SECRET not set — internal API is disabled.');
})().catch(console.error);

const shutdown = () => { console.log('\n🛑 Shutting down billing service...'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

app.listen(PORT, () => {
  console.log(`\n🚀 Billing Service →  http://localhost:${PORT}`);
  console.log(`📋 Health check    →  http://localhost:${PORT}/health\n`);
});
