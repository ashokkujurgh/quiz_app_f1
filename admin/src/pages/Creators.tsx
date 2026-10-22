import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { errMsg, fmtDate, rupees } from '../lib/money';
import { Badge, Btn, Notice, PageHeader, Pager, Panel, Td, Th, inputCls, rowCls, theadCls } from '../components/ui';

interface Creator { id: string; userId: string; displayName: string; bio: string; status: 'active' | 'suspended'; acceptedGuidelinesAt: string; createdAt: string }
type Bal = Record<string, number>;

function CreatorPanel({ c, onChanged }: { c: Creator; onChanged: () => void }) {
  const [bal, setBal] = useState<{ ledger: Bal; rollups: Bal; consistent: boolean } | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [adj, setAdj] = useState({ amount: '', reason: '' });
  const [rev, setRev] = useState({ postId: '', fromDay: '', toDay: '', reason: '' });

  const load = useCallback(() => api.get(`/api/billing/admin/creators/${c.userId}/balance`).then(({ data }) => setBal(data)).catch((e) => setError(errMsg(e))), [c.userId]);
  useEffect(() => { setOk(''); setError(''); load(); }, [load]);

  const setStatus = async (status: 'active' | 'suspended') => {
    const reason = window.prompt(`Reason to ${status === 'suspended' ? 'suspend' : 'reinstate'} this creator (logged):`);
    if (!reason) return;
    try { await api.post(`/api/billing/admin/creators/${c.userId}/status`, { status, reason }); onChanged(); } catch (e) { setError(errMsg(e)); }
  };
  const adjust = async () => {
    const paise = Math.round(parseFloat(adj.amount) * 100);
    if (!window.confirm(`${paise > 0 ? 'Add' : 'Deduct'} ${rupees(Math.abs(paise))} ${paise > 0 ? 'to' : 'from'} ${c.displayName}'s earnings?`)) return;
    try { await api.post('/api/billing/admin/earnings/adjust', { creatorId: c.userId, amountPaise: paise, reason: adj.reason }); setOk('Adjustment recorded.'); setAdj({ amount: '', reason: '' }); load(); } catch (e) { setError(errMsg(e)); }
  };
  const reverse = async () => {
    if (!window.confirm('Remove the earnings for every view of this post in that date range?')) return;
    try { const { data } = await api.post('/api/billing/admin/earnings/reverse', rev); setOk(`${data.reversed} view credits reversed.`); load(); } catch (e) { setError(errMsg(e)); }
  };
  const reconcile = async () => {
    try { const { data } = await api.post('/api/billing/admin/earnings/reconcile', { creatorId: c.userId, days: 400 }); setOk(`Checked ${data.result.checked} day(s); fixed ${data.result.fixed}; missing credits repaired ${data.result.repairedCredits}.`); load(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <Panel className="p-6 space-y-5">
      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}
      {ok && <Notice kind="success" onClose={() => setOk('')}>{ok}</Notice>}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{c.displayName}</div>
          <div className="text-sm text-gray-500">User {c.userId} · creator since {fmtDate(c.createdAt)}</div>
        </div>
        <div className="flex gap-2 items-center"><Badge>{c.status}</Badge>
          {c.status === 'active' ? <Btn variant="danger" onClick={() => setStatus('suspended')}>Suspend</Btn> : <Btn variant="success" onClick={() => setStatus('active')}>Reinstate</Btn>}
        </div>
      </div>
      {bal && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-gray-400">Balances (from the ledger)</div>
            <Badge tone={bal.consistent ? 'green' : 'red'}>{bal.consistent ? 'ledger = dashboard' : 'mismatch — run check'}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[['estimatedPaise', 'Estimated'], ['pendingPaise', 'Pending'], ['approvedPaise', 'Approved'], ['availablePaise', 'Available'], ['inWithdrawalPaise', 'In withdrawal'], ['paidPaise', 'Paid'], ['reversedPaise', 'Reversed'], ['adjustmentsPaise', 'Adjustments']].map(([k, l]) => (
              <div key={k} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3"><div className="text-xs text-gray-500">{l}</div><div className="font-semibold text-gray-900 dark:text-white">{rupees(bal.ledger[k])}</div></div>
            ))}
          </div>
          <Btn className="mt-3" onClick={reconcile}>Check & repair against ledger</Btn>
        </div>
      )}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Manual adjustment (₹, negative to deduct)</div>
        <div className="flex gap-2 flex-wrap">
          <input className={`${inputCls} w-32`} placeholder="e.g. 50 or -20" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} aria-label="Amount in rupees" />
          <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Reason (shown in the creator's ledger)" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
          <Btn variant="primary" disabled={!adj.amount || !Number(adj.amount) || adj.reason.trim().length < 5} onClick={adjust}>Record</Btn>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Reverse invalid views (fraud)</div>
        <div className="flex gap-2 flex-wrap">
          <input className={`${inputCls} w-56`} placeholder="Public post id" value={rev.postId} onChange={(e) => setRev({ ...rev, postId: e.target.value })} />
          <input className={inputCls} type="date" value={rev.fromDay} onChange={(e) => setRev({ ...rev, fromDay: e.target.value })} aria-label="From day" />
          <input className={inputCls} type="date" value={rev.toDay} onChange={(e) => setRev({ ...rev, toDay: e.target.value })} aria-label="To day" />
          <input className={`${inputCls} flex-1 min-w-[160px]`} placeholder="Reason" value={rev.reason} onChange={(e) => setRev({ ...rev, reason: e.target.value })} />
          <Btn variant="danger" disabled={!rev.postId || !rev.fromDay || !rev.toDay || rev.reason.trim().length < 5} onClick={reverse}>Reverse</Btn>
        </div>
      </div>
    </Panel>
  );
}

export default function Creators() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Creator | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get('/api/billing/admin/creators', { params: { status: status || undefined, page, limit: 20 } })
    .then(({ data }) => { setRows(data.creators); setTotal(data.total); setSelected((s) => s && (data.creators as Creator[]).find((c) => c.id === s.id) || s); })
    .catch((e) => setError(errMsg(e))), [status, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <PageHeader title="Creators" subtitle="Creator accounts, balances and earnings corrections. Every action is logged." />
      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}
      <div className="mb-4">
        <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status filter">
          <option value="">All creators</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <Panel className="overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className={theadCls}><Th>Creator</Th><Th>Since</Th><Th>Status</Th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className={`${rowCls} cursor-pointer ${selected?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-600/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <Td>{c.displayName}<div className="text-xs text-gray-500 font-mono">{c.userId.slice(-8)}</div></Td><Td>{fmtDate(c.createdAt)}</Td><Td><Badge>{c.status}</Badge></Td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={3} className="py-12 text-center text-gray-400">No creators yet.</td></tr>}
              </tbody>
            </table>
          </Panel>
          <Pager page={page} total={total} limit={20} onPage={setPage} />
        </div>
        <div>{selected ? <CreatorPanel c={selected} onChanged={load} /> : <Panel className="p-10 text-center text-gray-400">Select a creator.</Panel>}</div>
      </div>
    </div>
  );
}
