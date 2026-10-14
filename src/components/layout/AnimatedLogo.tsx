import React, { useId } from 'react';
import danfeFaceRaw from '@/assets/danfe-face.svg?raw';
import { cn } from '@/lib/utils';

/**
 * The app's logo, shared with Danfe: he pops in and blinks, then makes way for
 * the Prepyo mark, which pops into place, and back again, about 4s each, on a
 * loop (keyframes in globals.css). With reduced motion turned on, only the
 * mark is shown.
 */
export default function AnimatedLogo({ size = 40, className }: { size?: number; className?: string }) {
  // The SVG's own blink runs on a timer of its own; here the eyelids are
  // driven by CSS so the blinks land while Danfe is showing. The clip path
  // gets an id of its own, as the logo is on the page twice (the sidebar and
  // the phone's top bar).
  const clipId = `danfe-clip-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const svg = danfeFaceRaw
    .replace(/<title>.*?<\/title>/, '')
    .replace(/width="\d+" height="\d+"/, 'width="100%" height="100%" aria-hidden="true"')
    .replace(/bodyclip/g, clipId)
    .replace(/ry="0"( fill="#17A27B")><animate[^>]*\/><\/ellipse>/g, 'ry="28"$1 class="danfe-lid"/>');

  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <span
        aria-hidden
        className="logo-danfe logo-loop absolute inset-0 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="logo-mark logo-loop absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md shadow-primary/25">
        <img
          src="/prepyo-mark.webp"
          alt="Prepyo"
          width={256}
          height={256}
          className="object-contain"
          style={{ width: size * 0.7, height: size * 0.7 }}
        />
      </span>
    </span>
  );
}
