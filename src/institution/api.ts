// Every call the institution pages make to the backend (/api/v1/institution).
import { api } from '@/lib/api';

// none = no plan yet (no seats); expired = students get reading and listening only.
export type InstitutionStatus = 'none' | 'active' | 'expired';

export type InstitutionPlan = 'basic' | 'extended' | 'ultimate';

// Seats per plan; every student gets the same allowance on all three.
export const PLANS: Record<InstitutionPlan, { name: string; seats: number }> = {
  basic: { name: 'Basic', seats: 10 },
  extended: { name: 'Extended', seats: 25 },
  ultimate: { name: 'Ultimate', seats: 50 },
};

export const STUDENT_ALLOWANCE = '50 practice sets and 5 AI tutor messages a day, 900 AI gradings a month and 6 full mocks a month';

export const AI_GRADINGS_PER_MONTH = 900;

export type ExamCode = 'IELTS' | 'PTE' | 'EPS_TOPIK';

// What the institution answers in its setup after sign-up.
export interface InstitutionProfile {
  exams: ExamCode[];
  city: string;
  branches: number;
  monthlyStudents: string;
  brandColor: string;
}

export interface InstitutionAccount {
  admin: { name: string; email: string };
  institution: {
    name: string;
    code: string;
    status: InstitutionStatus;
    plan: InstitutionPlan | '';
    validUntil?: string;
    seatLimit: number;
    profile: InstitutionProfile;
    // false until the setup is finished; the dashboard waits for it.
    onboarded: boolean;
    logoUrl?: string;
  };
}

// What a student did in the chosen period; lastActiveAt is all time, aiGradingsThisMonth this month.
export interface StudentUsage {
  practiceAttempts: number;
  mocksCompleted: number;
  aiEvaluations: number;
  tutorMessages: number;
  lastActiveAt: string | null;
  aiGradingsThisMonth: number;
}

export interface Student {
  id: string;
  name: string;
  username: string;
  createdAt: string;
  disabled: boolean;
  usage: StudentUsage;
}

export interface StudentActivity {
  name: string;
  username: string;
  skills: { skill: string; attempts: number; averageAccuracy: number | null }[];
  recent: {
    kind: 'practice' | 'mock';
    exam: string;
    skill: string;
    task: string;
    title: string;
    score: number | null;
    maxScore: number | null;
    accuracy: number | null;
    at: string;
  }[];
}

// The admin's own account.
export const logIn = (email: string, password: string) =>
  api.post<InstitutionAccount>('/institution/login', { email, password });

export const logOut = () => api.post('/institution/logout');

export const fetchAccount = () => api.get<InstitutionAccount>('/institution/me');

export const saveProfile = (profile: InstitutionProfile) => api.put<InstitutionAccount>('/institution/profile', profile);

export const uploadLogo = (file: Blob) => api.upload<{ logoUrl: string }>('/institution/logo', file);

// The admin's students. A password comes back only when it is created or reset.
export const fetchStudents = (days: number) => api.get<{ students: Student[] }>(`/institution/students?days=${days}`);

export const fetchStudentActivity = (id: string, days: number) =>
  api.get<StudentActivity>(`/institution/students/${id}/activity?days=${days}`);

// A disabled student cannot sign in; their history and seat are kept.
export const setStudentDisabled = (id: string, disabled: boolean) =>
  api.put(`/institution/students/${id}/disabled`, { disabled });

export const addStudent = (name: string) =>
  api.post<{ student: Student; password: string }>('/institution/students', { name });

export const resetStudentPassword = (id: string) =>
  api.post<{ password: string }>(`/institution/students/${id}/reset-password`);

export const removeStudent = (id: string) => api.delete(`/institution/students/${id}`);

// The student sign-in page.
export const lookUpInstitution = (code: string) =>
  api.get<{ name: string; code: string; brandColor?: string; logoUrl?: string }>(`/institution/lookup/${encodeURIComponent(code)}`);

export const studentLogIn = (code: string, username: string, password: string) =>
  api.post('/institution/student-login', { code, username, password });
