import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, MenuItem, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api, formatDateTime, rupees, type Balances } from '../../../utils/monetization';
import { BalanceCards } from '../../monetization/BalanceCards';
import { EarningsChart, type SeriesPoint } from '../../monetization/EarningsChart';
import { RangePicker, defaultRange, type Range } from '../../monetization/RangePicker';

interface Entry { _id: string; type: string; amountPaise: number; istDay: string; reason: string | null; reversedAt: string | null; createdAt: string }

const TYPE_LABEL: Record<string, string> = {
  view_credit: 'Eligible view', view_reversal: 'Invalid view removed', adjustment: 'Adjustment',
  withdrawal_hold: 'Withdrawal requested', withdrawal_release: 'Withdrawal returned',
};

/** /creator/earnings — balances, chart and the ledger. */
export function EarningsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<{ balances: Balances; disclaimer: string; earningPaused: boolean } | null>(null);
  const [range, setRange] = useState<Range>(defaultRange());
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [ledger, setLedger] = useState<{ items: Entry[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api<{ summary: NonNullable<typeof summary> }>('/api/creator/earnings/summary').then((d) => setSummary(d.summary)).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    const q = new URLSearchParams({ from: range.from, to: range.to, granularity: range.granularity });
    api<{ analytics: { series: SeriesPoint[] } }>(`/api/creator/earnings/analytics?${q}`).then((d) => setSeries(d.analytics.series)).catch((e) => setError(e.message));
  }, [range]);
  const loadLedger = useCallback((page = 1) => {
    const q = new URLSearchParams({ page: String(page), limit: '20', ...(type ? { type } : {}) });
    api<{ entries: Entry[]; total: number }>(`/api/creator/earnings/ledger?${q}`).then((d) => setLedger({ items: d.entries, total: d.total, page })).catch((e) => setError(e.message));
  }, [type]);
  useEffect(() => { loadLedger(1); }, [loadLedger]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={800}>Earnings</Typography>
        <Stack direction="row" spacing={1}><Button onClick={() => navigate('/creator')}>Dashboard</Button><Button variant="contained" onClick={() => navigate('/creator/withdraw')}>Withdraw</Button></Stack>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {summary?.earningPaused && <Alert severity="info" sx={{ mb: 2 }}>Views aren't earning while your Creator Premium plan is inactive.</Alert>}
      {summary && <><BalanceCards balances={summary.balances} /><Typography variant="caption" color="text.secondary" display="block" mt={1} mb={2}>₹0.10 per eligible view. {summary.disclaimer}</Typography></>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <RangePicker value={range} onChange={setRange} />
          <Box mt={2}><EarningsChart series={series} /></Box>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={700}>Ledger</Typography>
        <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All</MenuItem>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Earnings ledger">
          <TableHead><TableRow><TableCell>When</TableCell><TableCell>Entry</TableCell><TableCell>For day</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
          <TableBody>
            {ledger.items.length === 0 && <TableRow><TableCell colSpan={4}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No entries yet.</Typography></TableCell></TableRow>}
            {ledger.items.map((e) => (
              <TableRow key={e._id}>
                <TableCell>{formatDateTime(e.createdAt)}</TableCell>
                <TableCell>{TYPE_LABEL[e.type] ?? e.type}{e.reversedAt && ' (later removed)'}{e.reason && <Typography variant="caption" display="block" color="text.secondary">{e.reason}</Typography>}</TableCell>
                <TableCell>{e.istDay}</TableCell>
                <TableCell align="right" sx={{ color: e.amountPaise < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>{e.amountPaise > 0 ? '+' : '−'}{rupees(Math.abs(e.amountPaise))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {ledger.total > 20 && <Pagination sx={{ mt: 2 }} count={Math.ceil(ledger.total / 20)} page={ledger.page} onChange={(_, p) => loadLedger(p)} />}
    </Box>
  );
}
