import { useCallback, useSyncExternalStore } from 'react';
import { useApp } from '@/context/AppContext';
import { completeLesson, currentStreak, EMPTY_PROGRESS, LearnProgress, parseProgress } from '@/lib/learn/progress';

/**
 * The learner's place in the beginner Korean course.
 *
 * Kept in this browser for now, one record per signed-in account, and shared
 * through one store so the sidebar and the lesson page always agree. Storage
 * can be blocked (private windows, strict settings); the course then works for
 * the visit and simply starts fresh next time.
 */
const storageKey = (userId: string | undefined) => `prepyo-learn-korean-v1:${userId ?? 'guest'}`;

const cache = new Map<string, LearnProgress>();
const listeners = new Set<() => void>();

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

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLearnProgress() {
  const { user } = useApp();
  const key = storageKey(user?.id);
  const progress = useSyncExternalStore(subscribe, () => read(key), () => EMPTY_PROGRESS);

  const finishLesson = useCallback(
    (unitId: string, lessonId: string, mistakes: number) => {
      const result = completeLesson(read(key), unitId, lessonId, mistakes);
      write(key, result.progress);
      return result.earned;
    },
    [key],
  );

  return { progress, streak: currentStreak(progress), finishLesson };
}
