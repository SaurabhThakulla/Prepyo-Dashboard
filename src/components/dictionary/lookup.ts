// Free English dictionary from Wiktionary's public API: no key, no cost to us.
const API = 'https://en.wiktionary.org/api/rest_v1/page/definition/';

export interface DictionaryEntry {
  word: string;
  baseWord?: string;
  definitions: { partOfSpeech: string; text: string }[];
  examples: string[];
}

interface ApiSense { definition?: string; examples?: string[] }
interface ApiUsage { partOfSpeech?: string; definitions?: ApiSense[] }
type ApiResponse = { en?: ApiUsage[] };

const MAX_ITEMS = 5;
const cache = new Map<string, Promise<DictionaryEntry | null>>();

/** A single English word worth looking up, without punctuation, or null. */
export function cleanWord(raw: string): string | null {
  const word = raw.trim().replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
  return /^[A-Za-z][A-Za-z'-]{1,29}$/.test(word) ? word : null;
}

function text(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** The word a "form of" sense points to ("present participle of drive" → drive). */
function baseOf(html: string): string | undefined {
  const href = new DOMParser().parseFromString(html, 'text/html')
    .querySelector('.form-of-definition-link a[href^="/wiki/"]')?.getAttribute('href');
  return href ? cleanWord(decodeURIComponent(href.slice(6).split('#')[0])) ?? undefined : undefined;
}

export function toEntry(word: string, data: ApiResponse): DictionaryEntry | null {
  const definitions: DictionaryEntry['definitions'] = [];
  const examples: string[] = [];
  let baseWord: string | undefined;
  for (const usage of data.en ?? []) {
    for (const sense of usage.definitions ?? []) {
      const def = text(sense.definition ?? '');
      if (!def) continue;
      baseWord ??= baseOf(sense.definition ?? '');
      if (definitions.length < MAX_ITEMS) definitions.push({ partOfSpeech: (usage.partOfSpeech ?? '').toLowerCase(), text: def });
      for (const ex of sense.examples ?? []) {
        const t = text(ex);
        if (t && examples.length < MAX_ITEMS) examples.push(t);
      }
    }
  }
  if (definitions.length === 0) return null;
  return { word, baseWord: baseWord !== word ? baseWord : undefined, definitions, examples };
}

async function fetchPage(word: string): Promise<DictionaryEntry | null> {
  const res = await fetch(API + encodeURIComponent(word));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`dictionary ${res.status}`);
  return toEntry(word, (await res.json()) as ApiResponse);
}

// Page names are case-sensitive: "Monday" lives under its capital, "Driving" under "driving".
async function fetchEntry(word: string): Promise<DictionaryEntry | null> {
  const lower = word.toLowerCase();
  return (await fetchPage(lower)) ?? (lower !== word ? fetchPage(word) : null);
}

async function fetchWithBase(word: string): Promise<DictionaryEntry | null> {
  const entry = await fetchEntry(word);
  if (!entry?.baseWord) return entry;
  // Add the base word's meanings, since "plural of X" alone does not help a learner.
  const base = await fetchEntry(entry.baseWord).catch(() => null);
  if (!base) return entry;
  return {
    ...entry,
    definitions: [...entry.definitions, ...base.definitions].slice(0, MAX_ITEMS + 1),
    examples: [...entry.examples, ...base.examples].slice(0, MAX_ITEMS),
  };
}

/** Looks a word up once per page load. */
export function lookUp(word: string): Promise<DictionaryEntry | null> {
  let hit = cache.get(word);
  if (!hit) {
    hit = fetchWithBase(word);
    hit.catch(() => cache.delete(word));
    cache.set(word, hit);
  }
  return hit;
}
