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

/** Read Aloud shows only the text to read, never an audio player. */
export function isReadAloudTask(question: Question): boolean {
  return /(^|-)read-?aloud$/.test(question.typeId ?? '');
}

/**
 * The passage as it should flow on screen. Speaking and writing passages
 * imported with hard line wraps or one sentence per line flow as a paragraph;
 * a blank line, a line ending in ":", and a line starting a speaker ("Man:")
 * or a list item keep their break. Listening notes keep every line.
 */
export function passageText(question: Question): string {
  const text = question.contextPassage ?? '';
  if (question.skill !== 'speaking' && question.skill !== 'writing') return text;
  return text.replace(/([^\s:])[ \t\r]*\n(?![ \t\r]*\n)(?![ \t]*(?:[-•*]\s|\d+[.)]\s|[A-Z][\w .'’-]{0,30}:))[ \t]*/g, '$1 ');
}

/** Repeat Sentence plays only the audio; its passage is the sentence itself. */
export function isRepeatSentenceTask(question: Question): boolean {
  return /(^|-)repeat-?sentence$/.test(question.typeId ?? '');
}
