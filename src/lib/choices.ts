import { Question } from '@/lib/types';

/** Selection cardinality is determined by the task, never by hidden answer keys. */
export function allowsMultipleChoices(
  question?: Pick<Question, 'typeId'> & Partial<Pick<Question, 'typeName' | 'prompt' | 'correctAnswers'>>,
): boolean {
  if (!question) return false;
  const tid = (question.typeId || '').toLowerCase();
  const tname = (question.typeName || '').toLowerCase();
  const prompt = (question.prompt || '').toLowerCase();

  // Explicit single choice indicators
  if (
    tid === 'reading-mcq-single' ||
    tid === 'pte-listening-mcsa' ||
    tid === 'ielts-listening-mcq-single' ||
    tid === 'multiple-choice-single' ||
    tid.endsWith('-single') ||
    tname.includes('single answer')
  ) {
    return false;
  }

  // Explicit multiple choice indicators
  if (
    tid === 'reading-mcq-multiple' ||
    tid === 'pte-listening-mcma' ||
    tid === 'ielts-listening-mcq-multiple' ||
    tid === 'multiple-choice-multiple' ||
    tid.endsWith('-multiple') ||
    tid.endsWith('-mcma') ||
    tname.includes('multiple answer') ||
    tname.includes('multiple answers')
  ) {
    return true;
  }

  if (question.correctAnswers && question.correctAnswers.length > 1) {
    return true;
  }

  if (/(choose|select)\s+(two|three|four|all|multiple|\d+)\s+(options|letters|answers|responses)/i.test(prompt)) {
    return true;
  }

  return false;
}

/**
 * The English version without its choice list, as labelled lines:
 * "Text: … Question: …" → [{label: 'Text', …}, {label: 'Question', …}]. A dialogue keeps its speakers.
 */
export function englishLines(english: string | undefined): { label: string; text: string }[] {
  const at = english?.lastIndexOf('Choices:') ?? -1;
  const body = (at < 0 ? english ?? '' : english!.slice(0, at)).trim();
  if (!body) return [];
  const parts = body.split(/(?:^|\s)(Text|Question|Audio|Man|Woman):\s*/);
  const lines = parts[0].trim() ? [{ label: '', text: parts[0].trim() }] : [];
  for (let i = 1; i < parts.length; i += 2) lines.push({ label: parts[i], text: parts[i + 1].trim() });
  return lines;
}

/**
 * The English sentence with the part the Japanese underlines marked `__so__`:
 * all of it when the whole passage is underlined, otherwise the right
 * choice's English ("mise (shop)" → shop) where the sentence uses it.
 */
export function underlineEnglish(text: string, passage: string | undefined, answer: string | undefined): string {
  if (!passage || !/__[^_]+__/.test(passage)) return text;
  if (/^__[^_]+__$/.test(passage.trim())) return `__${text}__`;
  const term = (answer?.match(/\(([^)]+)\)\s*$/)?.[1] ?? answer ?? '').trim();
  if (!term || term.startsWith('not ')) return text;
  return text.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i'), m => `__${m}__`);
}

/**
 * Each choice's English, in option order, from an EPS-TOPIK or JLPT item's
 * English version, which ends "Choices: A. ate. B. drank." (JLPT: "1. …").
 * Empty when the text has no such list.
 */
export function choiceGlosses(english: string | undefined, count: number): string[] {
  const at = english?.lastIndexOf('Choices:') ?? -1;
  if (!english || at < 0) return [];
  const tail = english.slice(at + 'Choices:'.length);
  const label = (i: number) => (/^\s*1\./.test(tail) ? String(i + 1) : String.fromCharCode(65 + i));
  const glosses: string[] = [];
  let from = tail.indexOf(`${label(0)}. `);
  if (from < 0) return [];
  for (let i = 0; i < count; i++) {
    const start = from + label(i).length + 2;
    const next = tail.indexOf(` ${label(i + 1)}. `, start);
    const end = i + 1 < count && next >= 0 ? next : tail.length;
    glosses.push(tail.slice(start, end).trim().replace(/\.$/, ''));
    if (next < 0) break;
    from = next + 1;
  }
  return glosses;
}
