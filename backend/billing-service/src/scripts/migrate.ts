// Idempotent setup for billing-service: seeds plans and builds indexes. Safe to run repeatedly.
//   npm run migrate        (uses DB_URL from .env)
import 'dotenv/config';
import mongoose from 'mongoose';
import Plan, { seedPlans } from '../models/Plan';
import Payment from '../models/Payment';
import UserSubscription from '../models/UserSubscription';
import WebhookEvent from '../models/WebhookEvent';
import AuditLog from '../models/AuditLog';
import BillingLock from '../models/BillingLock';
import UsageCounter from '../models/UsageCounter';
import QuotaReservation from '../models/QuotaReservation';
import CreatorProfile from '../models/CreatorProfile';
import ViewEvent from '../models/ViewEvent';
import LedgerEntry from '../models/LedgerEntry';
import DailyEarning from '../models/DailyEarning';
import PayoutMethod from '../models/PayoutMethod';
import Withdrawal from '../models/Withdrawal';

(async () => {
  await mongoose.connect(process.env.DB_URL!);
  await seedPlans();
  for (const m of [Plan, Payment, UserSubscription, WebhookEvent, AuditLog, BillingLock, UsageCounter, QuotaReservation, CreatorProfile, ViewEvent, LedgerEntry, DailyEarning, PayoutMethod, Withdrawal]) {
    await m.syncIndexes();
    console.log(`indexes ok: ${m.collection.collectionName}`);
  }
  await mongoose.disconnect();
  console.log('billing-service migration complete');
})().catch((e) => { console.error(e); process.exit(1); });
