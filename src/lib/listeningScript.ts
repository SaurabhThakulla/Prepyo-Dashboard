/**
 * Listening scripts as the browser's voice reads them.
 *
 * Scripts for dialogues are written as "Receptionist: … Caller: …". Read
 * straight through, the synthetic voice would say the labels aloud and give
 * every speaker the same voice, so a conversation sounds like one person
 * reading a play. The script is split into turns here, the labels are dropped,
 * and each speaker gets their own voice, from a different English accent where
 * the device has one (IELTS uses British, Australian, New Zealand and North
 * American voices, among others).
 */

export interface ScriptTurn {
  /** The speaker's label, or null for a script with no labelled speakers. */
  speaker: string | null;
  text: string;
}

// A label is one or two capitalised words and a colon, at the start of the
// script or after the end of a sentence. Korean scripts label speakers the way
// EPS-TOPIK's do, with a short Hangul word: "남: … 여: …" (man, woman), and
// Japanese ones with a short kanji or kana word: "男: … 女: …", a turn a line.
const SPEAKER = '[A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?|[가-힣]{1,4}|[一-龯ぁ-ん]{1,4}';
const LABEL = new RegExp(`(?:^|(?<=[.!?]["”’)]?)\\s+|\\n+)(${SPEAKER}):\\s+`, 'g');
const OPENS_WITH_LABEL = new RegExp(`^(?:${SPEAKER}):\\s`);

/** Splits a script into turns. Scripts that do not open with a label are one turn. */
export function splitTurns(script: string): ScriptTurn[] {
  const text = script.trim();
  if (!text) return [];
  if (!OPENS_WITH_LABEL.test(text)) {
    return [{ speaker: null, text }];
  }

  const turns: ScriptTurn[] = [];
  const matches = [...text.matchAll(LABEL)];
  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    const spoken = text.slice(start, end).trim();
    if (spoken) turns.push({ speaker: match[1], text: spoken });
  });
  return turns.length ? turns : [{ speaker: null, text }];
}

// Accents in the order they are handed out, so the first two speakers of a
// dialogue sound as different as the device allows.
const ACCENT_ORDER = ['en-GB', 'en-AU', 'en-US', 'en-NZ', 'en-IE', 'en-CA', 'en-ZA', 'en-IN'];

export type ScriptLanguage = 'en' | 'ko' | 'ja';

/**
 * The language a script is read in: Japanese if it has any kana, Korean if it
 * has any Hangul, else English.
 */
export function scriptLanguage(script: string): ScriptLanguage {
  if (/[ぁ-んァ-ン]/.test(script)) return 'ja';
  return /[가-힣]/.test(script) ? 'ko' : 'en';
}

/** The voice language to fall back on when no voice was assigned. */
export const FALLBACK_LANG: Record<ScriptLanguage, string> = { en: 'en-GB', ko: 'ko-KR', ja: 'ja-JP' };

/**
 * Chooses a voice for each speaker, in order of first appearance: a new accent
 * for each where possible, then another voice of an accent already used. Only
 * voices of the script's language are used; an English voice reading Korean
 * says nothing a learner can use.
 */
export function assignVoices<V extends { lang: string; name: string }>(
  speakers: (string | null)[],
  voices: V[],
  language: ScriptLanguage = 'en',
): Map<string | null, V | undefined> {
  const matching = voices.filter(voice => voice.lang.toLowerCase().startsWith(language));
  const ranked = [...matching].sort((a, b) => rank(a.lang) - rank(b.lang));
  const byAccent: V[] = [];
  const seenAccents = new Set<string>();
  for (const voice of ranked) {
    const accent = voice.lang.toLowerCase().replace('_', '-');
    if (!seenAccents.has(accent)) {
      seenAccents.add(accent);
      byAccent.push(voice);
    }
  }
  const rest = ranked.filter(voice => !byAccent.includes(voice));
  const pool = [...byAccent, ...rest];

  const assigned = new Map<string | null, V | undefined>();
  for (const speaker of speakers) {
    if (assigned.has(speaker)) continue;
    assigned.set(speaker, pool.length ? pool[assigned.size % pool.length] : undefined);
  }
  return assigned;
}

function rank(lang: string): number {
  const normalised = lang.replace('_', '-').toLowerCase();
  const index = ACCENT_ORDER.findIndex(accent => normalised.startsWith(accent.toLowerCase()));
  return index === -1 ? ACCENT_ORDER.length : index;
}

/**
 * Cuts text into sentences short enough to speak one at a time. Chrome stops
 * long utterances part-way, so a whole paragraph is never one utterance;
 * sentences over `max` characters are cut again at commas, then spaces.
 */
export function splitSentences(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length <= max) {
      out.push(sentence);
      continue;
    }
    let current = '';
    for (const word of sentence.split(/\s+/)) {
      if (current && current.length + word.length + 1 > max) {
        out.push(current);
        current = '';
      }
      current = current ? `${current} ${word}` : word;
    }
    if (current) out.push(current);
  }
  return out;
}
