import React from 'react';
import { BookOpen, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ReadingPassage } from '@/lib/types';

interface PassageReaderProps {
  passage: ReadingPassage;
  /** Caps the height and scrolls, so the questions stay beside it on a mock. */
  scroll?: boolean;
}

/**
 * The passage, with its paragraph labels shown.
 *
 * The labels are not decoration. A Matching Information answer *is* a paragraph
 * label and a Find the Writer answer is a source label, so hiding them would
 * make those questions unanswerable.
 */
export default function PassageReader({ passage, scroll = true }: PassageReaderProps) {
  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="indigo" className="gap-1">
            <BookOpen className="w-3 h-3" />
            {passage.exam} Reading
          </Badge>
          <span className="text-[11px] text-muted-foreground font-medium">
            {passage.difficulty.toUpperCase()} • {passage.wordCount} words
            {passage.topic ? ` • ${passage.topic}` : ''}
          </span>
        </div>
        <h2 className="font-display font-bold text-lg text-foreground">{passage.title}</h2>
        {passage.subtitle && <p className="text-xs text-muted-foreground">{passage.subtitle}</p>}
      </div>

      <div className={scroll ? 'space-y-3 max-h-[32rem] overflow-y-auto pr-1' : 'space-y-3'}>
        {passage.paragraphs.map(paragraph => (
          <div key={paragraph.label} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
              {paragraph.label}
            </span>
            <p className="text-xs text-foreground leading-relaxed">{paragraph.text}</p>
          </div>
        ))}

        {passage.sources && passage.sources.length > 0 && (
          <div className="pt-3 mt-3 border-t border-border space-y-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
              <Users className="w-3 h-3" /> Commentaries
            </span>
            {passage.sources.map(source => (
              <div key={source.label} className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[11px] font-bold text-primary">{source.label}</span>
                <p className="text-xs text-foreground leading-relaxed">{source.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
