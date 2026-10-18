// Shared loader for the active topics and their active subtopics.
// The home feed and the right sidebar both need this on the same screen; one
// cached promise means a single set of requests instead of one per component.

const API = import.meta.env.VITE_API_URL ?? '';
const TTL_MS = 5 * 60 * 1000;

export interface CachedTopic    { _id: string; name: string }
export interface CachedSubTopic { _id: string; name: string; topic: string }

interface TopicsData { topics: CachedTopic[]; subTopics: CachedSubTopic[] }

let cache: { at: number; promise: Promise<TopicsData> } | null = null;

async function fetchTopics(): Promise<TopicsData> {
  const d = await fetch(`${API}/api/topics`).then((r) => r.json());
  if (!d.success || !d.topics?.length) return { topics: [], subTopics: [] };
  const topics = (d.topics as (CachedTopic & { isActive?: boolean })[]).filter((t) => t.isActive !== false);
  const perTopic = await Promise.all(
    topics.map((t) =>
      fetch(`${API}/api/topics/${t._id}/subtopics`)
        .then((r) => r.json())
        .then((sd) => ((sd.subtopics ?? []) as (CachedSubTopic & { isActive?: boolean })[]).filter((s) => s.isActive !== false))
        .catch(() => [] as CachedSubTopic[]),
    ),
  );
  return { topics, subTopics: perTopic.flat() };
}

/** Active topics + subtopics, deduplicated across callers and cached for a few minutes. */
export function loadTopicsWithSubtopics(): Promise<TopicsData> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const promise = fetchTopics().catch((err) => {
    cache = null; // don't cache failures
    throw err;
  });
  cache = { at: Date.now(), promise };
  return promise;
}
