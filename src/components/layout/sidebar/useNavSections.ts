import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isAdmin } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { useReadingTypes } from '@/lib/hooks/useReading';
import { useLearnProgress } from '@/lib/hooks/useLearnProgress';
import { AdminHubCounts, buildSections, PrimarySectionConfig } from './navigation';
import { useCdsTrack } from '@/cds/cdsShared';

/**
 * The menu for the signed-in learner, as `buildSections` builds it, with the
 * inputs it needs fetched here. The desktop sidebar and the mobile hub screens
 * both read it, so a task added to the syllabus shows up in both.
 */
export function useNavSections(): PrimarySectionConfig[] {
  const [searchParams] = useSearchParams();
  const { user, activeExam, setIsTutorOpen, pteVariant } = useApp();

  // Reading headings are only worth showing when the bank has something behind
  // them, so the menu is checked against the same list the practice page deals
  // from. Left undefined until it arrives, which shows every heading.
  const readingTypes = useReadingTypes(activeExam, Boolean(user) && activeExam !== 'EPS_TOPIK' && activeExam !== 'JLPT' && activeExam !== 'CDS' && activeExam !== 'NCC');
  // OTA candidates sit no Maths paper, so their menu leaves it out.
  const cdsTrack = useCdsTrack(Boolean(user) && activeExam === 'CDS');
  const availableReadingTypes = useMemo(
    () =>
      readingTypes.data
        ? readingTypes.data.types.filter(type => type.questionCount > 0).map(type => type.typeId)
        : undefined,
    [readingTypes.data],
  );

  const hasMistake = Boolean(searchParams.get('mistake'));
  const { progress: learnProgress } = useLearnProgress();
  const adminCounts = useAdminHubCounts(isAdmin(user ?? null));
  return buildSections(
    activeExam,
    () => setIsTutorOpen(true),
    user,
    availableReadingTypes,
    readingTypes.data?.mockPassageCount ?? 0,
    hasMistake,
    learnProgress,
    pteVariant,
    cdsTrack,
    adminCounts,
  );
}

/** The Admin Hub's numbers: one row of each list is enough for its count. */
function useAdminHubCounts(enabled: boolean): AdminHubCounts {
  const { data } = useQuery({
    queryKey: ['admin', 'hub-counts'],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AdminHubCounts> => {
      const [users, payments, reports] = await Promise.all([
        api.get<{ meta?: { total: number } }>('/admin/users?limit=1'),
        api.get<{ pendingCount?: number }>('/admin/payments?limit=1'),
        api.get<{ openCount?: number }>('/admin/reports', { limit: 1 }),
      ]);
      return { users: users.meta?.total, pendingPayments: payments.pendingCount, openReports: reports.openCount };
    },
  });
  return data ?? {};
}
