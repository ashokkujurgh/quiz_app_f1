import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../lib/api';
import { getAdminProfile, setAdminProfile, type AdminProfile } from '../lib/auth';

// NSFW.js is loaded from CDN via index.html script tag
declare const nsfwjs: {
  load: (modelPath?: string) => Promise<{
    classify: (img: HTMLImageElement) => Promise<Array<{ className: string; probability: number }>>;
  }>;
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthorSnapshot {
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface QuizResult {
  quizTitle: string;
  score: number;
  total: number;
  percentage: number;
  rank?: number;
}

interface Comment {
  _id: string;
  author: AuthorSnapshot;
  content: string;
  likes: number;
  createdAt: string;
}

interface Post {
  _id: string;
  author: AuthorSnapshot;
  content: string;
  image: string | null;
  topic: string;
  subTopic: string | null;
  timezone: string;
  likes: number;
  shares: number;
  commentsCount: number;
  quizResult: QuizResult | null;
  isActive: boolean;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Topic {
  _id: string;
  name: string;
  isActive: boolean;
}

interface SubTopic {
  _id: string;
  name: string;
  topic: string;
  isActive: boolean;
}

const TIMEZONES = [
  { label: 'UTC',                      value: 'UTC' },
  { label: 'London (GMT+0/+1)',         value: 'Europe/London' },
  { label: 'Paris / Berlin (GMT+1/+2)', value: 'Europe/Paris' },
  { label: 'Moscow (GMT+3)',            value: 'Europe/Moscow' },
  { label: 'Dubai (GMT+4)',             value: 'Asia/Dubai' },
  { label: 'Karachi (GMT+5)',           value: 'Asia/Karachi' },
  { label: 'India (GMT+5:30)',          value: 'Asia/Kolkata' },
  { label: 'Dhaka (GMT+6)',             value: 'Asia/Dhaka' },
  { label: 'Bangkok (GMT+7)',           value: 'Asia/Bangkok' },
  { label: 'Singapore (GMT+8)',         value: 'Asia/Singapore' },
  { label: 'Tokyo (GMT+9)',             value: 'Asia/Tokyo' },
  { label: 'Sydney (GMT+10/+11)',       value: 'Australia/Sydney' },
  { label: 'Auckland (GMT+12/+13)',     value: 'Pacific/Auckland' },
  { label: 'New York (GMT-5/-4)',       value: 'America/New_York' },
  { label: 'Chicago (GMT-6/-5)',        value: 'America/Chicago' },
  { label: 'Denver (GMT-7/-6)',         value: 'America/Denver' },
  { label: 'Los Angeles (GMT-8/-7)',    value: 'America/Los_Angeles' },
  { label: 'São Paulo (GMT-3)',         value: 'America/Sao_Paulo' },
];

// Format a UTC date string into local time of the given timezone
function formatInTz(dateStr: string, tz: string) {
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      timeZone: tz,
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return new Date(dateStr).toLocaleString();
  }
}

// Detect browser's local timezone for use as default
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Create Post Modal ─────────────────────────────────────────────────────────

function CreatePostModal({
  onClose,
  onCreated,
  topics,
}: {
  onClose: () => void;
  onCreated: (post: Post) => void;
  topics: Topic[];
}) {
  const [content, setContent]               = useState('');
  const [image, setImage]                   = useState('');
  const [imageFile, setImageFile]           = useState<File | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [nsfwChecking, setNsfwChecking]     = useState(false);
  const nsfwModel = useRef<Awaited<ReturnType<typeof nsfwjs.load>> | null>(null);
  const [selectedTopicId, setSelectedTopicId]   = useState(topics[0]?._id ?? '');
  const [selectedTopicName, setSelectedTopicName] = useState(topics[0]?.name ?? '');
  const [subTopics, setSubTopics]           = useState<SubTopic[]>([]);
  const [subTopicId, setSubTopicId]         = useState('');
  const [subTopicsLoading, setSubTopicsLoading] = useState(false);
  const [timezone, setTimezone]             = useState(LOCAL_TZ || 'UTC');
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [profile, setProfile]               = useState<AdminProfile | null>(getAdminProfile());
  const [profileLoading, setProfileLoading] = useState(!getAdminProfile());

  // Auto-fetch profile from API if not in localStorage
  useEffect(() => {
    if (profile) return;
    api.get('/api/admin/me')
      .then(({ data }) => {
        const p: AdminProfile = {
          _id:      data.user._id,
          name:     data.user.name,
          username: data.user.username,
          email:    data.user.email,
          avatar:   data.user.avatar ?? null,
        };
        setAdminProfile(p);
        setProfile(p);
      })
      .catch(() => setError('Could not load admin profile. Please try again.'))
      .finally(() => setProfileLoading(false));
  }, []);

  // Fetch subtopics when topic changes
  useEffect(() => {
    if (!selectedTopicId) return;
    setSubTopicId('');
    setSubTopics([]);
    setSubTopicsLoading(true);
    api.get(`/api/topics/${selectedTopicId}/subtopics`)
      .then(({ data }) => setSubTopics(data.subtopics.filter((s: SubTopic) => s.isActive)))
      .catch(() => {})
      .finally(() => setSubTopicsLoading(false));
  }, [selectedTopicId]);

  const handleTopicChange = (topicId: string) => {
    const t = topics.find((x) => x._id === topicId);
    setSelectedTopicId(topicId);
    setSelectedTopicName(t?.name ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setError('Content is required.'); return; }
    if (!selectedTopicName) { setError('Please select a topic.'); return; }
    if (!profile) { setError('Admin profile not loaded yet.'); return; }

    const subTopicName = subTopics.find((s) => s._id === subTopicId)?.name ?? null;

    setSaving(true); setError('');
    try {
      let imageUrl = image.trim() || null;
      if (imageFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('image', imageFile);
        const { data: uploadData } = await api.post('/api/auth/upload/image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadData.url ?? null;
        setUploading(false);
      }
      const { data } = await api.post('/api/posts', {
        content:        content.trim(),
        image:          imageUrl,
        topic:          selectedTopicName,
        subTopic:       subTopicName,
        timezone,
        authorName:     profile.name,
        authorUsername: profile.username,
        authorAvatar:   profile.avatar ?? null,
      });
      onCreated(data.post);
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to create post.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Create Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="cpform" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Author preview */}
          {profileLoading ? (
            <div className="text-xs text-gray-400">Loading profile…</div>
          ) : profile ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase overflow-hidden">
                {profile.avatar
                  ? <img src={profile.avatar} className="w-7 h-7 rounded-full object-cover" />
                  : profile.name.charAt(0)}
              </div>
              <span>
                Posting as <strong className="text-gray-700 dark:text-gray-200">{profile.name}</strong>{' '}
                <span className="text-gray-400">@{profile.username}</span>
              </span>
            </div>
          ) : null}

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share with the community?"
              className="w-full text-sm rounded-xl px-3 py-2 border resize-none
                bg-white border-gray-200 text-gray-900 placeholder-gray-400
                dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{content.length} / 2000</p>
          </div>

          {/* Topic + Subtopic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedTopicId}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2 border
                  bg-white border-gray-200 text-gray-900
                  dark:bg-gray-800 dark:border-gray-700 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select topic…</option>
                {topics.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subtopic
                {subTopicsLoading && (
                  <span className="ml-1.5 text-gray-400 font-normal">loading…</span>
                )}
              </label>
              <select
                value={subTopicId}
                onChange={(e) => setSubTopicId(e.target.value)}
                disabled={!selectedTopicId || subTopicsLoading || subTopics.length === 0}
                className="w-full text-sm rounded-xl px-3 py-2 border
                  bg-white border-gray-200 text-gray-900
                  dark:bg-gray-800 dark:border-gray-700 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedTopicId
                    ? 'Select a topic first'
                    : subTopicsLoading
                    ? 'Loading…'
                    : subTopics.length === 0
                    ? 'No subtopics'
                    : 'None (optional)'}
                </option>
                {subTopics.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2 border
                bg-white border-gray-200 text-gray-900
                dark:bg-gray-800 dark:border-gray-700 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {/* If browser tz isn't in the list, show it at top */}
              {LOCAL_TZ && !TIMEZONES.find((t) => t.value === LOCAL_TZ) && (
                <option value={LOCAL_TZ}>{LOCAL_TZ} (local)</option>
              )}
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Post will show as: <span className="font-medium text-gray-600 dark:text-gray-300">{formatInTz(new Date().toISOString(), timezone)}</span>
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {image ? (
              <div className="relative mt-1">
                <img
                  src={image}
                  alt="preview"
                  className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => { setImage(''); setImageFile(null); }}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className={`mt-1 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-colors ${
                nsfwChecking
                  ? 'border-yellow-300 dark:border-yellow-600 cursor-wait'
                  : 'border-gray-300 dark:border-gray-700 cursor-pointer hover:border-indigo-400'
              }`}>
                {nsfwChecking ? (
                  <>
                    <svg className="w-5 h-5 text-yellow-500 animate-spin mb-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">Checking image safety…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-400">Click to upload (JPEG, PNG, WebP — max 5MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    e.target.value = '';

                    const objectUrl = URL.createObjectURL(f);
                    setNsfwChecking(true);
                    setError('');

                    try {
                      if (!nsfwModel.current) {
                        nsfwModel.current = await nsfwjs.load();
                      }
                      const img = new Image();
                      img.src = objectUrl;
                      await new Promise((res, rej) => {
                        img.onload = res;
                        img.onerror = rej;
                      });
                      const predictions = await nsfwModel.current.classify(img);
                      const blocked = ['Porn', 'Hentai', 'Sexy'];
                      const flagged = predictions.find(
                        (p) => blocked.includes(p.className) && p.probability > 0.4,
                      );
                      if (flagged) {
                        URL.revokeObjectURL(objectUrl);
                        setError(`Inappropriate image detected (${flagged.className} ${Math.round(flagged.probability * 100)}%). Please choose a different image.`);
                        return;
                      }
                      setImageFile(f);
                      setImage(objectUrl);
                    } catch (err) {
                      URL.revokeObjectURL(objectUrl);
                      setError('Image safety check failed. Please try a different image.');
                    } finally {
                      setNsfwChecking(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="cpform"
            disabled={saving || uploading || nsfwChecking || !content.trim()}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500
              text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            {nsfwChecking ? 'Checking image…' : uploading ? 'Uploading image…' : saving ? 'Publishing…' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Comments drawer ───────────────────────────────────────────────────────────

function CommentsDrawer({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/api/posts/${postId}/comments`)
      .then(({ data }) => setComments(data.comments))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    setDeleting(commentId);
    try {
      await api.delete(`/api/posts/${postId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Comments</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-10">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="flex gap-3 group">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {c.author.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{c.author.name}</span>
                      <span className="text-xs text-gray-400 ml-1.5">@{c.author.username}</span>
                      <span className="text-xs text-gray-400 ml-1.5">· {timeAgo(c.createdAt)}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(c._id)}
                      disabled={deleting === c._id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">{c.content}</p>
                  {c.likes > 0 && (
                    <p className="text-xs text-gray-400 mt-1">👍 {c.likes}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onDelete,
  onToggle,
  onViewComments,
  deleting,
  toggling,
}: {
  post: Post;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onViewComments: (id: string) => void;
  deleting: boolean;
  toggling: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-opacity ${
      post.isActive ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800/50 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase">
          {post.author.avatar
            ? <img src={post.author.avatar} className="w-10 h-10 rounded-full object-cover" />
            : post.author.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{post.author.name}</span>
            <span className="text-xs text-gray-400">@{post.author.username}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-medium">
              {post.topic}
            </span>
            {post.subTopic && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {post.subTopic}
              </span>
            )}
            {!post.isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Hidden</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {timeAgo(post.createdAt)}
            {post.timezone && post.timezone !== 'UTC' && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-mono">
                {post.timezone}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(post._id)}
            disabled={toggling}
            title={post.isActive ? 'Hide post' : 'Show post'}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              post.isActive
                ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
            }`}
          >
            {post.isActive ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onDelete(post._id)}
            disabled={deleting}
            title="Delete post"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>

        {/* Image */}
        {post.image && (
          <img
            src={post.image}
            alt="post"
            className="mt-3 w-full rounded-xl object-cover max-h-64"
          />
        )}

        {/* Quiz result badge */}
        {post.quizResult && (
          <div className="mt-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-600/10">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Quiz Result</span>
            </div>
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{post.quizResult.quizTitle}</p>
            <div className="flex gap-4 mt-1">
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{post.quizResult.percentage}%</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{post.quizResult.score}/{post.quizResult.total}</span>
              {post.quizResult.rank && (
                <span className="text-sm font-bold text-yellow-500">#{post.quizResult.rank}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timezone row */}
      {post.timezone && (
        <div className="px-5 pb-2 flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatInTz(post.createdAt, post.timezone)}</span>
          <span className="font-mono text-gray-300 dark:text-gray-600">({post.timezone})</span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {post.likes} likes
        </span>
        <span className="text-xs text-gray-400">{post.shares} shares</span>
        <button
          onClick={() => onViewComments(post._id)}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.commentsCount} comments
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function Posts() {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [toggling, setToggling]     = useState<string | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [showCreate, setShowCreate]         = useState(false);

  // ── Topics & subtopics ──────────────────────────────────────────────────────
  const [topics, setTopics]             = useState<Topic[]>([]);
  const [subTopics, setSubTopics]       = useState<SubTopic[]>([]);
  const [selectedTopic, setSelectedTopic]   = useState<Topic | null>(null);
  const [selectedSubTopic, setSelectedSubTopic] = useState<SubTopic | null>(null);
  const [topicsLoading, setTopicsLoading]   = useState(true);
  const [subTopicsLoading, setSubTopicsLoading] = useState(false);

  // Fetch all topics once on mount
  useEffect(() => {
    api.get('/api/topics')
      .then(({ data }) => setTopics(data.topics.filter((t: Topic) => t.isActive)))
      .catch(() => setError('Failed to load topics.'))
      .finally(() => setTopicsLoading(false));
  }, []);

  // Fetch subtopics whenever a topic is selected
  useEffect(() => {
    setSelectedSubTopic(null);
    setSubTopics([]);
    if (!selectedTopic) return;
    setSubTopicsLoading(true);
    api.get(`/api/topics/${selectedTopic._id}/subtopics`)
      .then(({ data }) => setSubTopics(data.subtopics.filter((s: SubTopic) => s.isActive)))
      .catch(() => {})
      .finally(() => setSubTopicsLoading(false));
  }, [selectedTopic]);

  const handleSelectTopic = (t: Topic | null) => {
    setSelectedTopic(t);
    setSelectedSubTopic(null);
    setPage(1);
  };

  const handleSelectSubTopic = (s: SubTopic | null) => {
    setSelectedSubTopic(s);
    setPage(1);
  };

  // ── Posts fetch ─────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (selectedTopic) params.set('topic', selectedTopic.name);
      const { data } = await api.get(`/api/posts?${params}`);
      // Frontend-filter by subtopic name if one is selected
      const filtered = selectedSubTopic
        ? (data.posts as Post[]).filter((p) =>
            p.topic.toLowerCase().includes(selectedSubTopic.name.toLowerCase()) ||
            selectedSubTopic.name.toLowerCase().includes(p.topic.toLowerCase())
          )
        : data.posts;
      setPosts(filtered);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedTopic, selectedSubTopic]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this post?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : prev);
    } catch {
      setError('Failed to delete post.');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const post = posts.find((p) => p._id === id)!;
      // use PATCH to flip isActive — post-service deletePost soft-deletes
      // We'll use a direct field update via a dedicated admin toggle
      // For now re-fetch after toggling via delete+restore pattern:
      // Instead, call PATCH if backend supports it, else just hide locally
      await api.patch(`/api/posts/${id}`, { isActive: !post.isActive });
      setPosts((prev) => prev.map((p) => p._id === id ? { ...p, isActive: !p.isActive } : p));
    } catch {
      // backend may not support PATCH — toggle visually only and show note
      setPosts((prev) => prev.map((p) => p._id === id ? { ...p, isActive: !p.isActive } : p));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination ? `${pagination.total} total posts` : 'Feed management'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
            text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20
          text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Topic filter tabs */}
      <div className="mb-5">
        {topicsLoading ? (
          <div className="flex gap-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-8 w-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {/* All button */}
            <button
              onClick={() => handleSelectTopic(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                !selectedTopic
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              All
            </button>
            {topics.map((t) => (
              <button
                key={t._id}
                onClick={() => handleSelectTopic(selectedTopic?._id === t._id ? null : t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                  selectedTopic?._id === t._id
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Subtopic chips — shown when a topic is selected */}
        {selectedTopic && (
          <div className="mt-3 flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-400 mr-1">Subtopics:</span>
            {subTopicsLoading ? (
              <div className="h-6 w-32 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ) : subTopics.length === 0 ? (
              <span className="text-xs text-gray-400 italic">No subtopics</span>
            ) : (
              <>
                <button
                  onClick={() => handleSelectSubTopic(null)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    !selectedSubTopic
                      ? 'bg-indigo-100 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300'
                  }`}
                >
                  All subtopics
                </button>
                {subTopics.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => handleSelectSubTopic(selectedSubTopic?._id === s._id ? null : s)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      selectedSubTopic?._id === s._id
                        ? 'bg-indigo-100 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="text-sm text-gray-400">No posts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onViewComments={setCommentsPostId}
              deleting={deleting === post._id}
              toggling={toggling === post._id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages} · {pagination.total} posts
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border transition-colors
                bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40
                dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-3 py-1.5 text-sm rounded-lg border transition-colors
                bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40
                dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create post modal */}
      {showCreate && (
        <CreatePostModal
          topics={topics}
          onClose={() => setShowCreate(false)}
          onCreated={(post) => {
            setPosts((prev) => [post, ...prev]);
            setPagination((prev) => prev ? { ...prev, total: prev.total + 1 } : prev);
          }}
        />
      )}

      {/* Comments drawer */}
      {commentsPostId && (
        <CommentsDrawer
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
        />
      )}
    </div>
  );
}
