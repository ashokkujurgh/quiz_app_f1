// Server amounts are integer paise.
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export const rupees = (paise: number | null | undefined) => inr.format((paise ?? 0) / 100);
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
export const errMsg = (err: unknown) => (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Something went wrong.';
