import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookCopy, Download, FileArchive, FileText, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Material, MaterialProvider, MATERIAL_PROVIDERS, materialsFor, providersFor } from '@/data/materials';
import { EXAM_LABELS } from '@/lib/types';

/**
 * Each publisher's cover colours. The covers are Prepyo's own drawing (title
 * and publisher name only), not the publishers' artwork or logos.
 */
const COVER: Record<MaterialProvider, { cover: string; spine: string }> = {
  'ielts-official': { cover: 'from-rose-600 via-red-600 to-red-800', spine: 'bg-red-900/40' },
  'british-council': { cover: 'from-indigo-600 via-blue-700 to-indigo-900', spine: 'bg-indigo-950/40' },
  idp: { cover: 'from-emerald-600 via-teal-700 to-teal-900', spine: 'bg-teal-950/40' },
  cambridge: { cover: 'from-sky-700 via-cyan-800 to-slate-900', spine: 'bg-slate-950/40' },
  pearson: { cover: 'from-violet-600 via-purple-700 to-indigo-900', spine: 'bg-indigo-950/40' },
};

const providerName = (id: MaterialProvider) => MATERIAL_PROVIDERS.find(p => p.id === id)?.name ?? id;

/**
 * A file on the shelf: the cover, then title, what is inside and its size.
 * The link goes straight to the file on the publisher's own server; a ZIP
 * downloads, and a browser usually opens a PDF in a new tab to save.
 */
function BookCard({ material }: { material: Material }) {
  const tone = COVER[material.provider];
  const FileIcon = material.format === 'ZIP' ? FileArchive : FileText;
  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      download
      aria-label={`Download ${material.title}, ${material.format}, ${material.size}, from ${providerName(material.provider)}`}
      className="group flex flex-col gap-2.5 rounded-xl p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* The book: a page block peeking out on the right, then the cover over it. */}
      <div className="relative mr-1.5 transition duration-300 group-hover:-translate-y-1 [perspective:800px]">
        <span
          className="absolute inset-y-1 -right-1.5 left-2 rounded-r-md border border-slate-200 bg-[repeating-linear-gradient(to_bottom,#fff_0,#fff_2px,#e5e7eb_2px,#e5e7eb_3px)] dark:border-slate-600 dark:bg-[repeating-linear-gradient(to_bottom,#e2e8f0_0,#e2e8f0_2px,#94a3b8_2px,#94a3b8_3px)]"
          aria-hidden
        />
        <div
          className={`relative aspect-[5/7] overflow-hidden rounded-l-sm rounded-r-md bg-gradient-to-br ${tone.cover} shadow-[0_6px_16px_-6px_rgba(15,23,42,0.45)] transition duration-300 group-hover:shadow-[0_14px_28px_-10px_rgba(15,23,42,0.55)] dark:bg-zinc-100 dark:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.9)] dark:ring-1 dark:ring-white/10`}
        >
          {/* Spine: a dark strip, a crease and a light edge */}
          <span className="absolute inset-y-0 left-0 w-2.5 bg-black/25 dark:bg-zinc-300" aria-hidden />
          <span className="absolute inset-y-0 left-2.5 w-px bg-white/30 dark:bg-zinc-400" aria-hidden />
          {/* Gloss */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 dark:hidden" aria-hidden />

          <div className="relative flex h-full flex-col py-2.5 pl-4 pr-2.5 text-white dark:text-zinc-900">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-white/90 px-1 py-px text-[8px] font-bold text-slate-800 dark:bg-zinc-900 dark:text-zinc-100">
                <FileIcon className="h-2.5 w-2.5" /> {material.format}
              </span>
              <span className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-white/70 dark:text-zinc-500">{material.exam}</span>
            </div>
            <div className="my-auto border-y border-white/30 py-1.5 dark:border-zinc-400">
              <p className="line-clamp-4 font-serif text-xs font-semibold leading-snug sm:text-[13px]">{material.title}</p>
            </div>
            <span className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-white/75 dark:text-zinc-500">{material.skill}</span>
          </div>
        </div>
      </div>

      <div className="space-y-0.5 px-0.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary">{material.title}</p>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{material.description}</p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Free · {material.size}</span>
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
            aria-hidden
          >
            <Download className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

/** Official sample question files, shown as a shelf, downloaded from the publishers' own sites. */
export default function MaterialsPage() {
  const { activeExam } = useApp();
  const [searchParams] = useSearchParams();
  const providers = providersFor(activeExam);
  const chosen = providers.find(provider => provider.id === searchParams.get('provider'));
  const shelves = (chosen ? [chosen] : providers)
    .map(provider => ({ provider, books: materialsFor(activeExam, provider.id) }))
    .filter(shelf => shelf.books.length > 0);

  if (providers.length === 0) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Card className="p-6 text-sm text-muted-foreground">
          Materials are available for IELTS and PTE. Switch your exam to see them.
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Edge to edge: no gap above or at the sides. */}
      <div className="relative flex min-h-48 items-center overflow-hidden bg-gradient-to-br from-primary to-primary/70 px-4 py-8 text-primary-foreground sm:px-6 sm:py-10 lg:px-8">
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex w-full items-center gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex">
            <BookCopy className="h-7 w-7" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {chosen ? chosen.name : `${EXAM_LABELS[activeExam]} Materials`}
            </h1>
            <p className="text-sm text-primary-foreground/85 sm:text-base">
              {chosen ? chosen.about : 'Official sample questions and guides to download, free from the people who make the exam.'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {shelves.map(({ provider, books }) => (
        <section key={provider.id} className="space-y-3">
          {!chosen && (
            <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h2 className="text-lg font-bold text-foreground">{provider.name}</h2>
                <span className="text-xs text-muted-foreground">{provider.about}</span>
              </div>
              <Link to={`/materials?provider=${provider.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">
                {books.length} {books.length === 1 ? 'file' : 'files'}
              </Link>
            </div>
          )}
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {books.map(material => (
              <BookCard key={material.id} material={material} />
            ))}
          </div>
        </section>
      ))}

      {chosen && (
        <Link to="/materials" className="inline-block text-sm font-semibold text-primary hover:underline">
          See all {EXAM_LABELS[activeExam]} materials
        </Link>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Each file downloads from the publisher's own website, where they share it free. Prepyo is not part of IELTS,
        the British Council, Cambridge or Pearson and does not copy or host their questions.
      </p>
      </div>
    </div>
  );
}
