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

// What Prepyo charges per student seat a month, in rupees. Keep in step with
// PricePerTenSeatsNPR (Prepyo-Backend/internal/institution/institution.go), which is 10 seats.
export const PRICE_PER_STUDENT_NPR = 300;

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
  // Optional contact email, for the institution only; '' or missing when not given.
  email?: string;
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
  // The institution's target for the exam, else the student's own.
  target: number | null;
  targetFrom?: 'institution' | 'student' | '';
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
  exam: ExamCode; // the course the student is on
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

// The signature printed on fee receipts, and who signs. Private to the admin.
export interface ReceiptSignature {
  hasImage: boolean;
  signerName: string;
  signerTitle: string;
  updatedAt: string | null;
}

// The image itself; add ?v=<updatedAt> so a new one is fetched again.
export const SIGNATURE_IMAGE_URL = '/api/v1/institution/signature/image';

export const fetchSignature = () => api.get<{ signature: ReceiptSignature }>('/institution/signature');

export const saveSigner = (signerName: string, signerTitle: string) =>
  api.put<{ signature: ReceiptSignature }>('/institution/signature', { signerName, signerTitle });

export const uploadSignature = (file: Blob) => api.upload<{ signature: ReceiptSignature }>('/institution/signature/image', file);

export const removeSignatureImage = () => api.delete<{ signature: ReceiptSignature }>('/institution/signature/image');

// The admin's students. A password comes back only when it is created or reset.
export const fetchStudents = (days: number) => api.get<{ students: Student[] }>(`/institution/students?days=${days}`);

export const fetchStudentActivity = (id: string, days: number) =>
  api.get<StudentActivity>(`/institution/students/${id}/activity?days=${days}`);

// A disabled student cannot sign in; their history and seat are kept.
export const setStudentDisabled = (id: string, disabled: boolean) =>
  api.put(`/institution/students/${id}/disabled`, { disabled });

export const addStudent = (name: string, exam: ExamCode, batchId = '', email = '') =>
  api.post<{ student: Student; password: string }>('/institution/students', {
    name,
    exam,
    ...(batchId ? { batchId } : {}),
    ...(email ? { email } : {}),
  });

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

// Exams the institution can set one booking target for, applied to all their students.
export type TargetExam = 'PTE' | 'IELTS';
export const TARGET_EXAMS: TargetExam[] = ['PTE', 'IELTS'];
export type Targets = Partial<Record<TargetExam, number>>;

export const fetchTargets = () => api.get<{ targets: Targets }>('/institution/targets');

// A number sets the exam's target, null clears it (students' own targets apply again).
export const saveTargets = (targets: Partial<Record<TargetExam, number | null>>) =>
  api.put<{ targets: Targets }>('/institution/targets', { targets });

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

// ---------------------------------------------------------------- Institute Mocks

export type InstituteMockKind = 'full' | 'speaking' | 'writing' | 'reading' | 'listening';
export type InstituteMockExam = 'PTE' | 'IELTS';
export type IELTSModule = 'academic' | 'general_training';

/** The tests an exam's Institute Mock can be: the full test or one section, in the test's order. */
export const instituteMockKinds = (exam: InstituteMockExam): { id: InstituteMockKind; name: string }[] =>
  exam === 'IELTS'
    ? [
        { id: 'full', name: 'Full IELTS test' },
        { id: 'listening', name: 'Listening section' },
        { id: 'reading', name: 'Reading section' },
        { id: 'writing', name: 'Writing section' },
        { id: 'speaking', name: 'Speaking section' },
      ]
    : [
        { id: 'full', name: 'Full PTE test' },
        { id: 'speaking', name: 'Speaking section' },
        { id: 'writing', name: 'Writing section' },
        { id: 'reading', name: 'Reading section' },
        { id: 'listening', name: 'Listening section' },
      ];

export type MockState = 'draft' | 'scheduled' | 'open' | 'closed';

export interface InstituteMockSummary {
  id: string;
  name: string;
  exam: InstituteMockExam;
  module?: IELTSModule;
  kind: InstituteMockKind;
  title: string;
  state: MockState;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  students: number;
  started: number;
  waiting: number;
  released: number;
  questions: number;
  needed: number;
}

export interface MockSlot {
  task: string;
  name: string;
  count: number;
  part: string;
  skill: string;
}

export interface BankQuestion {
  id: string;
  task: string;
  title: string;
  preview: string;
  difficulty: string;
  imageUrl?: string;
  audioUrl?: string;
  seenBy: number;
}

export interface PaperItem {
  questionId: string;
  task: string;
  part?: string;
}

export interface MockAttemptRow {
  id: string;
  userId: string;
  name: string;
  username: string;
  status: 'in_progress' | 'submitted' | 'released';
  submittedAt: string | null;
  releasedAt: string | null;
  purgeAfter: string | null;
  finalScore: number | null;
}

export interface InstituteMockDetail extends InstituteMockSummary {
  slots: MockSlot[];
  items: (PaperItem & { question: BankQuestion | null })[];
  studentIds: string[];
  attempts: MockAttemptRow[];
}

