import { Chip } from '@mui/material';

type Tone = 'default' | 'success' | 'warning' | 'error' | 'info';

const LABELS: Record<string, [string, Tone]> = {
  // payments
  created: ['Not completed', 'default'], pending: ['Pending', 'warning'], paid: ['Paid', 'success'], failed: ['Failed', 'error'],
  cancelled: ['Cancelled', 'default'], expired: ['Expired', 'default'], refunded: ['Refunded', 'info'], partially_refunded: ['Partly refunded', 'info'],
  // subscriptions
  active: ['Active', 'success'], converted: ['Upgraded', 'info'], revoked: ['Ended by admin', 'default'],
  // premium posts
  draft: ['Draft', 'default'], in_review: ['In review', 'warning'], rejected: ['Rejected', 'error'], published: ['Published', 'success'],
  published_edit_in_review: ['Live · edit in review', 'warning'], published_edit_rejected: ['Live · edit rejected', 'error'], unpublished: ['Unpublished', 'default'],
  approved: ['Approved', 'success'], superseded: ['Replaced', 'default'], withdrawn: ['Withdrawn', 'default'],
  // withdrawals
  requested: ['Requested', 'info'], under_review: ['Under review', 'warning'], processing: ['Processing', 'warning'],
};

export function StatusChip({ status }: { status: string }) {
  const [label, tone] = LABELS[status] ?? [status.replace(/_/g, ' '), 'default' as Tone];
  return <Chip size="small" label={label} color={tone === 'default' ? undefined : tone} variant={tone === 'default' ? 'outlined' : 'filled'} sx={{ fontWeight: 600 }} />;
}
