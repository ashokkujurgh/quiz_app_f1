import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { errMsg, fmtDate, rupees } from '../lib/money';
import { Badge, Btn, Notice, PageHeader, Pager, Panel, Td, Th, inputCls, rowCls, theadCls } from '../components/ui';

interface W {
  id: string; creatorId: string; amountPaise: number; status: string; method: { type: string; label: string; masked: Record<string, string> };
  rejectionReason: string | null; failureReason: string | null; payoutReference: string | null; paidAt: string | null; createdAt: string;
  history: { status: string; at: string; note: string | null; by: string }[];
}
interface Bal { approvedPaise: number; availablePaise: number; inWithdrawalPaise: number; paidPaise: number; pendingPaise: number; estimatedPaise: number; reversedPaise: number }
interface Detail { withdrawal: W; creatorBalances: Bal; previousWithdrawals: W[] }

const NEXT: Record<string, { action: string; label: string; variant: 'primary' | 'success' | 'danger' }[]> = {
  requested: [{ action: 'review', label: 'Start review', variant: 'primary' }, { action: 'reject', label: 'Reject', variant: 'danger' }],
  under_review: [{ action: 'approve', label: 'Approve', variant: 'success' }, { action: 'reject', label: 'Reject', variant: 'danger' }],
  approved: [{ action: 'process', label: 'Mark processing', variant: 'primary' }, { action: 'reject', label: 'Reject', variant: 'danger' }],
  processing: [{ action: 'paid', label: 'Mark paid…', variant: 'success' }, { action: 'failed', label: 'Mark failed', variant: 'danger' }],
};

