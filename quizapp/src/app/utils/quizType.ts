import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { loadTopicsWithSubtopics } from './topicsCache';

// Games are split into two types for the GK / Engineering switch.
// Engineering = the Engineering topic; GK = every other topic
// (General Studies, Aptitude & Reasoning, Current Affairs, …) and games with no topic.
export type QuizType = 'gk' | 'engineering';

const ENGINEERING_TOPIC_NAMES = new Set(['engineering']);
const STORAGE_KEY = 'meenzo.quizType';

// ── Selected type: remembered per browser, shared by every switch on the page ──
const listeners = new Set<() => void>();

function readStored(): QuizType {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'engineering' ? 'engineering' : 'gk';
  } catch {
    return 'gk';
  }
}

let current: QuizType = readStored();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useQuizType(): [QuizType, (t: QuizType) => void] {
  const type = useSyncExternalStore(subscribe, () => current);
  const setType = useCallback((t: QuizType) => {
    if (t === current) return;
    current = t;
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* storage blocked — keep in memory */ }
    listeners.forEach((l) => l());
  }, []);
  return [type, setType];
}

// ── Which topic ids are "engineering" (cached topics loader — no extra requests) ──
export function useEngineeringTopicIds(): Set<string> | null {
  const [ids, setIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    loadTopicsWithSubtopics()
      .then(({ topics }) => {
        if (alive) setIds(new Set(topics.filter((t) => ENGINEERING_TOPIC_NAMES.has(t.name.trim().toLowerCase())).map((t) => t._id)));
      })
      .catch(() => { if (alive) setIds(new Set()); });
    return () => { alive = false; };
  }, []);
  return ids;
}

export function quizTypeOf(topicId: string | null | undefined, engineeringIds: Set<string>): QuizType {
  return topicId && engineeringIds.has(topicId) ? 'engineering' : 'gk';
}
