// The choices offered on the institution's Settings page, and how its answers read back.
import type { ExamCode } from './api';

export const EXAM_CHOICES: { id: ExamCode; name: string; detail: string; accent: string }[] = [
  { id: 'IELTS', name: 'IELTS', detail: 'IELTS Academic, all four skills', accent: '#e11d48' },
  { id: 'PTE', name: 'PTE Academic', detail: 'Every task type, scored by AI', accent: '#2563eb' },
  { id: 'EPS_TOPIK', name: 'EPS-TOPIK', detail: 'Korean reading and listening for work in Korea', accent: '#059669' },
  { id: 'JLPT', name: 'JLPT / NAT N5', detail: 'Japanese vocabulary, grammar, reading and listening', accent: '#dc2626' },
];

export const CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal',
  'Biratnagar', 'Dharan', 'Itahari', 'Birgunj', 'Nepalgunj', 'Dhangadhi',
];

export const STUDENT_RANGES: { id: string; label: string; detail: string }[] = [
  { id: 'under-25', label: 'Under 25', detail: 'A small batch or a new institute' },
  { id: '25-50', label: '25 to 50', detail: 'A couple of regular batches' },
  { id: '50-100', label: '50 to 100', detail: 'Several batches running at once' },
  { id: '100-plus', label: 'More than 100', detail: 'A large institute or several branches' },
];

export const BRAND_COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#c2410c', '#0369a1', '#15803d', '#1e293b'];

export const MAX_BRANCHES = 50;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const examName = (id: ExamCode) => EXAM_CHOICES.find(exam => exam.id === id)?.name ?? id;
export const studentRangeLabel = (id: string) => STUDENT_RANGES.find(range => range.id === id)?.label ?? '';
export const branchesLabel = (n: number) => `${n} branch${n === 1 ? '' : 'es'}`;

export const validCity = (city: string) => city.trim().length >= 2 && city.trim().length <= 60;
export const validColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color);

/** Two letters for an institution without a logo: "Bright Future" → "BF". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase() || 'P';
}
