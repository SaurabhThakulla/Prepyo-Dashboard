import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PromptAudio from '@/components/practice/PromptAudio';
import { Question } from '@/lib/types';

/** The question being answered: title, prompt, and any media that comes with it. */
export default function QuestionPrompt({ question }: { question: Question }) {
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
        <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed font-medium">
          {question.prompt}
        </div>
      </div>

      {question.imageUrl && (
        <div className="p-3 bg-background rounded-xl border border-border flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt={question.title}
            loading="lazy"
            decoding="async"
            className="rounded-lg max-h-60 object-cover w-full"
          />
        </div>
      )}

      {/* Real audio when the question has a file, otherwise the script read
          aloud by the browser and labelled as synthesised. */}
      <PromptAudio
        audioUrl={question.audioUrl}
        audioTranscript={question.audioTranscript}
        title={question.title}
      />

      {/* Read Aloud puts the words to say in here, so the passage stays on
          screen while the recorder runs below it. */}
      {question.contextPassage && (
        <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground leading-relaxed max-h-56 overflow-y-auto">
          {question.contextPassage}
        </div>
      )}
    </Card>
  );
}
