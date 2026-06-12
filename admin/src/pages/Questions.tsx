import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Topic    { _id: string; name: string }
interface SubTopic { _id: string; name: string; topic: string }

interface Option   { text: string }

interface Question {
  _id: string;
  text: string;
  description: string;
  options: Option[];
  correctOption: 0 | 1 | 2 | 3;
  topic: string;
  subTopic: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdAt: string;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_COLORS: Record<Difficulty, string> = {
  easy:   'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400',
  hard:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ── Empty form state ──────────────────────────────────────────────────────────

const emptyForm = () => ({
  text: '',
  description: '',
  options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }] as Option[],
  correctOption: 0 as 0 | 1 | 2 | 3,
  topic: '',
  subTopic: '',
  difficulty: 'medium' as Difficulty,
});

// ── Question Form Modal ───────────────────────────────────────────────────────

function QuestionModal({
  initial,
  topics,
  subTopics,
  onSubTopicTopicChange,
  onSave,
  onClose,
  saving,
}: {
  initial: ReturnType<typeof emptyForm> & { _id?: string };
  topics: Topic[];
  subTopics: SubTopic[];
  onSubTopicTopicChange: (topicId: string) => void;
  onSave: (form: ReturnType<typeof emptyForm>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...initial });

  const setOption = (i: number, val: string) =>
    setForm((f) => {
      const options = [...f.options] as Option[];
      options[i] = { text: val };
      return { ...f, options };
    });

  const filteredSubs = subTopics.filter((s) => s.topic === form.topic);

  const handleTopicChange = (id: string) => {
    setForm((f) => ({ ...f, topic: id, subTopic: '' }));
    onSubTopicTopicChange(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {initial._id ? 'Edit Question' : 'New Question'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="qform" onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Question text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Enter the question…"
              className="w-full text-sm rounded-xl px-3 py-2 border resize-none
                bg-white border-gray-200 text-gray-900 placeholder-gray-400
                dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description / Explanation
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional explanation shown after answering…"
              className="w-full text-sm rounded-xl px-3 py-2 border resize-none
                bg-white border-gray-200 text-gray-900 placeholder-gray-400
                dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options <span className="text-red-500">*</span>
              <span className="font-normal text-gray-400 ml-1">— click the circle to mark correct answer</span>
            </label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, correctOption: i as 0 | 1 | 2 | 3 }))}
                    className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                      form.correctOption === i
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-400'
                    }`}
                  >
                    {OPTION_LABELS[i]}
                  </button>
                  <input
                    required
                    value={opt.text}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${OPTION_LABELS[i]}`}
                    className="flex-1 text-sm rounded-xl px-3 py-2 border
                      bg-white border-gray-200 text-gray-900 placeholder-gray-400
                      dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Topic / SubTopic / Difficulty row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2 border
                  bg-white border-gray-200 text-gray-900
                  dark:bg-gray-800 dark:border-gray-700 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select…</option>
                {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subtopic
              </label>
              <select
                value={form.subTopic}
                onChange={(e) => setForm((f) => ({ ...f, subTopic: e.target.value }))}
                disabled={!form.topic || filteredSubs.length === 0}
                className="w-full text-sm rounded-xl px-3 py-2 border
                  bg-white border-gray-200 text-gray-900
                  dark:bg-gray-800 dark:border-gray-700 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  disabled:opacity-50"
              >
                <option value="">None</option>
                {filteredSubs.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}
                className="w-full text-sm rounded-xl px-3 py-2 border
                  bg-white border-gray-200 text-gray-900
                  dark:bg-gray-800 dark:border-gray-700 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
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
            form="qform"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500
              text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : initial._id ? 'Save Changes' : 'Create Question'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function Questions() {
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [topics, setTopics]         = useState<Topic[]>([]);
  const [subTopics, setSubTopics]   = useState<SubTopic[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [modalForm, setModalForm]   = useState<(ReturnType<typeof emptyForm> & { _id?: string }) | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // filters
  const [filterTopic, setFilterTopic]   = useState('');
  const [filterSub, setFilterSub]       = useState('');
  const [filterDiff, setFilterDiff]     = useState('');
  const [search, setSearch]             = useState('');

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchTopics = useCallback(async () => {
    const { data } = await api.get('/api/topics');
    setTopics(data.topics);
  }, []);

  const fetchSubTopicsForTopic = useCallback(async (topicId: string) => {
    if (!topicId) return;
    const { data } = await api.get(`/api/topics/${topicId}/subtopics`);
    setSubTopics((prev) => {
      const others = prev.filter((s) => s.topic !== topicId);
      return [...others, ...data.subtopics];
    });
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTopic) params.set('topic', filterTopic);
      if (filterSub)   params.set('subTopic', filterSub);
      if (filterDiff)  params.set('difficulty', filterDiff);
      if (search)      params.set('search', search);
      params.set('limit', '100');
      const { data } = await api.get(`/api/questions?${params}`);
      setQuestions(data.questions);
    } catch {
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [filterTopic, filterSub, filterDiff, search]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);
  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // preload subtopics when filter topic changes
  useEffect(() => {
    if (filterTopic) fetchSubTopicsForTopic(filterTopic);
    setFilterSub('');
  }, [filterTopic, fetchSubTopicsForTopic]);

  // ── CRUD handlers ───────────────────────────────────────────────────────────

  const openCreate = () => setModalForm(emptyForm());

  const openEdit = (q: Question) => {
    fetchSubTopicsForTopic(q.topic);
    setModalForm({
      _id: q._id,
      text: q.text,
      description: q.description,
      options: q.options,
      correctOption: q.correctOption,
      topic: q.topic,
      subTopic: q.subTopic ?? '',
      difficulty: q.difficulty,
    });
  };

  const handleSave = async (form: ReturnType<typeof emptyForm> & { _id?: string }) => {
    setSaving(true); setError('');
    try {
      const payload = {
        text: form.text,
        description: form.description,
        options: form.options,
        correctOption: form.correctOption,
        topic: form.topic,
        subTopic: form.subTopic || null,
        difficulty: form.difficulty,
      };
      if (form._id) {
        const { data } = await api.patch(`/api/questions/${form._id}`, payload);
        setQuestions((prev) => prev.map((q) => q._id === form._id ? data.question : q));
      } else {
        const { data } = await api.post('/api/questions', payload);
        setQuestions((prev) => [data.question, ...prev]);
      }
      setModalForm(null);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (q: Question) => {
    try {
      const { data } = await api.patch(`/api/questions/${q._id}`, { isActive: !q.isActive });
      setQuestions((prev) => prev.map((x) => x._id === q._id ? data.question : x));
    } catch {
      setError('Failed to update status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question permanently?')) return;
    try {
      await api.delete(`/api/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch {
      setError('Failed to delete question.');
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const topicName = (id: string) => topics.find((t) => t._id === id)?.name ?? '—';
  const subName   = (id: string | null) => id ? (subTopics.find((s) => s._id === id)?.name ?? id) : null;
  const filterSubs = subTopics.filter((s) => s.topic === filterTopic);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Questions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{questions.length} questions</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500
            text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Question
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          className="flex-1 min-w-48 text-sm rounded-xl px-3 py-2 border
            bg-white border-gray-200 text-gray-900 placeholder-gray-400
            dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="text-sm rounded-xl px-3 py-2 border
            bg-white border-gray-200 text-gray-900
            dark:bg-gray-800 dark:border-gray-700 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Topics</option>
          {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select
          value={filterSub}
          onChange={(e) => setFilterSub(e.target.value)}
          disabled={!filterTopic || filterSubs.length === 0}
          className="text-sm rounded-xl px-3 py-2 border
            bg-white border-gray-200 text-gray-900
            dark:bg-gray-800 dark:border-gray-700 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <option value="">All Subtopics</option>
          {filterSubs.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select
          value={filterDiff}
          onChange={(e) => setFilterDiff(e.target.value)}
          className="text-sm rounded-xl px-3 py-2 border
            bg-white border-gray-200 text-gray-900
            dark:bg-gray-800 dark:border-gray-700 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
      ) : questions.length === 0 ? (
        <div className="py-20 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-400">No questions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const isExpanded = expandedId === q._id;
            return (
              <div
                key={q._id}
                className={`bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
                  q.isActive
                    ? 'border-gray-200 dark:border-gray-800'
                    : 'border-gray-100 dark:border-gray-800/50 opacity-60'
                }`}
              >
                {/* Question row */}
                <div
                  className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : q._id)}
                >
                  {/* Expand chevron */}
                  <svg
                    className={`w-4 h-4 mt-0.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                      {q.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                      <span className="text-xs text-gray-400">{topicName(q.topic)}</span>
                      {subName(q.subTopic) && (
                        <>
                          <span className="text-xs text-gray-300 dark:text-gray-700">›</span>
                          <span className="text-xs text-gray-400">{subName(q.subTopic)}</span>
                        </>
                      )}
                      {!q.isActive && (
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(q)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-600/10 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(q)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        q.isActive
                          ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                          : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                      }`}
                      title={q.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d={q.isActive
                            ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636'
                            : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(q._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded: options + description */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${
                            i === q.correctOption
                              ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-800 dark:text-green-300'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === q.correctOption
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          }`}>
                            {OPTION_LABELS[i]}
                          </span>
                          {opt.text}
                          {i === q.correctOption && (
                            <svg className="w-3.5 h-3.5 ml-auto text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 leading-relaxed">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Explanation: </span>
                        {q.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalForm && (
        <QuestionModal
          initial={modalForm}
          topics={topics}
          subTopics={subTopics}
          onSubTopicTopicChange={fetchSubTopicsForTopic}
          onSave={(form) => handleSave({ ...form, _id: modalForm._id })}
          onClose={() => setModalForm(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
