import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, LifeBuoy, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import EnglishVersion from './EnglishVersion';

interface Translation {
  text: string;
  audioUrl?: string;
}

interface KoreanHelpProps {
  questionId: string;
  premium: boolean;
  /** The English already in the review after answering; opens the panel. */
  initial?: Translation;
}

/**
 * The Help button on a Korean question, reading or listening. Premium learners get the
 * English version, written and spoken; everyone else is shown what it is and
 * how to unlock it. The server decides too: the English is only served to
 * premium accounts.
 */
export default function KoreanHelp({ questionId, premium, initial }: KoreanHelpProps) {
  const [state, setState] = useState<'closed' | 'loading' | 'open' | 'upgrade' | 'error'>(initial ? 'open' : 'closed');
  const [translation, setTranslation] = useState<Translation | undefined>(initial);

  const open = async () => {
    if (!premium) {
      setState('upgrade');
      return;
    }
    if (translation) {
      setState('open');
      return;
    }
    setState('loading');
    try {
      const data = await api.get<Translation>(`/questions/${questionId}/translation`);
      setTranslation(data);
      setState('open');
    } catch (error) {
      setState(error instanceof ApiError && error.status === 403 ? 'upgrade' : 'error');
    }
  };

  if (state === 'open' && translation) {
    return <EnglishVersion text={translation.text} audioUrl={translation.audioUrl || undefined} />;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={state === 'upgrade' ? () => setState('closed') : open}
        disabled={state === 'loading'}
        aria-expanded={state === 'upgrade'}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
      >
        {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LifeBuoy className="h-3.5 w-3.5 text-primary" />}
        Help in English
        {!premium && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Premium" />}
      </button>

      {state === 'error' && (
        <p role="alert" className="text-xs text-destructive">The English version couldn't load. Please try again.</p>
      )}

      {state === 'upgrade' && (
        <div role="region" aria-label="Upgrade to use Help in English" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <Crown className="h-4 w-4" /> Help in English is a Premium feature
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            Stuck on a question? Premium shows every Korean question in English, with its choices, and reads it
            aloud, so you can check your understanding as you practise.
          </p>
          <Link
            to="/subscription"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Upgrade to use it <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