export interface MockForm {
  name: string;
  kind: InstituteMockKind;
  opensAt: string | null;
  closesAt: string | null;
  studentIds: string[];
  items: PaperItem[];
}

export interface PteResult {
  overall: number | null;
  skills: Record<string, number>;
  unscored: number;
  answered: number;
  items: number;
}

export interface ReviewItem {
  position: number;
  task: string;
  taskName: string;
  part: string;
  marking: 'key' | 'spoken' | 'written';
  status: string;
  title: string;
  prompt: string;
  passage?: string;
  imageUrl?: string;
  audioUrl?: string;
  response?: string;
  correct?: string;
  transcript?: string;
  aiScore: number | null;
  feedback?: string;
  level: number | null;
  comment: string;
  hasRecording: boolean;
  needsMark: boolean;
}

/** An IELTS sitting's bands: each section's, and the overall band when all four were sat. */
export interface IeltsResult {
  overall: number | null;
  skills: Record<string, number>;
}

export interface IeltsTurn {
  position: number;
  part: number;
  question: string;
  transcript: string;
  seconds: number;
  hasRecording: boolean;
}

export interface EvaluationCriterion {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

/** One thing the teacher looks at in an IELTS section: a writing task, the speaking test, or a paper's score. */
export interface IeltsPart {
  key: 'task1' | 'task2' | 'speaking' | 'listening' | 'reading';
  name: string;
  title?: string;
  prompt?: string;
  imageUrl?: string;
  response?: string;
  words?: number;
  turns?: IeltsTurn[];
  correct?: number;
  total?: number;
  aiBand: number | null;
  summary?: string;
  criteria?: EvaluationCriterion[];
  markable: boolean;
  band: number | null;
  comment: string;
  needsMark: boolean;
}

export interface IeltsSection {
  skill: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'submitted';
  aiBand: number | null;
  finalBand: number | null;
  parts: IeltsPart[];
}

export interface MockReview {
  attemptId: string;
  mockId: string;
  mockName: string;
  exam: InstituteMockExam;
  module?: IELTSModule;
  kind: InstituteMockKind;
  studentName: string;
  username: string;
  status: MockAttemptRow['status'];
  submittedAt: string | null;
  releasedAt: string | null;
  purgeAfter: string | null;
  purgedAt: string | null;
  comment: string;
  reviewerName: string;
  aiResult: PteResult | null;
  finalResult: PteResult | null;
  finalScore: number | null;
  items: ReviewItem[];
  levels: number[];
  // IELTS only.
  sections?: IeltsSection[];
  bands?: number[];
  ieltsAiResult?: IeltsResult | null;
  ieltsResult?: IeltsResult | null;
}

export interface BandMark {
  key: IeltsPart['key'];
  band: number | null;
  comment: string;
}

export const fetchInstituteMocks = () => api.get<{ mocks: InstituteMockSummary[] }>('/institution/mocks');
export const createInstituteMock = (form: { name: string; exam: InstituteMockExam; kind: InstituteMockKind; module?: IELTSModule }) =>
  api.post<{ mock: InstituteMockDetail }>('/institution/mocks', form);
export const fetchInstituteMock = (id: string) => api.get<{ mock: InstituteMockDetail }>(`/institution/mocks/${id}`);
export const saveInstituteMock = (id: string, form: MockForm) => api.put<{ mock: InstituteMockDetail }>(`/institution/mocks/${id}`, form);
export const fillInstituteMock = (id: string) => api.post<{ mock: InstituteMockDetail }>(`/institution/mocks/${id}/fill`);
export const publishInstituteMock = (id: string) => api.post<{ mock: InstituteMockDetail }>(`/institution/mocks/${id}/publish`);
export const deleteInstituteMock = (id: string) => api.delete(`/institution/mocks/${id}`);
export const fetchQuestionBank = (task: string, search: string, difficulty: string, offset = 0, module = '') =>
  api.get<{ questions: BankQuestion[]; total: number }>('/institution/question-bank', { task, search, difficulty, limit: 30, offset, module });
export const fetchMockReview = (mockId: string, attemptId: string) =>
  api.get<{ review: MockReview }>(`/institution/mocks/${mockId}/attempts/${attemptId}`);
export const saveMockReview = (
  mockId: string,
  attemptId: string,
  form: { marks: { position: number; level: number | null; comment: string }[]; comment: string; bands?: BandMark[] },
) => api.put<{ review: MockReview }>(`/institution/mocks/${mockId}/attempts/${attemptId}`, form);
export const releaseMockResult = (mockId: string, attemptId: string, reviewerName: string) =>
  api.post<{ review: MockReview }>(`/institution/mocks/${mockId}/attempts/${attemptId}/release`, { reviewerName });
export const mockRecordingUrl = (mockId: string, attemptId: string, position: number) =>
  `/api/v1/institution/mocks/${mockId}/attempts/${attemptId}/recordings/${position}`;
