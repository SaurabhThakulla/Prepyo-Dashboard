import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { CourseId, courseForExam, hasLearnCourse } from '@/data/learnCourses';
import { ExamType, isAdmin, UserProfile } from '@/lib/types';

/**
 * Only EPS-TOPIK (Korean) and JLPT (Japanese) learners — plus admins previewing
 * those exams via the switcher — may access /learn courses and progress sync.
 */
export function canAccessLearn(
  user: UserProfile | null,
  activeExam: ExamType,
  course?: CourseId,
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return course ? true : hasLearnCourse(activeExam);
  if (!hasLearnCourse(user.targetExam)) return false;
  if (course) return courseForExam(user.targetExam).id === course;
  return hasLearnCourse(activeExam) && user.targetExam === activeExam;
}

export default function LearnCourseGuard({ children }: { children: React.ReactNode }) {
  const { user, activeExam, loading } = useApp();
  if (loading) return null;
  if (!canAccessLearn(user, activeExam)) {
    return <Navigate to={isAdmin(user) ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}
