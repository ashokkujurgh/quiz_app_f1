import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { errMsg, fmtDate, rupees } from '../lib/money';
import UserPicker from '../components/UserPicker';
import { Badge, Btn, Notice, PageHeader, Pager, Panel, Td, Th, inputCls, rowCls, theadCls } from '../components/ui';

interface Pay { id: string; userId: string; planCode: string; amountPaise: number; status: string; method: string | null; paymentRef: string | null; orderId: string | null; refundedPaise: number; failureReason: string | null; createdAt: string; paidAt: string | null }
interface Sub { _id: string; userId: string; planCode: string; status: string; startsAt: string; endsAt: string; source: string; statusReason: string | null }

export default function Subscriptions() {
  const [tab, setTab] = useState<'payments' | 'subscriptions'>('payments');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pays, setPays] = useState<{ items: Pay[]; total: number }>({ items: [], total: 0 });
  const [subs, setSubs] = useState<{ items: Sub[]; total: number }>({ items: [], total: 0 });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [grantUser, setGrantUser] = useState<{ _id: string; name: string; email: string } | null>(null);
  const [grant, setGrant] = useState({ planCode: 'premium', days: '30', reason: '' });

  const load = useCallback(() => {
    if (tab === 'payments') api.get('/api/billing/admin/payments', { params: { status: status || undefined, page, limit: 20 } }).then(({ data }) => setPays({ items: data.payments, total: data.total })).catch((e) => setError(errMsg(e)));
    else api.get('/api/billing/admin/subscriptions', { params: { status: status || undefined, page, limit: 20 } }).then(({ data }) => setSubs({ items: data.subscriptions, total: data.total })).catch((e) => setError(errMsg(e)));
  }, [tab, status, page]);
  useEffect(() => { load(); }, [load]);

  const reconcile = async (id: string) => {
    try { const { data } = await api.post(`/api/billing/admin/payments/${id}/reconcile`); setOk(`Re-checked with Razorpay: ${data.payment.status}.`); load(); } catch (e) { setError(errMsg(e)); }
  };
  const revoke = async (id: string) => {
    const reason = window.prompt('Reason for ending this plan period (logged):');
    if (!reason) return;
    try { await api.post(`/api/billing/admin/subscriptions/${id}/revoke`, { reason }); setOk('Plan period ended.'); load(); } catch (e) { setError(errMsg(e)); }
  };
  const doGrant = async () => {
    if (!grantUser) return;
    try {
      await api.post('/api/billing/admin/subscriptions/grant', { userId: grantUser._id, planCode: grant.planCode, days: Number(grant.days), reason: grant.reason });
      setOk(`Granted ${grant.planCode} for ${grant.days} days to ${grantUser.name}.`); setGrantUser(null); setGrant({ planCode: 'premium', days: '30', reason: '' }); load();
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="p-8">
      <PageHeader title="Subscriptions" subtitle="Razorpay one-time 30-day passes. Payments activate only after server-side verification." />
      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}
      {ok && <Notice kind="success" onClose={() => setOk('')}>{ok}</Notice>}

      <Panel className="p-5 mb-6">
        <div className="font-semibold text-gray-900 dark:text-white mb-2">Grant a plan without payment (support, testing)</div>
        {grantUser ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">{grantUser.name} ({grantUser.email})</span>
            <select className={inputCls} value={grant.planCode} onChange={(e) => setGrant({ ...grant, planCode: e.target.value })} aria-label="Plan">
              <option value="premium">Premium</option><option value="creator">Creator Premium</option>
            </select>
            <input className={`${inputCls} w-24`} type="number" min={1} max={366} value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} aria-label="Days" />
            <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Reason (logged)" value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} />
            <Btn variant="primary" disabled={!grant.reason.trim()} onClick={doGrant}>Grant</Btn>
            <Btn onClick={() => setGrantUser(null)}>Cancel</Btn>
          </div>
        ) : <UserPicker onPick={setGrantUser} label="Find user" />}
      </Panel>

      <div className="flex gap-2 mb-4">
        {(['payments', 'subscriptions'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setStatus(''); setPage(1); }} className={`text-sm px-3 py-1.5 rounded-xl ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}>{t}</button>
        ))}
        <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status filter">
          <option value="">All statuses</option>
          {(tab === 'payments' ? ['created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'] : ['active', 'expired', 'converted', 'refunded', 'revoked']).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <Panel className="overflow-x-auto">
        {tab === 'payments' ? (
          <table className="w-full text-sm">
            <thead><tr className={theadCls}><Th>Created</Th><Th>User</Th><Th>Plan</Th><Th right>Amount</Th><Th>Status</Th><Th>Razorpay</Th><Th /></tr></thead>
            <tbody>
              {pays.items.map((p) => (
                <tr key={p.id} className={rowCls}>
                  <Td>{fmtDate(p.createdAt)}</Td><Td mono>{p.userId.slice(-8)}</Td><Td>{p.planCode}</Td>
                  <Td right>{rupees(p.amountPaise)}{p.refundedPaise > 0 && <div className="text-xs text-blue-600">refunded {rupees(p.refundedPaise)}</div>}</Td>
                  <Td><Badge>{p.status}</Badge>{p.failureReason && <div className="text-xs text-red-600">{p.failureReason}</div>}</Td>
                  <Td mono>{p.paymentRef ?? p.orderId ?? '—'}</Td>
                  <Td right>{['created', 'pending', 'cancelled'].includes(p.status) && <Btn onClick={() => reconcile(p.id)}>Re-check</Btn>}</Td>
                </tr>
              ))}
              {pays.items.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No payments.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className={theadCls}><Th>User</Th><Th>Plan</Th><Th>Period</Th><Th>Status</Th><Th>Source</Th><Th /></tr></thead>
            <tbody>
              {subs.items.map((s) => (
                <tr key={s._id} className={rowCls}>
                  <Td mono>{s.userId.slice(-8)}</Td><Td>{s.planCode}</Td><Td>{fmtDate(s.startsAt)} – {fmtDate(s.endsAt)}</Td>
                  <Td><Badge>{s.status}</Badge>{s.statusReason && <div className="text-xs text-gray-500">{s.statusReason}</div>}</Td><Td>{s.source.replace('_', ' ')}</Td>
                  <Td right>{s.status === 'active' && <Btn variant="danger" onClick={() => revoke(s._id)}>End</Btn>}</Td>
                </tr>
              ))}
              {subs.items.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No subscriptions.</td></tr>}
            </tbody>
          </table>
        )}
      </Panel>
      <Pager page={page} total={tab === 'payments' ? pays.total : subs.total} limit={20} onPage={setPage} />
    </div>
  );
}
