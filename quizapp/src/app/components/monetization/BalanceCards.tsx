import { Box, Card, CardContent, Tooltip, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { rupees, type Balances } from '../../utils/monetization';

const CARDS: { key: keyof Balances; label: string; help: (b: Balances) => string; color?: string }[] = [
  { key: 'estimatedPaise', label: 'Estimated (today)', help: () => 'Views from today. Can still change after checks.' },
  { key: 'pendingPaise', label: 'Pending', help: (b) => `Views from the last ${b.holdDays} days, waiting to clear fraud checks.` },
  { key: 'approvedPaise', label: 'Approved', help: () => 'Cleared earnings plus any adjustments (lifetime).' },
  { key: 'availablePaise', label: 'Available', help: () => 'What you can withdraw now (approved minus withdrawn).', color: 'success.main' },
  { key: 'inWithdrawalPaise', label: 'In withdrawal', help: () => 'Held for withdrawal requests in progress.' },
  { key: 'paidPaise', label: 'Paid out', help: () => 'Total withdrawn and paid.' },
];

export function BalanceCards({ balances }: { balances: Balances }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
      {CARDS.map((c) => (
        <Card key={c.key} variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {c.label}
              <Tooltip title={c.help(balances)}><InfoOutlined sx={{ fontSize: 14 }} aria-label={c.help(balances)} /></Tooltip>
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: c.color }}>{rupees(balances[c.key] as number)}</Typography>
          </CardContent>
        </Card>
      ))}
      {balances.reversedPaise > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
          {rupees(balances.reversedPaise)} was removed for invalid views.
        </Typography>
      )}
    </Box>
  );
}
