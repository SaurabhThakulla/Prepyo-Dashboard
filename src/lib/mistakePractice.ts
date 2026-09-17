import { api } from '@/lib/api';
import { ExamType, Mistake, Question, ReadingGroup, ReadingPassage, ReadingSet, SkillType } from '@/lib/types';
import { matchesTypeKey, SYLLABUS, typeKey } from '@/lib/syllabus';

export function mistakePracticeHref(mistake: Mistake): string {
  const label = SYLLABUS[mistake.exam]?.[mistake.skill]?.find(name =>
    matchesTypeKey(name, typeKey(mistake.typeName))) ?? mistake.typeName;
  const params = new URLSearchParams({
    skill: mistake.skill, type: typeKey(label), mistake: mistake.id,
    question: mistake.questionId, exam: mistake.exam,
  });
  return `/practice?${params}`;
}

export interface MistakeTask {
  question: Question;
  passage?: ReadingPassage;
  group?: ReadingGroup;
}

export async function loadMistakeTask(id: string, exam: ExamType, skill: SkillType): Promise<MistakeTask> {
  const task = await api.get<MistakeTask>(`/mistakes/${encodeURIComponent(id)}/task`);
  if (task.question.skill !== skill || !(task.question.supportedExams ?? [task.question.exam]).includes(exam)) {
    throw new Error('This mistake belongs to a different exam or skill. Open it again from your Mistake Bank.');
  }
  return task;
}

export function mistakeReadingSet(task: MistakeTask): ReadingSet {
  const q = task.question;
  return {
    passage: task.passage,
    groups: [{
      id: `retry-${q.id}`, passageId: task.passage?.id ?? '', position: 1,
      typeId: q.typeId, typeName: q.typeName, instructions: q.prompt,
      passageDisplay: 'hidden', ...task.group, questions: [q],
    }],
    totalQuestions: 1,
  };
}
