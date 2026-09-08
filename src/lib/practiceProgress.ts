const PREFIX = 'prepyo-practice-progress';

function storageKey(exam: string, skill: string, type?: string | null) {
  return `${PREFIX}:${exam}:${skill}:${type || 'all'}`;
}

export function loadCompleted(exam: string, skill: string, type?: string | null): string[] {
  try {
    const raw = localStorage.getItem(storageKey(exam, skill, type));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveCompleted(exam: string, skill: string, type: string | null | undefined, ids: string[]) {
  try {
    localStorage.setItem(storageKey(exam, skill, type), JSON.stringify(ids));
  } catch {
    return;
  }
}

export function unlockedIndex(orderedIds: string[], completed: Set<string>) {
  let index = 0;
  while (index < orderedIds.length && completed.has(orderedIds[index])) index += 1;
  return Math.min(index, Math.max(orderedIds.length - 1, 0));
}
