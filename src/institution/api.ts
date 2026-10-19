// Every call the institution pages make to the backend (/api/v1/institution).
import { api } from '@/lib/api';

// free = no paid plan: 2 students, reading and listening only.
export type InstitutionStatus = 'free' | 'active' | 'expired';

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
    validUntil?: string;
    seatLimit: number;
    profile: InstitutionProfile;
    // false until the setup is finished; the dashboard waits for it.
    onboarded: boolean;
    logoUrl?: string;
  };
}

export interface SignupForm {
  institutionName: string;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface Student {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

// The admin's own account.
export const signUp = (form: SignupForm) => api.post<InstitutionAccount>('/institution/signup', form);

export const logIn = (email: string, password: string) =>
  api.post<InstitutionAccount>('/institution/login', { email, password });

export const logOut = () => api.post('/institution/logout');

export const fetchAccount = () => api.get<InstitutionAccount>('/institution/me');

export const saveProfile = (profile: InstitutionProfile) => api.put<InstitutionAccount>('/institution/profile', profile);

export const uploadLogo = (file: Blob) => api.upload<{ logoUrl: string }>('/institution/logo', file);

// The admin's students. A password comes back only when it is created or reset.
export const fetchStudents = () => api.get<{ students: Student[] }>('/institution/students');

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
