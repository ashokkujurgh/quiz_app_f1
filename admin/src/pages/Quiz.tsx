import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Topic    { _id: string; name: string }
interface SubTopic { _id: string; name: string; topic: string }
interface Question { _id: string; text: string; difficulty: string }

type SelectionMode = 'manual' | 'random';
type ScheduleType  = 'once' | 'daily' | 'weekly' | 'monthly';
type Participation = 'public' | 'private' | 'invite_only';
type QuizStatus    = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  questionCount: number;
  selectionMode: SelectionMode;
  questions: string[];
  topic: string | null;
  subTopic: string | null;
  timezone: string;
  scheduledAt: string;
  durationMinutes: number;
  timeLimitPerQuestion: number | null;
  scheduleType: ScheduleType;
  participation: Participation;
  allowedUsers: string[];
  status: QuizStatus;
  startedAt: string | null;
  endedAt: string | null;
  endDate: string | null;
  image: string | null;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'America/Sao_Paulo', 'Australia/Sydney', 'UTC',
];

const STATUS_STYLES: Record<QuizStatus, string> = {
  draft:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  active:    'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  completed: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
};

const emptyForm = () => ({
  title: '',
  description: '',
  questionCount: 10,
  selectionMode: 'random' as SelectionMode,
  topic: '',
  subTopic: '',
  timezone: 'Asia/Kolkata',
  scheduledAt: '',
  durationMinutes: 30,
  scheduleType: 'once' as ScheduleType,
  endDate: '',
  timeLimitPerQuestion: '' as unknown as number,
  participation: 'public' as Participation,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls = `w-full text-sm rounded-xl px-3 py-2 border
  bg-white border-gray-200 text-gray-900
  dark:bg-gray-800 dark:border-gray-700 dark:text-white
  focus:outline-none focus:ring-2 focus:ring-indigo-500`;

// ── Create / Edit Modal ───────────────────────────────────────────────────────

function QuizModal({
  initial, topics, onSave, onClose, saving,
}: {
  initial: ReturnType<typeof emptyForm> & { _id?: string; image?: string | null };
  topics: Topic[];
  onSave: (form: ReturnType<typeof emptyForm> & { image?: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm]         = useState({ ...initial });
  const [subTopics, setSubs]    = useState<SubTopic[]>([]);
  const [preview, setPreview]   = useState<string>(initial.image ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!form.topic) { setSubs([]); return; }
    api.get(`/api/topics/${form.topic}/subtopics`)
      .then(({ data }) => setSubs(data.subtopics ?? []))
      .catch(() => setSubs([]));
  }, [form.topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = preview;
    if (imageFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('image', imageFile);
        // Do NOT set Content-Type manually — axios sets it with the correct boundary
        const { data } = await api.post('/api/auth/upload/image', fd);
        imageUrl = data.url ?? imageUrl;
      } catch (err) {
        console.error('[QuizForm] image upload failed:', err);
        // Continue without image rather than blocking quiz creation
        imageUrl = '';
      } finally {
        setUploading(false);
      }
    }
    await onSave({ ...form, image: imageUrl || '' });
  };

  const filteredSubs = subTopics.filter((s) => s.topic === form.topic);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {initial._id ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="quizform" onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">

          {/* Cover Image */}
          <div>
            <Label>Cover Image <span className="font-normal text-gray-400">(optional)</span></Label>
            {preview ? (
              <div className="mt-1 relative">
                <img
                  src={preview}
                  alt="preview"
                  className="w-full h-28 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => { setPreview(''); setImageFile(null); }}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="mt-1 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-400 transition-colors">
                <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-400">Click to upload (JPEG, PNG, WebP — max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setImageFile(f);
                    setPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
          </div>

          {/* Title + Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label required>Title</Label>
              <input required value={form.title} onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Weekly India GK Quiz" className={inputCls} />
            </div>
            <div>
              <Label>Description</Label>
              <input value={form.description} onChange={(e) => set({ description: e.target.value })}
                placeholder="Optional description" className={inputCls} />
            </div>
          </div>

          {/* Question setup */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Questions</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Number of Questions</Label>
                <input type="number" min={1} max={200} required
                  value={form.questionCount}
                  onChange={(e) => set({ questionCount: parseInt(e.target.value) || 1 })}
                  className={inputCls} />
              </div>
              <div>
                <Label>Selection Mode</Label>
                <select value={form.selectionMode} onChange={(e) => set({ selectionMode: e.target.value as SelectionMode })} className={inputCls}>
                  <option value="random">Random (auto-pick)</option>
                  <option value="manual">Manual (pick one by one)</option>
                </select>
              </div>
            </div>

            {form.selectionMode === 'random' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Topic</Label>
                  <select required value={form.topic} onChange={(e) => set({ topic: e.target.value, subTopic: '' })} className={inputCls}>
                    <option value="">Select topic…</option>
                    {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Subtopic</Label>
                  <select value={form.subTopic} onChange={(e) => set({ subTopic: e.target.value })}
                    disabled={!form.topic || filteredSubs.length === 0} className={inputCls}>
                    <option value="">Any subtopic</option>
                    {filteredSubs.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.selectionMode === 'manual' && (
              <p className="text-xs text-gray-400 italic">
                Quiz will be created as a draft. Add questions one by one from the quiz detail view.
              </p>
            )}
          </div>

          {/* Schedule */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Schedule</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Start Date & Time</Label>
                <input type="datetime-local" required value={form.scheduledAt}
                  onChange={(e) => set({ scheduledAt: e.target.value })} className={inputCls} />
              </div>
              <div>
                <Label>Timezone</Label>
                <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} className={inputCls}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <input type="number" min={1} value={form.durationMinutes}
                  onChange={(e) => set({ durationMinutes: parseInt(e.target.value) || 30 })} className={inputCls} />
              </div>
              <div>
                <Label>Time per Question (seconds) <span className="font-normal text-gray-400">optional</span></Label>
                <input type="number" min={5} placeholder="No limit"
                  value={form.timeLimitPerQuestion || ''}
                  onChange={(e) => set({ timeLimitPerQuestion: e.target.value ? parseInt(e.target.value) : ('' as unknown as number) })}
                  className={inputCls} />
              </div>
              <div>
                <Label>Recurrence</Label>
                <select value={form.scheduleType} onChange={(e) => set({ scheduleType: e.target.value as ScheduleType, endDate: '' })} className={inputCls}>
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {form.scheduleType !== 'once' && (
              <div>
                <Label>End Date <span className="font-normal text-gray-400">(optional)</span></Label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set({ endDate: e.target.value })}
                  min={form.scheduledAt ? form.scheduledAt.slice(0, 10) : undefined}
                  className={inputCls}
                  placeholder="No end date"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recurring quiz auto-cancels after this date. Leave blank to run indefinitely.
                </p>
              </div>
            )}
          </div>

          {/* Participation */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Participation</p>
            <div className="grid grid-cols-3 gap-3">
              {(['public', 'private', 'invite_only'] as Participation[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set({ participation: opt })}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    form.participation === opt
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {opt === 'public' ? 'Public' : opt === 'private' ? 'Private' : 'Invite Only'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {form.participation === 'public' && 'Anyone can join this quiz.'}
              {form.participation === 'private' && 'Only selected users can join.'}
              {form.participation === 'invite_only' && 'Users must be invited to join.'}
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" form="quizform" disabled={saving || uploading}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-colors">
            {uploading ? 'Uploading image…' : saving ? 'Saving…' : initial._id ? 'Save Changes' : 'Create Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Questions Modal (manual mode) ─────────────────────────────────────────

function AddQuestionsModal({
  quiz, topics, onClose, onDone,
}: {
  quiz: Quiz;
  topics: Topic[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set(quiz.questions));
  const [filterTopic, setFTopic]  = useState('');
  const [subTopics, setSubs]      = useState<SubTopic[]>([]);
  const [filterSub, setFSub]      = useState('');
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);

  const remaining = quiz.questionCount - quiz.questions.length;

  useEffect(() => {
    if (!filterTopic) { setQuestions([]); return; }
    setLoading(true);
    const params: Record<string, string> = { topic: filterTopic, limit: '100' };
    if (filterSub) params.subTopic = filterSub;
    api.get('/api/questions', { params })
      .then(({ data }) => setQuestions(data.questions ?? []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [filterTopic, filterSub]);

  useEffect(() => {
    if (!filterTopic) { setSubs([]); return; }
    api.get(`/api/topics/${filterTopic}/subtopics`)
      .then(({ data }) => setSubs((data.subtopics ?? []).filter((s: SubTopic) => s.topic === filterTopic)))
      .catch(() => setSubs([]));
  }, [filterTopic]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else {
        if (next.size < quiz.questionCount) next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const toAdd = [...selected].filter((id) => !quiz.questions.includes(id));
    if (!toAdd.length) { onClose(); return; }
    setSaving(true);
    try {
      await api.post(`/api/quizzes/${quiz._id}/questions`, { questionIds: toAdd });
      onDone();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const DIFF_COLORS: Record<string, string> = {
    easy:   'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400',
    hard:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Questions</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {selected.size} / {quiz.questionCount} selected · {remaining} remaining
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex gap-3 shrink-0">
          <select value={filterTopic} onChange={(e) => { setFTopic(e.target.value); setFSub(''); }}
            className={inputCls + ' flex-1'}>
            <option value="">Select topic to browse…</option>
            {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <select value={filterSub} onChange={(e) => setFSub(e.target.value)}
            disabled={!filterTopic || subTopics.length === 0} className={inputCls + ' flex-1'}>
            <option value="">All subtopics</option>
            {subTopics.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {!filterTopic && (
            <p className="text-sm text-center text-gray-400 py-10">Select a topic to browse questions.</p>
          )}
          {loading && <p className="text-sm text-center text-gray-400 py-10">Loading…</p>}
          {!loading && filterTopic && questions.length === 0 && (
            <p className="text-sm text-center text-gray-400 py-10">No questions found for this topic.</p>
          )}
          {questions.map((q) => {
            const checked = selected.has(q._id);
            const alreadyIn = quiz.questions.includes(q._id);
            return (
              <div
                key={q._id}
                onClick={() => !alreadyIn && toggle(q._id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                  alreadyIn
                    ? 'border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed'
                    : checked
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-600/10 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                  checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">{q.text}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${DIFF_COLORS[q.difficulty] ?? ''}`}>
                  {q.difficulty}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <span className="text-xs text-gray-400">{selected.size} selected</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Add Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quiz Detail Panel ─────────────────────────────────────────────────────────

function QuizDetail({
  quiz, topics, onClose, onRefresh,
}: {
  quiz: Quiz;
  topics: Topic[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);

  const topicName = (id: string | null) => id ? (topics.find((t) => t._id === id)?.name ?? id) : '—';

  const fetchQs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/quizzes/${quiz._id}/questions`);
      setQuestions(data.questions ?? []);
    } finally {
      setLoading(false);
    }
  }, [quiz._id]);

  useEffect(() => { fetchQs(); }, [fetchQs]);

  const handleRemove = async (qId: string) => {
    if (!confirm('Remove this question from the quiz?')) return;
    await api.delete(`/api/quizzes/${quiz._id}/questions/${qId}`);
    setQuestions((prev) => prev.filter((q) => q._id !== qId));
    onRefresh();
  };

  const handleStart = async () => {
    await api.post(`/api/quizzes/${quiz._id}/start`);
    onRefresh(); onClose();
  };

  const handleEnd = async () => {
    await api.post(`/api/quizzes/${quiz._id}/end`);
    onRefresh(); onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete quiz "${quiz.title}"?`)) return;
    await api.delete(`/api/quizzes/${quiz._id}`);
    onRefresh(); onClose();
  };

  const DIFF_COLORS: Record<string, string> = {
    easy:   'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400',
    hard:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{quiz.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[quiz.status]}`}>
              {quiz.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Cover image */}
          {quiz.image && (
            <img src={quiz.image} alt={quiz.title} className="w-full h-36 object-cover rounded-xl" />
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Questions', `${questions.length} / ${quiz.questionCount}`],
              ['Selection', quiz.selectionMode],
              ['Topic', topicName(quiz.topic)],
              ['Scheduled', fmtDate(quiz.scheduledAt)],
              ['Timezone', quiz.timezone],
              ['Duration', `${quiz.durationMinutes} min`],
              ['Time / Question', quiz.timeLimitPerQuestion ? `${quiz.timeLimitPerQuestion}s` : 'No limit'],
              ['Recurrence', quiz.scheduleType],
              ['Participation', quiz.participation.replace('_', ' ')],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                <p className="font-medium text-gray-800 dark:text-white capitalize">{v}</p>
              </div>
            ))}
          </div>

          {/* Progress bar for manual mode */}
          {quiz.selectionMode === 'manual' && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Questions added</span>
                <span>{questions.length} / {quiz.questionCount}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (questions.length / quiz.questionCount) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Questions list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Questions</p>
              {quiz.selectionMode === 'manual' && quiz.status !== 'completed' && quiz.status !== 'active' && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  + Add Questions
                </button>
              )}
            </div>
            {loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
            ) : questions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No questions yet.</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q._id} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-bold text-gray-400 mt-0.5 shrink-0 w-5">{i + 1}.</span>
                    <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">{q.text}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${DIFF_COLORS[q.difficulty] ?? ''}`}>
                      {q.difficulty}
                    </span>
                    {quiz.status !== 'active' && quiz.status !== 'completed' && (
                      <button onClick={() => handleRemove(q._id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button onClick={handleDelete}
            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
            Delete Quiz
          </button>
          <div className="flex gap-3">
            {quiz.status === 'scheduled' || quiz.status === 'draft' ? (
              <button onClick={handleStart}
                className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors">
                Start Now
              </button>
            ) : quiz.status === 'active' ? (
              <button onClick={handleEnd}
                className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-colors">
                End Quiz
              </button>
            ) : null}
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddQuestionsModal
          quiz={quiz}
          topics={topics}
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); fetchQs(); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function QuizPage() {
  const [quizzes, setQuizzes]     = useState<Quiz[]>([]);
  const [topics, setTopics]       = useState<Topic[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [modalForm, setModalForm] = useState<(ReturnType<typeof emptyForm> & { _id?: string }) | null>(null);
  const [detail, setDetail]       = useState<Quiz | null>(null);
  const [filterStatus, setFilter] = useState('');

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const { data } = await api.get('/api/quizzes', { params });
      setQuizzes(data.quizzes ?? []);
    } catch {
      setError('Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    api.get('/api/topics').then(({ data }) => setTopics(data.topics ?? [])).catch(() => {});
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const handleSave = async (form: ReturnType<typeof emptyForm> & { _id?: string; image?: string }) => {
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        image:                form.image || null,
        topic:                form.topic    || undefined,
        subTopic:             form.subTopic || undefined,
        scheduledAt:          form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        endDate:              form.endDate ? new Date(form.endDate).toISOString() : null,
        timeLimitPerQuestion: form.timeLimitPerQuestion || null,
      };
      if (form._id) {
        await api.patch(`/api/quizzes/${form._id}`, payload);
      } else {
        await api.post('/api/quizzes', payload);
      }
      setModalForm(null);
      fetchQuizzes();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  const topicName = (id: string | null) => id ? (topics.find((t) => t._id === id)?.name ?? '—') : '—';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
        </div>
        <button
          onClick={() => setModalForm(emptyForm())}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Quiz
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['', 'draft', 'scheduled', 'active', 'completed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-600/15 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No quizzes yet</p>
          <p className="text-xs text-gray-400">Create your first quiz to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz._id}
              onClick={() => setDetail(quiz)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              {quiz.image && (
                <img src={quiz.image} alt={quiz.title} className="w-full h-28 object-cover" />
              )}
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{quiz.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[quiz.status]}`}>
                      {quiz.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>{quiz.questionCount} questions · {quiz.selectionMode}</span>
                    {quiz.topic && <span>Topic: {topicName(quiz.topic)}</span>}
                    <span>{fmtDate(quiz.scheduledAt)} ({quiz.timezone})</span>
                    <span>{quiz.durationMinutes} min · {quiz.scheduleType}</span>
                    <span className="capitalize">{quiz.participation.replace('_', ' ')}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300 dark:text-gray-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalForm && (
        <QuizModal
          initial={modalForm}
          topics={topics}
          onSave={(form) => handleSave({ ...form, _id: modalForm._id })}
          onClose={() => setModalForm(null)}
          saving={saving}
        />
      )}

      {/* Detail Panel */}
      {detail && (
        <QuizDetail
          quiz={detail}
          topics={topics}
          onClose={() => setDetail(null)}
          onRefresh={() => { fetchQuizzes(); setDetail(null); }}
        />
      )}
    </div>
  );
}
