import type { ReactNode } from 'react';

// Small shared building blocks for the money/moderation admin pages (same look as Users).

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800 ${className}`}>{children}</div>;
}

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'indigo';
const TONES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
};
const STATUS_TONE: Record<string, Tone> = {
  requested: 'blue', under_review: 'amber', approved: 'indigo', processing: 'amber', paid: 'green', rejected: 'red', failed: 'red', cancelled: 'gray',
  active: 'green', expired: 'gray', converted: 'blue', refunded: 'blue', revoked: 'gray', suspended: 'red',
  created: 'gray', pending: 'amber', partially_refunded: 'blue',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const t = tone ?? STATUS_TONE[String(children)] ?? 'gray';
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${TONES[t]}`}>{typeof children === 'string' ? children.replace(/_/g, ' ') : children}</span>;
}

const BTN = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  success: 'bg-green-600 hover:bg-green-500 text-white',
  ghost: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700',
};
export function Btn({ children, variant = 'ghost', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return <button {...rest} className={`text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN[variant]} ${rest.className ?? ''}`}>{children}</button>;
}

export const inputCls = 'rounded-xl px-3 py-2 text-sm border bg-white border-gray-200 text-gray-900 placeholder-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return <th className={`${right ? 'text-right' : 'text-left'} px-4 py-3 font-medium`}>{children}</th>;
}
export function Td({ children, right, mono }: { children?: ReactNode; right?: boolean; mono?: boolean }) {
  return <td className={`px-4 py-3 ${right ? 'text-right' : ''} ${mono ? 'font-mono text-xs' : ''} text-gray-700 dark:text-gray-300`}>{children}</td>;
}
export const theadCls = 'border-b text-xs uppercase tracking-wider border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-500';
export const rowCls = 'border-b last:border-0 border-gray-100 dark:border-gray-800';

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4 text-sm text-gray-500">
      <Btn disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Btn>
      <span>Page {page} of {pages}</span>
      <Btn disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Btn>
    </div>
  );
}

export function Notice({ kind, children, onClose }: { kind: 'error' | 'success' | 'info'; children: ReactNode; onClose?: () => void }) {
  const cls = kind === 'error' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
    : kind === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30'
    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-xl border px-4 py-3 text-sm flex justify-between gap-4 ${cls}`}>
      <div>{children}</div>
      {onClose && <button onClick={onClose} aria-label="Dismiss" className="opacity-60 hover:opacity-100">✕</button>}
    </div>
  );
}
