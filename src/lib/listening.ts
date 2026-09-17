import { Question } from '@/lib/types';

export function listeningTextTask(question: Question): 'summary' | 'dictation' | null {
  if (question.skill !== 'listening') return null;
  if (question.typeId === 'summarize-spoken-text') return 'summary';
  if (question.typeId === 'write-from-dictation') return 'dictation';
  return null;
}

export function isWordHighlightTask(question: Question): boolean {
  return question.skill === 'listening' && question.typeId === 'pte-highlight-incorrect-word';
}
