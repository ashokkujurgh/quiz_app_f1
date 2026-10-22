import { useState } from 'react';
import api from '../lib/api';
import { Btn, inputCls } from './ui';

interface U { _id: string; name: string; email: string; username?: string; role: string }

/** Search users by name/email/username (existing admin users API) and pick one. */
export default function UserPicker({ onPick, label = 'Find user' }: { onPick: (u: U) => void; label?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<U[]>([]);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.get('/api/admin/users', { params: { search: q, limit: 8 } });
    setResults(data.users);
  };
  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <input className={`${inputCls} flex-1`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or username" aria-label={label} />
        <Btn type="submit">{label}</Btn>
      </form>
      {results.length > 0 && (
        <ul className="mt-2 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {results.map((u) => (
            <li key={u._id}>
              <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => { onPick(u); setResults([]); }}>
                <span className="font-medium text-gray-900 dark:text-white">{u.name}</span> <span className="text-gray-500">{u.email} · {u.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
