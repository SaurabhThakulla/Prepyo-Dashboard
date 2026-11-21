import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { JLPT_LEVELS, jlptLevelOf, type JLPTLevel } from '@/lib/types';

/**
 * The learner picks their own JLPT level on Home, so no admin or institution
 * has to set it. Practice and progress then follow that level only.
 */
export default function JLPTLevelSwitch() {
  const { user, updateProfile } = useApp();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const current = jlptLevelOf(user);

  const choose = async (level: JLPTLevel) => {
    if (level === current || saving) return;
    setSaving(true);
    try {
      await updateProfile({ jlptLevel: level });
      // Questions and progress cached for the other level are no longer theirs.
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error('Could not change your level', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="group" aria-label="JLPT level" className="inline-flex rounded-xl bg-white/15 p-1 backdrop-blur-sm">
      {JLPT_LEVELS.map(level => (
        <button
          key={level}
          type="button"
          aria-pressed={level === current}
          disabled={saving}
          onClick={() => void choose(level)}
          className={`min-w-[3.5rem] rounded-lg px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-70 ${
            level === current ? 'bg-white text-primary shadow-sm' : 'text-white/85 hover:bg-white/10'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
