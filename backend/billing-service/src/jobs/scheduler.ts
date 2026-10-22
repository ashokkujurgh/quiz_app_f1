import cron from 'node-cron';
import { reconcileOpenPayments } from '../services/payments';
import { markExpired } from '../services/subscriptions';
import { releaseExpired, reconcileCounters } from '../services/quota';
import { reconcile as reconcileEarnings } from '../services/earnings';
import { reconcileWithdrawals } from '../services/withdrawals';

export function startJobs(): void {
  // Pick up payments whose browser callback never arrived and webhooks we missed
  cron.schedule('*/5 * * * *', () => {
    reconcileOpenPayments().catch((e) => console.error('[billing] reconcile job:', e));
  });
  // Bookkeeping only: entitlement already ignores ended periods
  cron.schedule('7 * * * *', () => {
    markExpired().catch((e) => console.error('[billing] expiry job:', e));
  });
  // Give back credits held for invites/games that never started
  cron.schedule('*/2 * * * *', () => {
    releaseExpired().catch((e) => console.error('[billing] reservation expiry job:', e));
  });
  // Repair daily counters from reservation rows (covers a crash between two writes)
  cron.schedule('*/15 * * * *', () => {
    reconcileCounters().catch((e) => console.error('[billing] counter reconcile job:', e));
  });
  // Check earnings rollups against the ledger and repair (last 10 days)
  cron.schedule('*/30 * * * *', () => {
    reconcileEarnings({ days: 10 }).catch((e) => console.error('[billing] earnings reconcile job:', e));
  });
  // Every withdrawal must have its hold, and a release only if it was rejected/failed/cancelled
  cron.schedule('17 * * * *', () => {
    reconcileWithdrawals().catch((e) => console.error('[billing] withdrawal reconcile job:', e));
  });
}
