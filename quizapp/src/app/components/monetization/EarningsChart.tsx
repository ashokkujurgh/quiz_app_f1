import { Box, Typography, useTheme } from '@mui/material';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { rupees } from '../../utils/monetization';

export interface SeriesPoint { period: string; eligibleViews: number; earnedPaise: number }

/** Eligible views (bars) and earnings (line) per day or month. Data always comes from the server. */
export function EarningsChart({ series, height = 260 }: { series: SeriesPoint[]; height?: number }) {
  const theme = useTheme();
  const data = series.map((s) => ({ ...s, earnedRupees: s.earnedPaise / 100, label: s.period.length === 7 ? s.period : s.period.slice(5) }));
  const totalViews = series.reduce((a, s) => a + s.eligibleViews, 0);
  const totalPaise = series.reduce((a, s) => a + s.earnedPaise, 0);

  return (
    <Box role="img" aria-label={`Chart: ${totalViews} eligible views and ${rupees(totalPaise)} earned in this period`}>
      {totalViews === 0 ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No eligible views in this period yet.</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
            <YAxis yAxisId="v" allowDecimals={false} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} width={40} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} width={48} tickFormatter={(v: number) => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
              formatter={(value: number, name: string) => (name === 'Earned' ? [rupees(Math.round(value * 100)), name] : [value, name])}
            />
            <Legend />
            <Bar yAxisId="v" dataKey="eligibleViews" name="Eligible views" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
            <Line yAxisId="r" dataKey="earnedRupees" name="Earned" stroke={theme.palette.warning.main} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
