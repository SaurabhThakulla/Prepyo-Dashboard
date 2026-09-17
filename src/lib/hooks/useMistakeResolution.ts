import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

/** Only the server can resolve a mistake; callers supply its graded verdict. */
export function useMistakeResolution(mistakeId?: string) {
  const client = useQueryClient();
  const toast = useToast();
  const [resolved, setResolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const finish = useCallback(async (correct: boolean) => {
    if (!mistakeId) return;
    if (!correct) setResolved(false);
    if (correct && !resolved) {
      setSaving(true);
      try {
        await api.post(`/mistakes/${encodeURIComponent(mistakeId)}/resolve`, {});
        setResolved(true);
        toast.success('Mistake resolved', 'Your correct practice attempt resolved this mistake.');
      } catch (err) {
        toast.error('Could not save resolution', errorMessage(err));
      } finally { setSaving(false); }
    }
    await client.invalidateQueries({ queryKey: ['mistakes'] });
    await client.invalidateQueries({ queryKey: ['dashboard'] });
  }, [client, mistakeId, resolved, toast]);
  return { resolved, saving, finish };
}
