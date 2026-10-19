import { useEffect, useState, FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { setToken, setAdminProfile } from '../lib/auth';
import { htmlToText } from '../lib/html';

// Opened from the "post waiting for approval" reminder email.
// Email comes from the link, password is typed in; we log in first and only
// approve the post if the login succeeds.
//
// Uses fetch instead of the shared axios client on purpose: that client
// redirects to /login on any 401, which would hide a wrong-password error here.

const API = import.meta.env.VITE_API_URL ?? '';

interface PostPreview {
  _id: string;
  title: string | null;
  content: string;
  image: string | null;
  topic: string | null;
  subTopic: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

type Stage = 'loading' | 'ready' | 'approving' | 'done' | 'not-found';

export default function ApprovePost() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const linkEmail = params.get('email') ?? '';

  const [post, setPost]         = useState<PostPreview | null>(null);
  const [stage, setStage]       = useState<Stage>('loading');
  const [email, setEmail]       = useState(linkEmail);
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch(`${API}/api/posts/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setPost(data.post);
        setStage(data.post.approvalStatus === 'pending' ? 'ready' : 'done');
      })
      .catch(() => setStage('not-found'));
  }, [id]);

  const handleApprove = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStage('approving');
    try {
      // 1. Log in
      const loginRes = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const login = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok || !login.accessToken) {
        throw new Error(login.message ?? 'Login failed. Check your password.');
      }
      setToken(login.accessToken);
      if (login.user) setAdminProfile(login.user);

      // 2. Approve — only reached after a successful login
      const approveRes = await fetch(`${API}/api/posts/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${login.accessToken}` },
        credentials: 'include',
      });
      const approved = await approveRes.json().catch(() => ({}));
      if (!approveRes.ok) throw new Error(approved.message ?? 'Logged in, but approving the post failed.');

      setPost(approved.post ?? (post && { ...post, approvalStatus: 'approved' }));
      setPassword('');
      setStage('done');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
      setStage('ready');
    }
  };

  const text    = htmlToText(post?.content);
  const heading = post?.title ?? text.split('\n')[0].slice(0, 90);
  const preview = text.length > 500 ? text.slice(0, 500).replace(/\s+\S*$/, '') + '…' : text;

  return (
    <div className="min-h-screen bg-gray-950 flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Approve post</h1>
          <p className="text-gray-400 text-sm mt-1">Meenzo Admin</p>
        </div>

        {stage === 'loading' && <p className="text-center text-gray-400 text-sm">Loading post…</p>}

        {stage === 'not-found' && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center text-gray-300 text-sm">
            This post could not be found. It may have been deleted.
          </div>
        )}

        {post && stage !== 'loading' && stage !== 'not-found' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {post.image && <img src={post.image} alt="" className="w-full aspect-video object-cover" />}
            <div className="p-6 space-y-3">
              <p className="text-indigo-400 text-xs font-medium">
                {[post.topic, post.subTopic].filter(Boolean).join(' › ')}
              </p>
              <h2 className="text-lg font-semibold text-white leading-snug">{heading}</h2>
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{preview}</p>
            </div>

            <div className="border-t border-gray-800 p-6">
              {stage === 'done' ? (
                <div className={`rounded-lg px-4 py-3 text-sm ${
                  post.approvalStatus === 'approved'
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-gray-800 border border-gray-700 text-gray-300'
                }`}>
                  {post.approvalStatus === 'approved'
                    ? '✓ This post is approved and live on Meenzo.'
                    : `This post is already ${post.approvalStatus}.`}
                </div>
              ) : (
                <form onSubmit={handleApprove} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      readOnly={!!linkEmail}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm read-only:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                    <input
                      type="password"
                      required
                      autoFocus
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={stage === 'approving'}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
                  >
                    {stage === 'approving' ? 'Signing in and approving…' : 'Approve'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
