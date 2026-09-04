import React, { useState } from 'react';
import { BookOpen, Clock, FileText, Type, Users, ZoomIn, ZoomOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ReadingPassage } from '@/lib/types';

interface PassageReaderProps {
  passage: ReadingPassage;
  /** Caps the height and scrolls, so the questions stay beside it on a mock. */
  scroll?: boolean;
}

type TextSize = 'sm' | 'base' | 'lg';

const FONT_CLASSES: Record<TextSize, { body: string; label: string; line: string }> = {
  sm: { body: 'text-sm leading-6', label: 'text-xs', line: 'space-y-3.5' },
  base: { body: 'text-[15px] sm:text-base leading-7', label: 'text-xs sm:text-sm', line: 'space-y-4 sm:space-y-5' },
  lg: { body: 'text-base sm:text-lg leading-8', label: 'text-sm sm:text-base', line: 'space-y-5 sm:space-y-6' },
};

/**
 * Enhanced passage reader with optimized readability, custom text sizing,
 * clear paragraph anchors, and high-contrast typography.
 */
export default function PassageReader({ passage, scroll = true }: PassageReaderProps) {
  const [textSize, setTextSize] = useState<TextSize>('base');

  const estimatedMinutes = Math.max(1, Math.ceil((passage.wordCount || 500) / 200));

  const cycleTextSize = (direction: 'up' | 'down') => {
    const order: TextSize[] = ['sm', 'base', 'lg'];
    const currentIndex = order.indexOf(textSize);
    if (direction === 'up' && currentIndex < order.length - 1) {
      setTextSize(order[currentIndex + 1]);
    } else if (direction === 'down' && currentIndex > 0) {
      setTextSize(order[currentIndex - 1]);
    }
  };

  const currentStyles = FONT_CLASSES[textSize];

  return (
    <Card className="p-5 sm:p-7 space-y-5 bg-card dark:bg-[#0f141f] border-border/80 shadow-md rounded-2xl">
      {/* Passage Top Header Bar */}
      <div className="space-y-3 border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1.5 px-2.5 py-0.5 text-xs font-bold shadow-xs">
              <BookOpen className="w-3.5 h-3.5" />
              {passage.exam} Reading
            </Badge>

            {passage.difficulty && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                {passage.difficulty}
              </span>
            )}

            {passage.topic && (
              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/15">
                {passage.topic}
              </span>
            )}
          </div>

          {/* Reading Metadata & Text Size Controls */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline-flex items-center gap-1 font-medium">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              {passage.wordCount} words
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              ~{estimatedMinutes} min read
            </span>

            {/* Font Size Toolbar */}
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-white/[0.04] p-1 rounded-xl border border-border/70">
              <button
                type="button"
                onClick={() => cycleTextSize('down')}
                disabled={textSize === 'sm'}
                aria-label="Decrease text size"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Smaller text"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-mono font-bold px-1 text-foreground/80 select-none">
                {textSize.toUpperCase()}
              </span>

              <button
                type="button"
                onClick={() => cycleTextSize('up')}
                disabled={textSize === 'lg'}
                aria-label="Increase text size"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Larger text"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5 pt-1">
          <h2 className="font-display font-black text-xl sm:text-2xl text-foreground tracking-tight leading-snug">
            {passage.title}
          </h2>
          {passage.subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
              {passage.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Paragraphs Container */}
      <div
        className={
          scroll
            ? `${currentStyles.line} max-h-[36rem] overflow-y-auto pr-2 scrollbar-thin`
            : currentStyles.line
        }
      >
        {passage.paragraphs.map(paragraph => (
          <div
            key={paragraph.label}
            className="group relative flex gap-3.5 sm:gap-4.5 p-3 sm:p-4 rounded-xl hover:bg-muted/40 dark:hover:bg-white/[0.02] border border-transparent hover:border-border/50 transition-colors"
          >
            {/* Distinct Paragraph Letter Badge */}
            <span
              className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-mono font-black ${currentStyles.label} flex items-center justify-center bg-primary/10 text-primary border border-primary/25 shadow-xs select-none group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all`}
              title={`Paragraph ${paragraph.label}`}
            >
              {paragraph.label}
            </span>

            {/* Paragraph Text with generous readable spacing */}
            <p
              className={`flex-1 text-foreground/95 dark:text-zinc-200 font-normal tracking-normal selection:bg-primary/20 ${currentStyles.body}`}
            >
              {paragraph.text}
            </p>
          </div>
        ))}

        {/* Sources / Commentaries (e.g. Find the Writer) */}
        {passage.sources && passage.sources.length > 0 && (
          <div className="pt-4 mt-6 border-t border-border/80 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Users className="w-4 h-4 text-primary" />
              <span>Commentaries &amp; Sources</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {passage.sources.map(source => (
                <div
                  key={source.label}
                  className="p-4 rounded-xl bg-muted/30 dark:bg-white/[0.02] border-l-4 border-l-primary border-y border-r border-border space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      {source.label}
                    </span>
                  </div>
                  <p className={`text-foreground/90 dark:text-zinc-200 font-normal ${currentStyles.body}`}>
                    {source.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
