import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ExamType } from '@/lib/types';

/**
 * The admin's view of the reading bank.
 *
 * Separate from the learner hooks in useReading: this one sees drafts, answer
 * keys and everything else the practice endpoints deliberately withhold.
 */

export interface PassageSummary {
  id: string;
  exam: ExamType;
  exams: ExamType[];
  title: string;
  subtitle?: string;
  topic?: string;
  difficulty: string;
  tags: string[];
  wordCount: number;
  paragraphs: number;
  groups: number;
  questions: number;
  taskTypes: string[];
  isPublished: boolean;
  passageSlot?: 'A' | 'B' | 'C' | 'custom';
  createdAt: string;
}

export interface AuthoredQuestion {
  id: string;
  prompt: string;
  options?: { id: string; text: string }[] | null;
  correctAnswers?: string[] | null;
  blanks?: { id: string; options?: string[]; correctAnswer?: string }[] | null;
  contextPassage?: string | null;
  explanation?: string | null;
  points: number;
}

export interface AuthoredSet {
  id: string;
  position: number;
  exams: ExamType[];
  typeId: string;
  typeName: string;
  instructions: string;
  boxTitle: string;
  passageDisplay: string;
  resources?: { label: string; text: string }[] | null;
  /** The diagram of a diagram-label set. */
  imageUrl?: string;
  questions: AuthoredQuestion[];
}

export interface PassageDetail extends PassageSummary {
  body: { label: string; text: string }[];
  sets: AuthoredSet[];
}

export const examsOf = (passage: PassageSummary): ExamType[] =>
  passage.exams?.length ? passage.exams : [passage.exam];

export function usePassageBank() {
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ passages: PassageSummary[] }>('/admin/reading/passages');
      setPassages(data.passages ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { passages, loading, error, reload: load };
}

export function usePassageDetail(id: string | null) {
  const [passage, setPassage] = useState<PassageDetail | null>(null);
  // Starts loading when there is something to load: an id with nothing fetched
  // yet is a passage on its way, not a passage that is missing.
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setPassage(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ passage: PassageDetail }>(`/admin/reading/passages/${id}`);
      setPassage(data.passage);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { passage, loading, error, reload: load };
}
