import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useReadingTypes } from '@/lib/hooks/useReading';
import { useLearnProgress } from '@/lib/hooks/useLearnProgress';
import { buildSections, PrimarySectionConfig } from './navigation';

/**
 * The menu for the signed-in learner, as `buildSections` builds it, with the
 * inputs it needs fetched here. The desktop sidebar and the mobile hub screens
 * both read it, so a task added to the syllabus shows up in both.
 */
export function useNavSections(): PrimarySectionConfig[] {
  const [searchParams] = useSearchParams();
  const { user, activeExam, setIsTutorOpen } = useApp();

  // Reading headings are only worth showing when the bank has something behind
  // them, so the menu is checked against the same list the practice page deals
  // from. Left undefined until it arrives, which shows every heading.
  const readingTypes = useReadingTypes(activeExam, Boolean(user) && activeExam !== 'EPS_TOPIK');
  const availableReadingTypes = useMemo(
    () =>
      readingTypes.data
        ? readingTypes.data.types.filter(type => type.questionCount > 0).map(type => type.typeId)
        : undefined,
    [readingTypes.data],
  );

  const hasMistake = Boolean(searchParams.get('mistake'));
  const { progress: learnProgress } = useLearnProgress();
  return buildSections(
    activeExam,
    () => setIsTutorOpen(true),
    user,
    availableReadingTypes,
    readingTypes.data?.mockPassageCount ?? 0,
    hasMistake,
    learnProgress,
  );
}
