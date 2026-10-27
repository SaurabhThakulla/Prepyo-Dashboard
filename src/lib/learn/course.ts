import { useApp } from '@/context/AppContext';
import { courseForExam, LearnCourse } from '@/data/learnCourses';

/** The Learn course for the exam the learner is preparing for. */
export function useLearnCourse(): LearnCourse {
  const { activeExam } = useApp();
  return courseForExam(activeExam);
}
