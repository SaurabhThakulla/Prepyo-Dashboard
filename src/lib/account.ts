import type { UserProfile } from '@/lib/types';

/**
 * The lines under a learner's name. An institution's student has no email of
 * their own: they see their username, their institution and its email.
 */
export function accountLines(user: Pick<UserProfile, 'email' | 'institution'> | null | undefined): string[] {
  if (!user) return [];
  const inst = user.institution;
  if (inst) return [`@${inst.username} · ${inst.name}`, inst.email].filter(Boolean);
  return user.email ? [user.email] : [];
}
