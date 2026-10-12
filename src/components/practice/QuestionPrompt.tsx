import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PromptAudio from '@/components/practice/PromptAudio';
import QuestionFigure from '@/components/practice/QuestionFigure';
import { Question, Blank, listeningPlays } from '@/lib/types';
import { isWordHighlightTask } from '@/lib/listening';
import InlineBlankPassage, { passageHasGaps } from '@/components/practice/InlineBlankPassage';

interface QuestionPromptProps {
  question: Question;
  blankResponses?: Record<string, string>;
  onBlankChange?: (responses: Record<string, string>) => void;
  disabled?: boolean;
  reviewBlanks?: Blank[];
  /** Offer the audio script, which gives the answer away until the question is submitted. */
  allowTranscript?: boolean;
  /** The script from the review response, for items that do not carry one. */
  reviewTranscript?: string;
}

/** The question being answered: title, prompt, and any media that comes with it. */
export default function QuestionPrompt({
  question,
  blankResponses = {},
  onBlankChange,
  disabled = false,
  reviewBlanks,
  allowTranscript = false,
  reviewTranscript,
}: QuestionPromptProps) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="default">{question.typeName}</Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {question.difficulty.toUpperCase()} • {question.points} Points
          </span>
        </div>

        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3 text-primary" />
          {Math.round(question.timeLimitSeconds / 60)} min
        </Badge>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-foreground">{question.title}</h3>
        <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed font-medium whitespace-pre-line">
          {question.prompt}
        </div>
      </div>

      {/* The same frame as the practice page, so a figure sits identically
          whichever screen renders it. */}
      {question.imageUrl && <QuestionFigure src={question.imageUrl} alt={question.title} />}

      {/* Real audio when the question has a file, otherwise the script read
          aloud by the browser and labelled as synthesised. */}
      <PromptAudio
        key={question.id}
        questionId={question.id}
        audioUrl={question.audioUrl}
        audioTranscript={reviewTranscript ?? question.audioTranscript}
        scriptOnRequest={question.scriptOnRequest}
        singlePlay={(question.exam === 'IELTS' || question.exam === 'EPS_TOPIK') && question.skill === 'listening'}
        repeat={listeningPlays(question)}
        title={question.title}
        allowTranscript={allowTranscript}
      />

      {/* Read Aloud puts the words to say in here, so the passage stays on
          screen while the recorder runs below it. */}
      {question.contextPassage && !isWordHighlightTask(question) && (
        passageHasGaps(question.contextPassage) ? (
          <InlineBlankPassage
            passage={question.contextPassage}
            blanks={question.blanks}
            responses={blankResponses}
            disabled={disabled}
            reviewBlanks={reviewBlanks}
            onChange={onBlankChange ?? (() => {})}
          />
        ) : (
          <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed max-h-56 overflow-y-auto">
            {question.contextPassage}
          </div>
        )
      )}
    </Card>
  );
}
