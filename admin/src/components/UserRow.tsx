import { useEffect, useState } from 'react';
import { getSocket, subscribeToUsers, unsubscribeFromUsers } from '../lib/socket';

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

interface Props {
  user: User;
  toggling: boolean;
  onToggleStatus: (user: User) => void;
}

export default function UserRow({ user, toggling, onToggleStatus }: Props) {
  const [isOnline, setIsOnline] = useState(user.isOnline);

  // Sync when parent snapshot refreshes
  useEffect(() => {
    setIsOnline(user.isOnline);
  }, [user.isOnline]);

  // Subscribe to this user's room and request their current status
  useEffect(() => {
    subscribeToUsers([user._id]);

    const socket = getSocket();
    if (!socket) return;

    // Pull the current DB status for this user immediately
    const requestStatus = () => {
      socket.emit('request:user:status', user._id);
    };

    if (socket.connected) {
      requestStatus();
    } else {
      socket.once('connect', requestStatus);
    }

    const onStatus = ({ userId, isOnline: online }: { userId: string; isOnline: boolean }) => {
      if (userId === user._id) {
        console.log(`[UserRow] ${user.email} → isOnline=${online}`);
        setIsOnline(online);
      }
    };

    socket.on('user:status', onStatus);

    return () => {
      socket.off('user:status', onStatus);
      socket.off('connect', requestStatus);
      unsubscribeFromUsers([user._id]);
    };
  }, [user._id]);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Avatar + Name */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
              {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{user.name ?? '—'}</div>
            <div className="text-gray-400 text-xs">{user.email}</div>
          </div>
        </div>
      </td>

      {/* Username */}
      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
        {user.username ? `@${user.username}` : '—'}
      </td>

      {/* Role */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
          user.role === 'admin'
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {user.role}
        </span>
      </td>

      {/* Provider */}
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {user.authProvider}
        </span>
      </td>

      {/* Online status */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
            isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
          }`} />
          <span className={`text-xs transition-colors ${
            isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </td>

      {/* Joined */}
      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs">
        {new Date(user.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })}
      </td>

      {/* Action */}
      <td className="px-5 py-3.5 text-right">
        <button
          onClick={() => onToggleStatus(user)}
          disabled={toggling}
          title={user.isActive ? 'Disable user' : 'Enable user'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            user.isActive
              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
              : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20'
          }`}
        >
          {toggling ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : user.isActive ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toggling ? 'Updating…' : user.isActive ? 'Disable' : 'Enable'}
        </button>
      </td>
    </tr>
  );
}
