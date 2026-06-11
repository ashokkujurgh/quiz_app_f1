import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../lib/api';
import { connectSocket, disconnectSocket, subscribeToUsers, unsubscribeFromUsers, getSocket } from '../lib/socket';
import CreateAdminModal from '../components/CreateAdminModal';
import UserRow from '../components/UserRow';

interface User {
  _id: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  authProvider: string;
  isEmailVerified: boolean;
  isActive: boolean;
  isOnline: boolean;
  createdAt: string;
  avatar?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function Users() {
  const [users, setUsers]           = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [toggling, setToggling]           = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  const prevUserIdsRef = useRef<string[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/users', {
        params: { page, limit: 20, search: query },
      });
      const newUsers: User[] = data.users;
      const newIds: string[] = newUsers.map((u) => u._id);

      // Unsubscribe old user rooms, subscribe new ones
      unsubscribeFromUsers(prevUserIdsRef.current);
      subscribeToUsers(newIds);
      prevUserIdsRef.current = newIds;

      // Ask the server for the latest online status for this page of users
      const sock = getSocket();
      if (sock?.connected) sock.emit('request:snapshot');

      setUsers(newUsers);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Real-time online/offline via Socket.IO
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setLiveConnected(true);
      if (prevUserIdsRef.current.length > 0) {
        subscribeToUsers(prevUserIdsRef.current);
      }
    };
    const onDisconnect = () => setLiveConnected(false);

    // Server sends snapshot of all currently online user IDs on connect
    const onSnapshot = ({ onlineIds }: { onlineIds: string[] }) => {
      const onlineSet = new Set(onlineIds);
      setUsers((prev) =>
        prev.map((u) => ({ ...u, isOnline: onlineSet.has(u._id) }))
      );
    };

    // Per-user real-time status change
    const onUserStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setUsers((prev) =>
        prev.map((u) => u._id === userId ? { ...u, isOnline } : u)
      );
    };

    if (socket.connected) setLiveConnected(true);
    socket.on('connect',        onConnect);
    socket.on('disconnect',     onDisconnect);
    socket.on('users:snapshot', onSnapshot);
    socket.on('user:status',    onUserStatus);

    return () => {
      socket.off('connect',        onConnect);
      socket.off('disconnect',     onDisconnect);
      socket.off('users:snapshot', onSnapshot);
      socket.off('user:status',    onUserStatus);
      unsubscribeFromUsers(prevUserIdsRef.current);
      disconnectSocket();
    };
  }, []);

  const handleToggleStatus = async (user: User) => {
    setToggling(user._id);
    try {
      const { data } = await api.patch(`/api/admin/users/${user._id}/status`);
      setUsers((prev) =>
        prev.map((u) => u._id === user._id ? { ...u, isActive: data.isActive } : u)
      );
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setToggling(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  };

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              liveConnected
                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {liveConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          {pagination && (
            <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total users</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Admin
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or username…"
          className="flex-1 max-w-md rounded-xl px-4 py-2.5 text-sm border
            bg-white border-gray-200 text-gray-900 placeholder-gray-400
            dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors
            bg-white border-gray-200 text-gray-700 hover:bg-gray-50
            dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setSearch(''); setQuery(''); setPage(1); }}
            className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white px-2 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden
        bg-white border-gray-200
        dark:bg-gray-900 dark:border-gray-800">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider
                border-gray-100 text-gray-400
                dark:border-gray-800 dark:text-gray-500">
                <th className="text-left px-5 py-3.5 font-medium">User</th>
                <th className="text-left px-5 py-3.5 font-medium">Username</th>
                <th className="text-left px-5 py-3.5 font-medium">Role</th>
                <th className="text-left px-5 py-3.5 font-medium">Provider</th>
                <th className="text-left px-5 py-3.5 font-medium">Status</th>
                <th className="text-left px-5 py-3.5 font-medium">Joined</th>
                <th className="px-5 py-3.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <UserRow
                  key={user._id}
                  user={user}
                  toggling={toggling === user._id}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border transition-colors
                bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40
                dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-3 py-1.5 text-sm rounded-lg border transition-colors
                bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40
                dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <CreateAdminModal
          onClose={() => setShowModal(false)}
          onCreated={fetchUsers}
        />
      )}
    </div>
  );
}
