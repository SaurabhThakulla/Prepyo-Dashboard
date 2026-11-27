import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { CdsTrack, cdsApi } from './cdsApi';
import { CDS_TRACKS, cdsKeys, useCdsTrack } from './cdsShared';

/**
 * The learner picks their CDS route on Home, as JLPT learners pick N5 or N4:
 * IMA, INA and AFA sit three papers, OTA two (no Maths). Practice, mocks and
 * Home then show only that route's papers.
 */
export default function CdsTrackSwitch() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const current = useCdsTrack(true);
  const [saving, setSaving] = useState(false);

  const choose = async (track: CdsTrack) => {
    if (track === current || saving) return;
    setSaving(true);
    try {
      await cdsApi.setTrack(track);
      // The route only; the NCC certificate stays as saved.
      queryClient.setQueryData(cdsKeys.track, (prev: object | undefined) => ({ ...prev, track }));
    } catch (err) {
      toast.error('Could not change your CDS route', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="group" aria-label="CDS academy" className="inline-flex rounded-xl bg-[#000080]/10 dark:bg-white/15 p-1 backdrop-blur-sm">
      {CDS_TRACKS.map(track => (
        <button
          key={track.id}
          type="button"
          aria-pressed={track.id === current}
          title={track.detail}
          disabled={saving}
          onClick={() => void choose(track.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-70 ${
            track.id === current ? 'bg-[#000080] text-white dark:bg-white dark:text-primary shadow-sm' : 'text-[#000080]/85 hover:bg-[#000080]/10 dark:text-white/85 dark:hover:bg-white/10'
          }`}
        >
          {track.label}
        </button>
      ))}
    </div>
  );
}
