import { Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';

export interface Range { from: string; to: string; granularity: 'day' | 'month' }

const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);   // IST date
export const defaultRange = (): Range => ({ from: new Date(Date.parse(today()) - 29 * 86_400_000).toISOString().slice(0, 10), to: today(), granularity: 'day' });

/** Date range + day/month switch for the earnings charts. */
export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <TextField size="small" type="date" label="From" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={{ max: value.to }} />
      <TextField size="small" type="date" label="To" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={{ min: value.from, max: today() }} />
      <ToggleButtonGroup size="small" exclusive value={value.granularity} onChange={(_, g) => g && onChange({ ...value, granularity: g })} aria-label="Group by">
        <ToggleButton value="day">Daily</ToggleButton>
        <ToggleButton value="month">Monthly</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
