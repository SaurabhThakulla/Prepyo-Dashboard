import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import {
  completeLesson,
  completeReview,
  currentStreak,
  EMPTY_PROGRESS,
  LearnProgress,
  mergeProgress,
  parseProgress,
} from '@/lib/learn/progress';

/**
 * The learner's place in the beginner Korean course.
 *
 * Kept in this browser, one record per signed-in account, and shared through
 * one store so the sidebar and the lesson page always agree. A signed-in
 * learner's record is also kept on the server (/learn/progress): it is merged
 * in once per visit and saved after every lesson or review, so progress
 * follows them to another device. Storage or the network can fail; the course
 * then works for the visit and catches up next time.
 */
const storageKey = (userId: string | undefined) => `prepyo-learn-korean-v1:${userId ?? 'guest'}`;

const cache = new Map<string, LearnProgress>();
const listeners = new Set<() => void>();
/** Accounts whose server copy has been merged in during this visit. */
const synced = new Set<string>();

function read(key: string): LearnProgress {
  const cached = cache.get(key);
  if (cached) return cached;
  let value = EMPTY_PROGRESS;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = parseProgress(JSON.parse(raw));
  } catch {
    // Unreadable or blocked: start fresh.
  }
  cache.set(key, value);
  return value;
}

function write(key: string, value: LearnProgress) {
  cache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked: progress lasts for this visit only.
  }
  listeners.forEach(listener => listener());
}

function save(value: LearnProgress) {
  // Best effort: the browser copy is already saved, and the next visit retries.
  api.put('/learn/progress', { progress: value }).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Merges the server's copy into this browser's once per visit, and saves the result back if it differs. */
async function syncWithServer(key: string) {
  if (synced.has(key)) return;
  synced.add(key);
  try {
    const { progress: stored } = await api.get<{ progress: unknown }>('/learn/progress');
    const server = parseProgress(stored);
    const merged = mergeProgress(read(key), server);
    write(key, merged);
    if (JSON.stringify(merged) !== JSON.stringify(server)) save(merged);
  } catch {
    synced.delete(key);
  }
}

export function useLearnProgress() {
  const { user } = useApp();
  const key = storageKey(user?.id);
  const progress = useSyncExternalStore(subscribe, () => read(key), () => EMPTY_PROGRESS);

  useEffect(() => {
    if (user?.id) void syncWithServer(key);
  }, [user?.id, key]);

  const finishLesson = useCallback(
    (unitId: string, lessonId: string, mistakes: number) => {
      const result = completeLesson(read(key), unitId, lessonId, mistakes);
      write(key, result.progress);
      if (user?.id) save(result.progress);
      return result.earned;
    },
    [key, user?.id],
  );

  const finishReview = useCallback(
    (results: { ko: string; correct: boolean }[]) => {
      const result = completeReview(read(key), results);
      write(key, result.progress);
      if (user?.id) save(result.progress);
      return result.earned;
    },
    [key, user?.id],
  );

  return { progress, streak: currentStreak(progress), finishLesson, finishReview };
}