function DetailPanel({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [secret, setSecret] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [mode, setMode] = useState<'' | 'reject' | 'failed' | 'paid'>('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get(`/api/billing/admin/withdrawals/${id}`).then(({ data }) => setD(data)).catch((e) => setError(errMsg(e))), [id]);
  useEffect(() => { setSecret(null); setMode(''); load(); }, [load]);

  const reveal = async () => {
    try { const { data } = await api.get(`/api/billing/admin/withdrawals/${id}/payout-details`); setSecret(data.payout.details); }
    catch (e) { setError(errMsg(e)); }
  };

  const act = async (action: string, body: object = {}) => {
    setBusy(true); setError('');
    try { await api.post(`/api/billing/admin/withdrawals/${id}/${action}`, body); setMode(''); setReason(''); setReference(''); setConfirmed(false); await load(); onChanged(); }
    catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  if (!d) return <Panel className="p-6 text-gray-400">{error || 'Loading…'}</Panel>;
  const w = d.withdrawal;
  const open = ['requested', 'under_review', 'approved', 'processing'].includes(w.status);

  return (
    <Panel className="p-6 space-y-5">
      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{rupees(w.amountPaise)}</div>
          <div className="text-sm text-gray-500">Creator {w.creatorId} · requested {fmtDate(w.createdAt)}</div>
        </div>
        <Badge>{w.status}</Badge>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Pay to ({w.method.type.replace(/_/g, ' ')})</div>
        <div className="text-sm text-gray-800 dark:text-gray-200">{w.method.label}</div>
        {open && !secret && <Btn className="mt-2" onClick={reveal}>Show full details (logged)</Btn>}
        {secret && (
          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-3 text-sm space-y-0.5">
            {Object.entries(secret).map(([k, v]) => <div key={k}><span className="text-gray-500">{k}:</span> <span className="font-mono">{v}</span></div>)}
            <div className="text-xs text-amber-700 dark:text-amber-400 pt-1">This view was recorded in the audit log. Don't copy these details anywhere else.</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        {([['Available', d.creatorBalances.availablePaise], ['In withdrawal', d.creatorBalances.inWithdrawalPaise], ['Paid out', d.creatorBalances.paidPaise], ['Approved', d.creatorBalances.approvedPaise], ['Pending', d.creatorBalances.pendingPaise], ['Reversed', d.creatorBalances.reversedPaise]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3"><div className="text-xs text-gray-500">{l}</div><div className="font-semibold text-gray-900 dark:text-white">{rupees(v)}</div></div>
        ))}
      </div>

      {open && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {NEXT[w.status]?.map((n) => (
              <Btn key={n.action} variant={n.variant} disabled={busy}
                onClick={() => (['reject', 'failed', 'paid'].includes(n.action) ? setMode(n.action as 'reject' | 'failed' | 'paid') : act(n.action))}>{n.label}</Btn>
            ))}
          </div>
          {(mode === 'reject' || mode === 'failed') && (
            <div className="space-y-2">
              <textarea className={`${inputCls} w-full`} rows={2} placeholder={mode === 'reject' ? 'Reason the creator will see' : 'Why did the payout fail?'} value={reason} onChange={(e) => setReason(e.target.value)} />
              <Btn variant="danger" disabled={busy || reason.trim().length < 5} onClick={() => act(mode, { reason })}>{mode === 'reject' ? 'Reject and return funds' : 'Mark failed and return funds'}</Btn>
            </div>
          )}
          {mode === 'paid' && (
            <div className="space-y-2">
              <input className={`${inputCls} w-full`} placeholder="Payment reference (UTR / UPI ref / gift card order id)" value={reference} onChange={(e) => setReference(e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I confirm the money / gift card has actually been delivered
              </label>
              <Btn variant="success" disabled={busy || reference.trim().length < 3 || !confirmed} onClick={() => act('paid', { payoutReference: reference.trim(), confirmFulfilled: true })}>Mark paid</Btn>
            </div>
          )}
        </div>
      )}
      {w.payoutReference && <div className="text-sm text-green-700 dark:text-green-400">Paid {fmtDate(w.paidAt)} · ref <span className="font-mono">{w.payoutReference}</span></div>}
      {(w.rejectionReason || w.failureReason) && <div className="text-sm text-red-600">{w.rejectionReason ?? w.failureReason}</div>}

      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">History</div>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          {w.history.map((h, i) => <li key={i}><b>{h.status.replace(/_/g, ' ')}</b> · {h.by} · {fmtDate(h.at)}{h.note ? ` · ${h.note}` : ''}</li>)}
        </ul>
      </div>
      {d.previousWithdrawals.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Earlier withdrawals by this creator</div>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">{d.previousWithdrawals.map((p) => <li key={p.id}>{rupees(p.amountPaise)} · {p.status} · {fmtDate(p.createdAt)}</li>)}</ul>
        </div>
      )}
    </Panel>
  );
}

export default function Payouts() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<W[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [check, setCheck] = useState('');

  const load = useCallback(() => {
    api.get('/api/billing/admin/withdrawals', { params: { status: status || undefined, page, limit: 20 } })
      .then(({ data }) => { setRows(data.withdrawals); setTotal(data.total); }).catch((e) => setError(errMsg(e)));
  }, [status, page]);
  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const { data } = await api.get('/api/billing/admin/withdrawals/export.csv', { params: { status: status || undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement('a'); a.href = url; a.download = `meenzo-withdrawals-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(errMsg(e)); }
  };

  const reconcile = async () => {
    try { const { data } = await api.post('/api/billing/admin/withdrawals/reconcile'); setCheck(data.result.problems.length ? `Problems: ${data.result.problems.join('; ')}` : `All ${data.result.checked} withdrawals match the ledger.`); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="p-8">
      <PageHeader title="Payouts" subtitle="Manual payouts: pay outside Meenzo, then record the reference. Never mark paid before delivery is confirmed."
        actions={<><Btn onClick={reconcile}>Check ledger</Btn><Btn onClick={exportCsv}>Export CSV</Btn></>} />
      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}
      {check && <Notice kind={check.startsWith('All') ? 'success' : 'error'} onClose={() => setCheck('')}>{check}</Notice>}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['open', 'requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'failed', 'cancelled', ''].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }}
            className={`text-sm px-3 py-1.5 rounded-xl ${status === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}>
            {s ? s.replace(/_/g, ' ') : 'all'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <Panel className="overflow-hidden">
            {rows.length === 0 ? <div className="py-16 text-center text-gray-400">No withdrawals.</div> : (
              <table className="w-full text-sm">
                <thead><tr className={theadCls}><Th>Requested</Th><Th>Creator</Th><Th right>Amount</Th><Th>Method</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {rows.map((w) => (
                    <tr key={w.id} onClick={() => setSelected(w.id)} className={`${rowCls} cursor-pointer ${selected === w.id ? 'bg-indigo-50 dark:bg-indigo-600/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                      <Td>{fmtDate(w.createdAt)}</Td><Td mono>{w.creatorId.slice(-8)}</Td><Td right>{rupees(w.amountPaise)}</Td><Td>{w.method.label}</Td><Td><Badge>{w.status}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <Pager page={page} total={total} limit={20} onPage={setPage} />
        </div>
        <div>{selected ? <DetailPanel id={selected} onChanged={load} /> : <Panel className="p-10 text-center text-gray-400">Select a withdrawal to see details.</Panel>}</div>
      </div>
    </div>
  );
}
