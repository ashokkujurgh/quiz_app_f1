import { cleanupExpiredCandidates } from '../services/premiumImages';
import { sweepModeration } from '../services/moderation';
import { retryPendingEmails } from '../services/emailOutbox';
import { retryPendingViews } from '../services/viewTracking';

export function startPremiumJobs(): void {
  // Finish screening/assignment/publishing a crash left half-done
  setInterval(() => { sweepModeration().catch((e) => console.error('[premium] moderation sweep:', e)); }, 2 * 60 * 1000).unref();
  // Retry review emails that could not be sent yet
  setInterval(() => { retryPendingEmails().catch((e) => console.error('[premium] email retry:', e)); }, 2 * 60 * 1000).unref();
  // Deliver views billing could not take earlier
  setInterval(() => { retryPendingViews().catch((e) => console.error('[premium] view retry:', e)); }, 60 * 1000).unref();
  // Delete AI image candidates nobody accepted within 24 h
  setInterval(() => { cleanupExpiredCandidates().catch((e) => console.error('[premium] candidate cleanup:', e)); }, 30 * 60 * 1000).unref();
}
