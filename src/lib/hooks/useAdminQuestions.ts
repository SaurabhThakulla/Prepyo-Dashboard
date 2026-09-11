import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ExamType, SkillType } from '@/lib/types';

export type FieldUse = '' | 'optional' | 'required';
export type AnswerKind = 'rubric' | 'single' | 'multiple' | 'blanks' | 'dictation';

export interface QuestionTypeSpec {
  exam: ExamType;
  skill: SkillType;
  typeId: string;
  typeName: string;
  answer: AnswerKind;
  passage: FieldUse;
  audio: FieldUse;
  image: FieldUse;
  figure: FieldUse;
  prompt: string;
  prepSeconds: number;
  timeLimitSeconds: number;
  points: number;
}

export interface AuthoredQuestionSummary {
  id: string;
  exam: ExamType;
  typeId: string;
  typeName: string;
  title: string;
  prompt: string;
  difficulty: string;
  points: number;
  isPublished: boolean;
  createdAt: string;
  answers: number;
  inMock: boolean;
}

export function useQuestionTypes() {
  const [types, setTypes] = useState<QuestionTypeSpec[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ types: QuestionTypeSpec[] }>('/admin/questions/types')
      .then(data => {
        if (!cancelled) setTypes(data.types ?? []);
      })
      .catch(err => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { types, error };
}

export function useQuestionBank(skill: SkillType) {
  const [questions, setQuestions] = useState<AuthoredQuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ questions: AuthoredQuestionSummary[] }>('/admin/questions', { skill });
      setQuestions(data.questions ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [skill]);

  useEffect(() => {
    void load();
  }, [load]);

  return { questions, loading, error, reload: load };
}
