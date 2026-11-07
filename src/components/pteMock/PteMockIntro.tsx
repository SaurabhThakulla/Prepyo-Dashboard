import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { speechRecognitionSupported } from '@/lib/speech';
import { unlockAudio } from '@/lib/scriptPlayer';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { formatMinutes, pteMockMeta } from '@/lib/pteMock/catalog';
import { useNavigate } from 'react-router-dom';
import { useMockPapers } from '@/lib/hooks/useMockPapers';
import { pteReportHref } from '@/lib/pteMock/catalog';
import { PteCatalogEntry } from '@/lib/pteMock/types';
import { MockPaperItem } from '@/lib/types';
import MockPaperList from '@/components/mocks/MockPaperList';

interface Props {
  entry: PteCatalogEntry;
  /** Whether the server transcribes spoken answers (Whisper). */
  serverTranscription: boolean;
  starting: boolean;
  /** Called with the microphone, opened and checked, when the test has speaking. */
  onStart: (mic: TestMicrophone | null, paperId?: string) => void;
  onAbandon?: () => void;
}

const SECTION_TITLE = 'text-xs font-bold uppercase tracking-wide text-muted-foreground';

/**
 * Before the test: the header, then the numbered tests centred on the page.
 * Starting a test that has speaking opens the microphone first.
 */
export default function PteMockIntro({ entry, serverTranscription, starting, onStart, onAbandon }: Props) {
  const navigate = useNavigate();
  const { data: papers = [], isLoading: papersLoading } = useMockPapers('pte', entry.kind);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  const meta = pteMockMeta(entry.kind);
  const needsMic = entry.tasks.some(t => t.skill === 'speaking' && t.available > 0);
  const [mic, setMic] = useState<TestMicrophone | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const handedOver = useRef(false);

  // A microphone opened here and not taken into the test is closed.
  useEffect(() => () => {
    if (!handedOver.current) mic?.close();
  }, [mic]);

  const handleStartPaper = async (paper: MockPaperItem) => {
    if (starting) return;
    setSelectedPaperId(paper.id);
    let currentMic = mic;
    if (needsMic && !currentMic) {
      unlockAudio();
      if (!TestMicrophone.supported()) {
        setMicError('This browser cannot record audio. Use Chrome or Edge on a computer.');
        return;
      }
      try {
        const m = new TestMicrophone();
        await m.open();
        setMic(m);
        currentMic = m;
      } catch {
        setMicError('Microphone access was refused. Allow the microphone for this site and try again.');
        return;
      }
    }
    handedOver.current = true;
    onStart(currentMic, paper.id);
  };

  const resuming = Boolean(entry.live);
  const cannotScoreSpeech = needsMic && !serverTranscription && !speechRecognitionSupported();
  const warn = 'flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300';

  return (
    <div className="w-full">
      <header className={`bg-gradient-to-r ${meta.accent} px-4 sm:px-8 py-8 text-white`}>
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
            <meta.icon className="h-4 w-4" /> PTE Academic · {entry.fullAllowance ? 'Full test' : 'Sectional test'}
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold">{entry.title}</h1>
          <p className="mt-2 text-sm sm:text-base text-white/85">{entry.description}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <Clock className="h-3.5 w-3.5" /> About {formatMinutes(entry.estimatedMinutes)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <ListChecks className="h-3.5 w-3.5" /> {entry.availableItems} items
            </span>
            {entry.parts.map((p, i) => (
              <span key={p.part} className="rounded-full bg-white/15 px-3 py-1">
                Part {i + 1}: {p.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-4 px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className={SECTION_TITLE}>Numbered tests</h2>
          {resuming && onAbandon && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onAbandon}>
              Discard the open attempt
            </Button>
          )}
        </div>
        {!entry.available && (
          <p className={warn}><AlertTriangle className="h-4 w-4 shrink-0" /> This test cannot be built yet: a part has no questions in the bank.</p>
        )}
        {cannotScoreSpeech && (
          <p className={warn}><AlertTriangle className="h-4 w-4 shrink-0" /> This browser cannot transcribe speech, so spoken answers would score zero. Use Chrome or Edge.</p>
        )}
        {micError && <p role="alert" className={warn}><AlertTriangle className="h-4 w-4 shrink-0" /> {micError}</p>}
        <MockPaperList
          variant="page"
          papers={papers}
          isLoading={papersLoading}
          selectedPaperId={selectedPaperId}
          exam="PTE"
          section={entry.kind}
          onStart={paper => void handleStartPaper(paper)}
          onResume={paper => void handleStartPaper(paper)}
          onReview={paper => {
            const id = paper.lastAttemptSessionId || paper.sessionId;
            if (id) navigate(pteReportHref(id));
          }}
          onRetake={paper => void handleStartPaper(paper)}
        />
      </section>
    </div>
  );
}
