// Every call the institution pages make to the backend (/api/v1/institution).
import { api } from '@/lib/api';

// none = no plan yet (no seats); expired = students get reading and listening only.
export type InstitutionStatus = 'none' | 'active' | 'expired';

export type InstitutionPlan = 'basic' | 'extended' | 'ultimate' | 'custom';

// Seats per plan; every student gets the same allowance on all of them. A custom
// plan has the seats Prepyo agrees with the institution (its seatLimit), so 0 here.
export const PLANS: Record<InstitutionPlan, { name: string; seats: number }> = {
  basic: { name: 'Basic', seats: 10 },
  extended: { name: 'Extended', seats: 25 },
  ultimate: { name: 'Ultimate', seats: 50 },
  custom: { name: 'Custom', seats: 0 },
};

export const STUDENT_ALLOWANCE =
  '1,100 AI credits a month for marked answers, sectional mocks and full mocks, with no daily limit; reading and listening practice is free';

export const AI_GRADINGS_PER_MONTH = 1100;

export type ExamCode = 'IELTS' | 'PTE' | 'EPS_TOPIK' | 'JLPT';

// The institution's details, kept up to date from its Settings page.
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
    // The exams Prepyo's plan includes: students can be given only these.
    planExams?: ExamCode[];
    profile: InstitutionProfile;
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
  exam: ExamCode;
  batchId: string | null;
  usage: StudentUsage;
  // The last finished mock, on the exam's own scale; null before the first.
  latestMock: MockScore | null;
  // Missing from an older API; read it through readinessOf.
  readiness?: Readiness;
}

// Whether the student can book the real exam: ready once their last 2 full mocks
// (last 90 days, their exam) each meet their target score.
export interface Readiness {
  status: 'ready' | 'in_progress';
  target: number | null;
  // Newest first, at most 2, on the exam's own scale.
  fullMocks: number[];
}

export interface MockScore {
  exam: ExamCode;
  title: string;
  score: number;
  at: string;
}

// A class the institution groups students into.
export interface Batch {
  id: string;
  name: string;
  exam: ExamCode;
  startsOn: string | null; // YYYY-MM-DD
  endsOn: string | null;
  students: number;
}

export interface BatchForm {
  name: string;
  exam: ExamCode;
  startsOn: string; // YYYY-MM-DD or empty
  endsOn: string;
}

export interface StudentProgress {
  exam: ExamCode;
  targetScore: number | null;
  // Oldest first, the latest 30.
  mocks: MockScore[];
  // The last 12 weeks, oldest first; weekStart is a Monday.
  weeks: { weekStart: string; answers: number; averageAccuracy: number | null }[];
}

export type PaymentMethod = 'cash' | 'bank' | 'esewa' | 'khalti' | 'fonepay' | 'other';

export const PAYMENT_METHODS: { id: PaymentMethod; name: string }[] = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank transfer' },
  { id: 'esewa', name: 'eSewa' },
  { id: 'khalti', name: 'Khalti' },
  { id: 'fonepay', name: 'Fonepay' },
  { id: 'other', name: 'Other' },
];

// What a student owes and has paid, in whole rupees.
export interface StudentFee {
  studentId: string;
  name: string;
  username: string;
  batchId: string | null;
  set: boolean; // false until a fee is entered
  totalNpr: number;
  discountNpr: number;
  paidNpr: number;
  balanceNpr: number; // negative when the student paid more than the fee
  dueOn: string | null;
  overdue: boolean;
}

export interface FeeTotals {
  billedNpr: number;
  collectedNpr: number;
  outstandingNpr: number;
  overdue: number;
}

export interface Payment {
  id: string;
  studentId: string;
  receiptNo: number;
  amountNpr: number;
  paidOn: string;
  method: PaymentMethod;
  note: string;
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

export const addStudent = (name: string, exam: ExamCode, batchId = '') =>
  api.post<{ student: Student; password: string }>('/institution/students', batchId ? { name, exam, batchId } : { name, exam });

// An empty batchId takes the student out of their batch.
export const setStudentBatch = (id: string, batchId: string) => api.put(`/institution/students/${id}/batch`, { batchId });

export const fetchStudentProgress = (id: string) => api.get<StudentProgress>(`/institution/students/${id}/progress`);

// Batches. Deleting one keeps its students, without a batch.
export const fetchBatches = () => api.get<{ batches: Batch[] }>('/institution/batches');

export const createBatch = (form: BatchForm) => api.post<{ batch: Batch }>('/institution/batches', form);

export const updateBatch = (id: string, form: BatchForm) => api.put<{ batch: Batch }>(`/institution/batches/${id}`, form);

export const deleteBatch = (id: string) => api.delete(`/institution/batches/${id}`);

// Fees and payments.
export const fetchFees = () => api.get<{ students: StudentFee[]; totals: FeeTotals }>('/institution/fees');

export const setStudentFee = (id: string, fee: { totalNpr: number; discountNpr: number; dueOn: string }) =>
  api.put(`/institution/students/${id}/fee`, fee);

export const fetchPayments = (id: string) => api.get<{ payments: Payment[] }>(`/institution/students/${id}/payments`);

export const addPayment = (id: string, payment: { amountNpr: number; paidOn: string; method: PaymentMethod; note: string }) =>
  api.post<{ payment: Payment }>(`/institution/students/${id}/payments`, payment);

export const deletePayment = (id: string) => api.delete(`/institution/payments/${id}`);

// Switches the exam the student practises; their target score is cleared.
export const setStudentExam = (id: string, exam: ExamCode) => api.put(`/institution/students/${id}/exam`, { exam });

export const resetStudentPassword = (id: string) =>
  api.post<{ password: string }>(`/institution/students/${id}/reset-password`);

export const removeStudent = (id: string) => api.delete(`/institution/students/${id}`);

// The student sign-in page.
export const lookUpInstitution = (code: string) =>
  api.get<{ name: string; code: string; brandColor?: string; logoUrl?: string }>(`/institution/lookup/${encodeURIComponent(code)}`);

export const studentLogIn = (code: string, username: string, password: string) =>
  api.post('/institution/student-login', { code, username, password });
