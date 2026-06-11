import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

interface Topic {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  subTopicCount: number;
}

interface SubTopic {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  topic: string;
}

// ── Small reusable inline-form ────────────────────────────
function InlineForm({
  placeholder,
  onSubmit,
  loading,
}: {
  placeholder: string;
  onSubmit: (name: string, description: string) => Promise<void>;
  loading: boolean;
}) {
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [open, setOpen]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim(), desc.trim());
    setName(''); setDesc(''); setOpen(false);
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {placeholder}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name *"
        className="w-full text-sm rounded-lg px-3 py-2 border
          bg-white border-gray-200 text-gray-900 placeholder-gray-400
          dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="w-full text-sm rounded-lg px-3 py-2 border
          bg-white border-gray-200 text-gray-900 placeholder-gray-400
          dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setName(''); setDesc(''); }}
          className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Edit inline ───────────────────────────────────────────
function EditRow({
  name: initialName,
  description: initialDesc,
  onSave,
  onCancel,
  loading,
}: {
  name: string;
  description?: string;
  onSave: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [desc, _setDesc] = useState(initialDesc ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(name.trim(), desc.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 text-sm rounded-lg px-2 py-1 border
          bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button type="submit" disabled={loading}
        className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
        {loading ? '…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel}
        className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════
export default function Topics() {
  const [topics, setTopics]         = useState<Topic[]>([]);
  const [selected, setSelected]     = useState<Topic | null>(null);
  const [subtopics, setSubtopics]   = useState<SubTopic[]>([]);
  const [loadingT, setLoadingT]     = useState(true);
  const [loadingS, setLoadingS]     = useState(false);
  const [savingT, setSavingT]       = useState(false);
  const [savingS, setSavingS]       = useState(false);
  const [editTopic, setEditTopic]   = useState<string | null>(null);
  const [editSub, setEditSub]       = useState<string | null>(null);
  const [error, setError]           = useState('');

  // ── Fetch topics ────────────────────────────────────────
  const fetchTopics = useCallback(async () => {
    setLoadingT(true);
    try {
      const { data } = await api.get('/api/topics');
      setTopics(data.topics);
      if (data.topics.length > 0 && !selected) {
        setSelected(data.topics[0]);
      }
    } finally {
      setLoadingT(false);
    }
  }, []);

  // ── Fetch subtopics for selected topic ──────────────────
  const fetchSubtopics = useCallback(async (topicId: string) => {
    setLoadingS(true);
    try {
      const { data } = await api.get(`/api/topics/${topicId}/subtopics`);
      setSubtopics(data.subtopics);
    } finally {
      setLoadingS(false);
    }
  }, []);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);
  useEffect(() => { if (selected) fetchSubtopics(selected._id); }, [selected, fetchSubtopics]);

  // ── Topic actions ────────────────────────────────────────
  const handleAddTopic = async (name: string, description: string) => {
    setSavingT(true); setError('');
    try {
      await api.post('/api/topics', { name, description });
      await fetchTopics();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to add topic.');
    } finally {
      setSavingT(false);
    }
  };

  const handleUpdateTopic = async (id: string, name: string, description: string) => {
    setSavingT(true);
    try {
      const { data } = await api.patch(`/api/topics/${id}`, { name, description });
      setTopics((prev) => prev.map((t) => t._id === id ? { ...t, ...data.topic } : t));
      if (selected?._id === id) setSelected((s) => s ? { ...s, ...data.topic } : s);
      setEditTopic(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to update topic.');
    } finally {
      setSavingT(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Delete this topic and all its subtopics?')) return;
    try {
      await api.delete(`/api/topics/${id}`);
      setTopics((prev) => prev.filter((t) => t._id !== id));
      if (selected?._id === id) { setSelected(null); setSubtopics([]); }
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to delete topic.');
    }
  };

  const handleToggleTopic = async (t: Topic) => {
    try {
      const { data } = await api.patch(`/api/topics/${t._id}`, { isActive: !t.isActive });
      setTopics((prev) => prev.map((x) => x._id === t._id ? { ...x, ...data.topic } : x));
    } catch {}
  };

  // ── SubTopic actions ─────────────────────────────────────
  const handleAddSubtopic = async (name: string, description: string) => {
    if (!selected) return;
    setSavingS(true); setError('');
    try {
      await api.post(`/api/topics/${selected._id}/subtopics`, { name, description });
      await fetchSubtopics(selected._id);
      setTopics((prev) => prev.map((t) =>
        t._id === selected._id ? { ...t, subTopicCount: t.subTopicCount + 1 } : t
      ));
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to add subtopic.');
    } finally {
      setSavingS(false);
    }
  };

  const handleUpdateSubtopic = async (id: string, name: string, description: string) => {
    setSavingS(true);
    try {
      const { data } = await api.patch(`/api/topics/subtopics/${id}`, { name, description });
      setSubtopics((prev) => prev.map((s) => s._id === id ? { ...s, ...data.subtopic } : s));
      setEditSub(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to update subtopic.');
    } finally {
      setSavingS(false);
    }
  };

  const handleDeleteSubtopic = async (id: string) => {
    if (!confirm('Delete this subtopic?')) return;
    try {
      await api.delete(`/api/topics/subtopics/${id}`);
      setSubtopics((prev) => prev.filter((s) => s._id !== id));
      if (selected) {
        setTopics((prev) => prev.map((t) =>
          t._id === selected._id ? { ...t, subTopicCount: Math.max(0, t.subTopicCount - 1) } : t
        ));
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to delete subtopic.');
    }
  };

  const handleToggleSubtopic = async (s: SubTopic) => {
    try {
      const { data } = await api.patch(`/api/topics/subtopics/${s._id}`, { isActive: !s.isActive });
      setSubtopics((prev) => prev.map((x) => x._id === s._id ? { ...x, ...data.subtopic } : x));
    } catch {}
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage topics and subtopics</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Topics Panel ─────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Topics</h2>
            <span className="text-xs text-gray-400">{topics.length} total</span>
          </div>

          {loadingT ? (
            <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <ul className="space-y-1">
              {topics.map((topic) => (
                <li
                  key={topic._id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    selected?._id === topic._id
                      ? 'bg-indigo-50 dark:bg-indigo-600/15'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => { setSelected(topic); setEditTopic(null); setEditSub(null); }}
                >
                  {editTopic === topic._id ? (
                    <EditRow
                      name={topic.name}
                      description={topic.description}
                      loading={savingT}
                      onCancel={() => setEditTopic(null)}
                      onSave={(n, d) => handleUpdateTopic(topic._id, n, d)}
                    />
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${
                            selected?._id === topic._id
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-gray-800 dark:text-white'
                          }`}>{topic.name}</span>
                          {!topic.isActive && (
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {topic.subTopicCount} subtopic{topic.subTopicCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditTopic(topic._id); }}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleTopic(topic); }}
                          className={`p-1 rounded text-xs ${
                            topic.isActive
                              ? 'text-gray-400 hover:text-orange-500'
                              : 'text-gray-400 hover:text-green-500'
                          }`}
                          title={topic.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d={topic.isActive
                                ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636'
                                : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic._id); }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <InlineForm placeholder="Add topic" onSubmit={handleAddTopic} loading={savingT} />
        </div>

        {/* ── SubTopics Panel ───────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {selected.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Subtopics</p>
                </div>
                <span className="text-xs text-gray-400">{subtopics.length} total</span>
              </div>

              {loadingS ? (
                <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
              ) : subtopics.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No subtopics yet.</div>
              ) : (
                <ul className="space-y-1">
                  {subtopics.map((sub) => (
                    <li
                      key={sub._id}
                      className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {editSub === sub._id ? (
                        <EditRow
                          name={sub.name}
                          description={sub.description}
                          loading={savingS}
                          onCancel={() => setEditSub(null)}
                          onSave={(n, d) => handleUpdateSubtopic(sub._id, n, d)}
                        />
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-800 dark:text-white truncate">{sub.name}</span>
                              {!sub.isActive && (
                                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {sub.description && (
                              <div className="text-xs text-gray-400 truncate mt-0.5">{sub.description}</div>
                            )}
                          </div>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={() => setEditSub(sub._id)}
                              className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggleSubtopic(sub)}
                              className={`p-1 rounded ${
                                sub.isActive
                                  ? 'text-gray-400 hover:text-orange-500'
                                  : 'text-gray-400 hover:text-green-500'
                              }`}
                              title={sub.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d={sub.isActive
                                    ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636'
                                    : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSubtopic(sub._id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <InlineForm
                placeholder={`Add subtopic to ${selected.name}`}
                onSubmit={handleAddSubtopic}
                loading={savingS}
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-sm text-gray-400">Select a topic to manage its subtopics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
