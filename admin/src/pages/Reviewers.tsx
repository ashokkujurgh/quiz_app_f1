import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { errMsg, fmtDate } from '../lib/money';
import UserPicker from '../components/UserPicker';
import { Badge, Btn, Notice, PageHeader, Panel, Td, Th, inputCls, rowCls, theadCls } from '../components/ui';

interface Reviewer { _id: string; name: string; email: string; username?: string; isActive: boolean; createdAt: string }
interface Appeal { _id: string; creatorId: string; postTitle: string; category: string; reason: string; confirmedAt: string; consequence: string; confirmedBy: string; appeal: { text: string; submittedAt: string } }

const WEB = (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://meenzo.com';

export default function Reviewers() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [picked, setPicked] = useState<{ _id: string; name: string; email: string; role: string } | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.get('/api/admin/reviewers').then(({ data }) => setReviewers(data.reviewers)).catch((e) => setError(errMsg(e)));
    api.get('/api/moderation/appeals').then(({ data }) => setAppeals(data.items)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const setRole = async (userId: string, grant: boolean, why: string) => {
    try { await api.post(`/api/admin/users/${userId}/reviewer`, { grant, reason: why }); setOk(grant ? 'Reviewer role granted.' : 'Reviewer role removed.'); setPicked(null); setReason(''); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const decide = async (id: string, decision: 'uphold' | 'overturn') => {
    try { await api.post(`/api/moderation/violations/${id}/appeal-decision`, { decision, note: notes[id] ?? '' }); setOk(decision === 'overturn' ? 'Violation overturned; any block it caused is lifted.' : 'Appeal upheld.'); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="p-8">
      <PageHeader title="Reviewers & appeals" subtitle="Only admins grant or remove the Content Reviewer role. Reviewers work in the web app's Review queue."
        actions={<a className="text-sm font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500" href={`${WEB}/review`} target="_blank" rel="noreferrer">Open review queue</a>} />
      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}
      {ok && <Notice kind="success" onClose={() => setOk('')}>{ok}</Notice>}

      <Panel className="p-5 mb-6">
        <div className="font-semibold text-gray-900 dark:text-white mb-2">Add a reviewer</div>
        {picked ? (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-700 dark:text-gray-300">{picked.name} ({picked.email}) · currently {picked.role}</span>
            <input className={`${inputCls} flex-1 min-w-[220px]`} placeholder="Reason (logged)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Btn variant="primary" disabled={!reason.trim() || picked.role !== 'user'} onClick={() => setRole(picked._id, true, reason)}>Make reviewer</Btn>
            <Btn onClick={() => setPicked(null)}>Cancel</Btn>
          </div>
        ) : <UserPicker onPick={setPicked} />}
      </Panel>

      <Panel className="overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead><tr className={theadCls}><Th>Reviewer</Th><Th>Email</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {reviewers.map((r) => (
              <tr key={r._id} className={rowCls}>
                <Td>{r.name}</Td><Td>{r.email}</Td><Td><Badge tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'active' : 'disabled'}</Badge></Td>
                <Td right><Btn variant="danger" onClick={() => { const why = window.prompt('Reason for removing the reviewer role (logged):'); if (why) setRole(r._id, false, why); }}>Remove role</Btn></Td>
              </tr>
            ))}
            {reviewers.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">No reviewers yet — submissions go to admins until you add one.</td></tr>}
          </tbody>
        </table>
      </Panel>

      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Pending appeals</h2>
      {appeals.length === 0 ? <Panel className="p-10 text-center text-gray-400">No appeals waiting.</Panel> : (
        <div className="space-y-3">
          {appeals.map((a) => (
            <Panel key={a._id} className="p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{a.postTitle}</div>
                  <div className="text-xs text-gray-500">{a.category.replace(/_/g, ' ')} · {a.consequence.replace(/_/g, ' ')} · confirmed {fmtDate(a.confirmedAt)} · creator {a.creatorId.slice(-8)}</div>
                </div>
                <Badge tone="amber">appeal</Badge>
              </div>
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-300"><b>Reviewer's reason:</b> {a.reason}</div>
              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300"><b>Creator's appeal</b> ({fmtDate(a.appeal.submittedAt)}): {a.appeal.text}</div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <input className={`${inputCls} flex-1 min-w-[220px]`} placeholder="Decision note (sent to the creator)" value={notes[a._id] ?? ''} onChange={(e) => setNotes({ ...notes, [a._id]: e.target.value })} />
                <Btn variant="success" disabled={(notes[a._id] ?? '').trim().length < 5} onClick={() => decide(a._id, 'overturn')}>Overturn</Btn>
                <Btn variant="danger" disabled={(notes[a._id] ?? '').trim().length < 5} onClick={() => decide(a._id, 'uphold')}>Uphold</Btn>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
