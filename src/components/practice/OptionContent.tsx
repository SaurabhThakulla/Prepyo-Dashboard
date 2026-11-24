import React from 'react';
import { QuestionOption } from '@/lib/types';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** Whether every option is a picture, so the choices are laid out as a grid of pictures. */
export const hasPictureOptions = (options?: QuestionOption[]) =>
  Boolean(options?.length) && options!.every(option => Boolean(option.imageUrl));

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const PLAIN_SUPER = '0123456789+−n';

/**
 * Unicode powers and indices (2¹⁰⁰, H₂O) as real <sup> and <sub> of ordinary
 * digits: many reading fonts have no glyphs for the Unicode ones, which then
 * come out tiny or in another font.
 */
function Scripts({ text }: { text: string }) {
  const parts = text.split(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+|[₀₁₂₃₄₅₆₇₈₉]+)/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        if (part && SUPER.includes(part[0])) {
          return <sup key={i} className="text-[0.7em] font-semibold">{[...part].map(c => PLAIN_SUPER[SUPER.indexOf(c)]).join('')}</sup>;
        }
        if (part && SUB.includes(part[0])) {
          return <sub key={i} className="text-[0.7em] font-semibold">{[...part].map(c => SUB.indexOf(c)).join('')}</sub>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Text with `__marked__` runs underlined. EPS-TOPIK's grammar task asks which
 * underlined part is correct, so the underline is part of the question.
 */
export function MarkedText({ text }: { text: string }) {
  const parts = text.split(/(__[^_]+__)/g);
  if (parts.length === 1) return <Scripts text={text} />;
  return (
    <>
      {parts.map((part, i) =>
        /^__[^_]+__$/.test(part) ? (
          <u key={i} className="decoration-2 underline-offset-4">
            <Scripts text={part.slice(2, -2)} />
          </u>
        ) : (
          <Scripts key={i} text={part} />
        ),
      )}
    </>
  );
}

/**
 * What one answer choice shows. A picture option shows its picture and a
 * circled number, as the test paper does; its text is the picture's
 * description for screen readers and is never shown, since for "listen and
 * choose the picture" the text would be the answer.
 */
export default function OptionContent({ option, index }: { option: QuestionOption; index: number }) {
  if (option.imageUrl) {
    return (
      <span className="flex w-full flex-col items-center gap-1.5">
        <img
          src={option.imageUrl}
          alt={option.text}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full max-w-[160px] rounded-lg object-contain"
        />
        <span aria-hidden className="text-sm font-bold text-muted-foreground">
          {CIRCLED[index] ?? index + 1}
        </span>
      </span>
    );
  }
  return (
    <span className="text-foreground font-medium leading-relaxed">
      <MarkedText text={option.text} />
    </span>
  );
}
