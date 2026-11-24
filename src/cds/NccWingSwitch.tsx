import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { NccWing, cdsApi } from './cdsApi';
import { NCC_WINGS, cdsKeys, useNccWing } from './cdsShared';

/**
 * The cadet picks their NCC wing on Home, as CDS learners pick their academy:
 * the common subjects are the same, the wing decides the specialised ones.
 */
export default function NccWingSwitch() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const current = useNccWing(true);
  const [saving, setSaving] = useState(false);

  const choose = async (wing: NccWing) => {
    if (wing === current || saving) return;
    setSaving(true);
    try {
      await cdsApi.setWing(wing);
      queryClient.setQueryData(cdsKeys.track, (prev: object | undefined) => ({ ...prev, wing }));
    } catch (err) {
      toast.error('Could not change your NCC wing', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="group" aria-label="NCC wing" className="inline-flex rounded-xl bg-white/15 p-1 backdrop-blur-sm">
      {NCC_WINGS.map(wing => (
        <button
          key={wing.id}
          type="button"
          aria-pressed={wing.id === current}
          title={wing.detail}
          disabled={saving}
          onClick={() => void choose(wing.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-70 ${
            wing.id === current ? 'bg-white text-primary shadow-sm' : 'text-white/85 hover:bg-white/10'
          }`}
        >
          {wing.label}
        </button>
      ))}
    </div>
  );
}
