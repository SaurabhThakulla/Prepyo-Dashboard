import React, { useEffect, useId, useRef, useState } from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import {
  Building2,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  GraduationCap,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  LucideIcon,
  Mail,
  Palette,
  PenLine,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatExamDate } from '@/lib/dates';
import { ApiError, errorMessage } from '@/lib/api';
import {
  ExamCode,
  fetchSignature,
  InstitutionAccount,
  InstitutionProfile,
  PLANS,
  ReceiptSignature,
  removeSignatureImage,
  saveProfile,
  saveSigner,
  SIGNATURE_IMAGE_URL,
  STUDENT_ALLOWANCE,
  uploadLogo,
  uploadSignature,
} from './api';
import { dashboardPath } from './paths';
import BrandMark from './BrandMark';
import { useConfirm } from './ui';
import {
  BRAND_COLORS,
  branchesLabel,
  CITIES,
  EXAM_CHOICES,
  examName,
  MAX_BRANCHES,
  MAX_LOGO_BYTES,
  studentRangeLabel,
  validCity,
  validColor,
} from './profile';

const CONTACT = 'contact@prepyo.online';
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const STATUS_LABEL = { active: 'Active', expired: 'Ended', none: 'No plan yet' } as const;
const FIELD = 'h-10 rounded-lg text-sm font-normal';

type PanelId = 'details' | 'exams' | 'branding' | 'signature' | 'signin' | 'plan' | 'account';

/** The saved profile as a form starts from: an institution Prepyo created may have gaps. */
function draftOf(profile: InstitutionProfile): InstitutionProfile {
  return {
    exams: [...profile.exams],
    city: profile.city ?? '',
    branches: profile.branches >= 1 ? profile.branches : 1,
    monthlyStudents: profile.monthlyStudents ?? '',
    brandColor: validColor(profile.brandColor ?? '') ? profile.brandColor.toLowerCase() : BRAND_COLORS[0],
  };
}

/**
 * The institution's settings: one card per setting, each opening a panel
 * with just that setting. Details, exams and colour are saved from their
 * panel; a logo is stored as soon as it is chosen; plan and account are
 * shown, as Prepyo changes them.
 */
export default function SettingsSection({
  account,
  onSaved,
}: {
  account: InstitutionAccount;
  onSaved: (account: InstitutionAccount) => void;
}) {
  const { admin, institution } = account;
  const [open, setOpen] = useState<PanelId | null>(null);
  // undefined while loading; the card works without it.
  const [signature, setSignature] = useState<ReceiptSignature | null | undefined>(undefined);

  useEffect(() => {
    fetchSignature()
      .then(data => setSignature(data.signature))
      .catch(() => setSignature(null));
  }, []);
  const profile = draftOf(institution.profile);
  const plan = institution.plan ? PLANS[institution.plan] : null;
  const signInAddress = window.location.origin + dashboardPath(institution.code);

  const place = [profile.city, institution.profile.city ? branchesLabel(profile.branches) : '', studentRangeLabel(profile.monthlyStudents) && `${studentRangeLabel(profile.monthlyStudents)} students a month`]
    .filter(Boolean)
    .join(' · ');

  const tiles: { id: PanelId; icon: LucideIcon; title: string; summary: React.ReactNode }[] = [
    { id: 'details', icon: Building2, title: 'Institution details', summary: place || 'Add your city' },
    { id: 'exams', icon: GraduationCap, title: 'Exams you teach', summary: profile.exams.length ? profile.exams.map(examName).join(', ') : 'Choose the exams you prepare for' },
    {
      id: 'branding',
      icon: Palette,
      title: 'Logo & colour',
      summary: (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: profile.brandColor }} />
          {institution.logoUrl ? 'Logo uploaded' : 'No logo yet'}
        </span>
      ),
    },
    {
      id: 'signature',
      icon: PenLine,
      title: 'Receipt signature',
      summary:
        signature === undefined
          ? 'Loading…'
          : signature?.hasImage
            ? [signature.signerName, signature.signerTitle].filter(Boolean).join(' · ') || 'Signature added'
            : 'Sign your fee receipts',
    },
    { id: 'signin', icon: Link2, title: 'Student sign-in page', summary: signInAddress.replace(/^https?:\/\//, '') },
    {
      id: 'plan',
      icon: CreditCard,
      title: 'Plan',
      summary: plan
        ? `${plan.name} · ${STATUS_LABEL[institution.status] ?? STATUS_LABEL.none}${institution.validUntil ? ` until ${formatExamDate(institution.validUntil)}` : ''}`
        : 'No plan yet',
    },
    { id: 'account', icon: UserRound, title: 'Your account', summary: admin.email },
  ];

  return (
    <>
      <ul className="grid gap-3 lg:grid-cols-2">
        {tiles.map(tile => (
          <li key={tile.id}>
            <button
              type="button"
              onClick={() => setOpen(tile.id)}
              aria-haspopup="dialog"
              className="group flex h-full w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left font-sans transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <tile.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{tile.title}</span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">{tile.summary}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </li>
        ))}
      </ul>

      <SheetPrimitive.Root open={open !== null} onOpenChange={next => !next && setOpen(null)}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          {open && (
            <SheetPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card font-sans shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
              {open === 'details' && <DetailsPanel account={account} onSaved={onSaved} onClose={() => setOpen(null)} />}
              {open === 'exams' && <ExamsPanel account={account} onSaved={onSaved} onClose={() => setOpen(null)} />}
              {open === 'branding' && <BrandingPanel account={account} onSaved={onSaved} onClose={() => setOpen(null)} />}
              {open === 'signature' && <SignaturePanel signature={signature ?? null} onChanged={setSignature} onClose={() => setOpen(null)} />}
              {open === 'signin' && <SignInPanel account={account} address={signInAddress} />}
              {open === 'plan' && <PlanPanel account={account} />}
              {open === 'account' && <AccountPanel account={account} />}
            </SheetPrimitive.Content>
          )}
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
    </>
  );
}

// ---------------------------------------------------------------- receipt signature

const MAX_SIGNATURE_BYTES = 1 << 20;

/** Who signs the fee receipts, and the signature image: uploaded, or drawn here. */
function SignaturePanel({
  signature,
  onChanged,
  onClose,
}: {
  signature: ReceiptSignature | null;
  onChanged: (signature: ReceiptSignature) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(signature?.signerName ?? '');
  const [title, setTitle] = useState(signature?.signerTitle ?? '');
  const [drawing, setDrawing] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const nameId = useId();
  const titleId = useId();
  const dirty = name.trim() !== (signature?.signerName ?? '') || title.trim() !== (signature?.signerTitle ?? '');

  const run = async (change: () => Promise<{ signature: ReceiptSignature }>) => {
    setWorking(true);
    setError(null);
    try {
      const { signature: next } = await change();
      onChanged(next);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setWorking(false);
    }
  };

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError('Please choose a PNG, JPEG or WebP image.');
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      setError('That image is larger than 1 MB. Please choose a smaller one.');
      return;
    }
    void run(() => uploadSignature(file));
  };

  const imageSrc = signature?.hasImage ? `${SIGNATURE_IMAGE_URL}?v=${encodeURIComponent(signature.updatedAt ?? '')}` : null;

  return (
    <>
      <PanelHeader title="Receipt signature" description="Printed above the signatory line on every fee receipt. Only you can see it." />
      <PanelBody>
        {drawing ? (
          <SignaturePad
            busy={working}
            onCancel={() => setDrawing(false)}
            onDone={async blob => {
              if (await run(() => uploadSignature(blob))) setDrawing(false);
            }}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-white">
              {working ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : imageSrc ? (
                <img src={imageSrc} alt="Your receipt signature" className="max-h-28 max-w-[90%] object-contain" />
              ) : (
                <span className="text-sm text-slate-500">No signature yet</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                <ImagePlus className="mr-1.5 h-4 w-4" /> Upload image
              </label>
              <input
                id={inputId}
                type="file"
                accept={LOGO_TYPES.join(',')}
                className="sr-only"
                disabled={working}
                onChange={event => {
                  chooseFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <Button type="button" variant="outline" className="h-9 rounded-lg font-medium" disabled={working} onClick={() => setDrawing(true)}>
                <PenLine className="mr-1.5 h-4 w-4" /> Draw it
              </Button>
              {signature?.hasImage && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-lg font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  disabled={working}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Remove your signature?',
                      description: 'Fee receipts print without it until you add a new one.',
                      confirmLabel: 'Remove signature',
                      tone: 'danger',
                    });
                    if (ok) void run(removeSignatureImage);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">A signature on white or a transparent background looks best. PNG, JPEG or WebP, up to 1 MB.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={nameId} className="font-medium text-foreground">
              Signed by
            </label>
            <Input id={nameId} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Ram Sharma" maxLength={80} className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={titleId} className="font-medium text-foreground">
              Role
            </label>
            <Input id={titleId} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Accounts Officer" maxLength={80} className={FIELD} />
          </div>
        </div>
      </PanelBody>
      <PanelFooter
        dirty={dirty}
        saving={working}
        error={error}
        onCancel={onClose}
        onSave={async () => {
          if (await run(() => saveSigner(name.trim(), title.trim()))) onClose();
        }}
      />
      {confirmDialog}
    </>
  );
}

/** A box to sign in with a mouse, finger or pen; returns the signature as a PNG with a clear background. */
function SignaturePad({ busy, onCancel, onDone }: { busy: boolean; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Size the canvas to its box at the screen's pixel density, so lines stay sharp.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    try {
      // Keeps the stroke going if the pen slips outside the box.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some pointers cannot be captured; drawing still works inside the box.
    }
    drawingRef.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setEmpty(false);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  };

  const finish = () => {
    canvasRef.current?.toBlob(blob => blob && onDone(blob), 'image/png');
  };

  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground">Sign below</p>
      <canvas
        ref={canvasRef}
        aria-label="Signature pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        className="h-36 w-full touch-none rounded-lg border border-border bg-white"
      />
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="ghost" className="h-9 rounded-lg font-medium" onClick={clear} disabled={busy || empty}>
          Clear
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-lg font-medium" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="h-9 rounded-lg font-medium" onClick={finish} disabled={busy || empty}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Use this signature
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the panel frame

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 px-5 pb-2 pt-5">
      <div className="min-w-0 flex-1">
        <SheetPrimitive.Title className="text-base font-semibold text-foreground">{title}</SheetPrimitive.Title>
        <SheetPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</SheetPrimitive.Description>
      </div>
      <SheetPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </div>
  );
}

function PanelBody({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3 text-sm">{children}</div>;
}

function PanelFooter({
  dirty,
  saving,
  error,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2 px-5 pb-5 pt-2">
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="h-9 rounded-lg font-medium">
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={!dirty || saving} className="h-9 rounded-lg font-medium">
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

/**
 * An editable panel's draft and saving. Only the panel's own fields change;
 * the server takes the whole profile, so the rest is sent as saved.
 */
function useProfileDraft(account: InstitutionAccount, onSaved: (account: InstitutionAccount) => void, onClose: () => void) {
  const saved = draftOf(account.institution.profile);
  const [draft, setDraft] = useState<InstitutionProfile>(saved);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (change: Partial<InstitutionProfile>) => setDraft(current => ({ ...current, ...change }));

  const save = async (check: (profile: InstitutionProfile) => Record<string, string>) => {
    const found = check(draft);
    setProblems(found);
    setError(null);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      onSaved(await saveProfile({ ...draft, city: draft.city.trim() }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setProblems(err.fields);
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return { draft, update, problems, saving, error, save, dirty: JSON.stringify(draft) !== JSON.stringify(saved) };
}

// ---------------------------------------------------------------- the panels

function DetailsPanel({ account, onSaved, onClose }: { account: InstitutionAccount; onSaved: (a: InstitutionAccount) => void; onClose: () => void }) {
  const { draft, update, problems, saving, error, save, dirty } = useProfileDraft(account, onSaved, onClose);
  const check = (p: InstitutionProfile) => {
    const found: Record<string, string> = {};
    if (!validCity(p.city)) found.city = 'Enter the city your institution is in.';
    if (!Number.isInteger(p.branches) || p.branches < 1 || p.branches > MAX_BRANCHES) found.branches = `Enter between 1 and ${MAX_BRANCHES} branches.`;
    // The server checks the whole profile; say so here if the exams are not set yet.
    if (p.exams.length === 0) found.exams = 'Choose your exams first, under "Exams you teach".';
    return found;
  };

  return (
    <>
      <PanelHeader title="Institution details" description="Shown on your students' sign-in page." />
      <PanelBody>
        <Field label="Institution name" hint="Contact Prepyo to change the name.">
          <ReadOnly value={account.institution.name} />
        </Field>
        <Field label="City" error={problems.city}>
          {id => (
            <>
              <Input
                id={id}
                list="institution-cities"
                value={draft.city}
                maxLength={60}
                onChange={event => update({ city: event.target.value })}
                placeholder="e.g. Kathmandu"
                aria-invalid={problems.city ? true : undefined}
                className={FIELD}
              />
              <datalist id="institution-cities">
                {CITIES.map(city => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Branches" hint={`Including the main office, up to ${MAX_BRANCHES}.`} error={problems.branches}>
          {id => (
            <Input
              id={id}
              type="number"
              min={1}
              max={MAX_BRANCHES}
              value={Number.isNaN(draft.branches) ? '' : draft.branches}
              onChange={event => update({ branches: event.target.value === '' ? NaN : Number(event.target.value) })}
              aria-invalid={problems.branches ? true : undefined}
              className={`${FIELD} w-32`}
            />
          )}
        </Field>
        <Field label="Students a month" hint="Set by Prepyo. Write to us if it has changed.">
          <ReadOnly value={studentRangeLabel(draft.monthlyStudents) || 'Not set yet'} />
        </Field>
        {problems.exams && <FieldError message={problems.exams} />}
      </PanelBody>
      <PanelFooter dirty={dirty} saving={saving} error={error} onCancel={onClose} onSave={() => void save(check)} />
    </>
  );
}

function ExamsPanel({ account, onSaved, onClose }: { account: InstitutionAccount; onSaved: (a: InstitutionAccount) => void; onClose: () => void }) {
  const { draft, update, problems, saving, error, save, dirty } = useProfileDraft(account, onSaved, onClose);
  const planExams = account.institution.planExams?.length ? account.institution.planExams : EXAM_CHOICES.map(exam => exam.id);
  const toggle = (exam: ExamCode) => update({ exams: draft.exams.includes(exam) ? draft.exams.filter(e => e !== exam) : [...draft.exams, exam] });
  const check = (p: InstitutionProfile) => {
    const found: Record<string, string> = {};
    if (p.exams.length === 0) found.exams = 'Choose at least one exam you teach.';
    if (!validCity(p.city)) found.city = 'Add your city first, under "Institution details".';
    return found;
  };

  return (
    <>
      <PanelHeader title="Exams you teach" description="Shown on your sign-in page. New students start on the first one." />
      <PanelBody>
        <div role="group" aria-label="Exams you teach" className="space-y-2">
          {EXAM_CHOICES.map(choice => {
            const on = draft.exams.includes(choice.id);
            // An exam outside the plan cannot be added; one already chosen can still be removed.
            if (!planExams.includes(choice.id) && !on) {
              return (
                <div key={choice.id} aria-disabled className="flex w-full items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                  <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-muted-foreground">{choice.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Not in your plan.{' '}
                      <a
                        href={`mailto:contact@prepyo.online?subject=${encodeURIComponent(`Add ${choice.name} to our plan`)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Contact Prepyo
                      </a>{' '}
                      for access.
                    </span>
                  </span>
                </div>
              );
            }
            return (
              <button
                key={choice.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(choice.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{choice.name}</span>
                  <span className="block text-muted-foreground">{choice.detail}</span>
                  {!planExams.includes(choice.id) && (
                    <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">Not in your plan. Untick to remove it.</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {problems.exams && <FieldError message={problems.exams} />}
        {problems.city && <FieldError message={problems.city} />}
      </PanelBody>
      <PanelFooter dirty={dirty} saving={saving} error={error} onCancel={onClose} onSave={() => void save(check)} />
    </>
  );
}

function BrandingPanel({ account, onSaved, onClose }: { account: InstitutionAccount; onSaved: (a: InstitutionAccount) => void; onClose: () => void }) {
  const { draft, update, problems, saving, error, save, dirty } = useProfileDraft(account, onSaved, onClose);
  const check = (p: InstitutionProfile) => {
    const found: Record<string, string> = {};
    if (!validColor(p.brandColor)) found.brandColor = 'Choose a brand colour.';
    if (p.exams.length === 0 || !validCity(p.city))
      found.profile = 'Fill in "Institution details" and "Exams you teach" first.';
    return found;
  };

  return (
    <>
      <PanelHeader title="Logo & colour" description="How your students' sign-in page looks." />
      <PanelBody>
        <LogoField account={account} color={draft.brandColor} onSaved={onSaved} />
        <div className="space-y-2">
          <p className="font-medium text-foreground">Brand colour</p>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_COLORS.map(color => {
              const selected = draft.brandColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Colour ${color}`}
                  aria-pressed={selected}
                  onClick={() => update({ brandColor: color })}
                  style={{ backgroundColor: color }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${selected ? 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-card' : ''}`}
                >
                  {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-foreground hover:bg-muted/50">
            <input
              type="color"
              aria-label="Custom colour"
              value={validColor(draft.brandColor) ? draft.brandColor : BRAND_COLORS[0]}
              onChange={event => update({ brandColor: event.target.value.toLowerCase() })}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            Custom
            <span className="font-mono text-xs text-muted-foreground">{draft.brandColor}</span>
          </label>
          {problems.brandColor && <FieldError message={problems.brandColor} />}
          {problems.profile && <FieldError message={problems.profile} />}
        </div>
        <SignInPreview name={account.institution.name} logoUrl={account.institution.logoUrl} color={draft.brandColor} exams={draft.exams} />
      </PanelBody>
      <PanelFooter dirty={dirty} saving={saving} error={error} onCancel={onClose} onSave={() => void save(check)} />
    </>
  );
}

function SignInPanel({ account, address }: { account: InstitutionAccount; address: string }) {
  const { institution } = account;
  return (
    <>
      <PanelHeader title="Student sign-in page" description="Where your students sign in, with the username and password you give them." />
      <PanelBody>
        <Field label="Address">
          <div className="flex gap-2">
            <ReadOnly value={address} mono />
            <CopyButton text={address} />
          </div>
        </Field>
        <Button asChild variant="outline" className="h-9 rounded-lg font-medium">
          <a href={address} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" /> Open the page
          </a>
        </Button>
        <SignInPreview name={institution.name} logoUrl={institution.logoUrl} color={draftOf(institution.profile).brandColor} exams={institution.profile.exams} />
      </PanelBody>
    </>
  );
}

function PlanPanel({ account }: { account: InstitutionAccount }) {
  const { institution } = account;
  const plan = institution.plan ? PLANS[institution.plan] : null;
  const planExams = institution.planExams?.length ? institution.planExams : EXAM_CHOICES.map(exam => exam.id);
  return (
    <>
      <PanelHeader title="Plan" description="Set by Prepyo. Write to us to change it." />
      <PanelBody>
        <dl className="divide-y divide-border rounded-lg border border-border">
          <Fact label="Plan" value={plan ? plan.name : 'No plan yet'} />
          <Fact label="Students" value={`${institution.seatLimit} seats`} />
          <Fact
            label="Status"
            value={`${STATUS_LABEL[institution.status] ?? STATUS_LABEL.none}${
              institution.validUntil ? ` · ${institution.status === 'expired' ? 'ended' : 'until'} ${formatExamDate(institution.validUntil)}` : ''
            }`}
          />
          <Fact label="Exams" value={planExams.map(examName).join(', ')} />
        </dl>
        <p className="text-muted-foreground">Each student gets {STUDENT_ALLOWANCE}.</p>
        <Button asChild variant="outline" className="h-9 rounded-lg font-medium">
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`Plan for ${institution.name}`)}`}>
            <Mail className="mr-1.5 h-4 w-4" /> Contact Prepyo
          </a>
        </Button>
      </PanelBody>
    </>
  );
}

function AccountPanel({ account }: { account: InstitutionAccount }) {
  return (
    <>
      <PanelHeader title="Your account" description="The admin login for this institution." />
      <PanelBody>
        <dl className="divide-y divide-border rounded-lg border border-border">
          <Fact label="Name" value={account.admin.name} />
          <Fact label="Email" value={account.admin.email} />
        </dl>
        <p className="text-muted-foreground">
          To change the email or password, write to{' '}
          <a href={`mailto:${CONTACT}`} className="font-medium text-primary hover:underline">
            {CONTACT}
          </a>
          .
        </p>
      </PanelBody>
    </>
  );
}

// ---------------------------------------------------------------- small parts

/** A labelled field. Pass a function to get the id its control should use. */
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode | ((id: string) => React.ReactNode);
}) {
  const id = useId();
  const control = typeof children === 'function';
  return (
    <div className="min-w-0 space-y-1.5">
      {control ? (
        <label htmlFor={id} className="block font-medium text-foreground">
          {label}
        </label>
      ) : (
        <p className="font-medium text-foreground">{label}</p>
      )}
      {control ? (children as (id: string) => React.ReactNode)(id) : children}
      {error ? <FieldError message={error} /> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
      {message}
    </p>
  );
}

function ReadOnly({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <div className={`flex h-10 min-w-0 flex-1 items-center rounded-lg border border-border bg-muted/40 px-3 text-foreground ${mono ? 'font-mono text-xs' : ''}`}>
      <span className="truncate">{value}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value || '—'}</dd>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the address is on screen to copy by hand.
    }
  };
  return (
    <Button type="button" variant="outline" onClick={() => void copy()} className="h-10 shrink-0 rounded-lg font-medium">
      {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

/** The logo, stored as soon as it is chosen, so it never waits on the colour. */
function LogoField({ account, color, onSaved }: { account: InstitutionAccount; color: string; onSaved: (account: InstitutionAccount) => void }) {
  const { institution } = account;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const inputId = useId();

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (institution.logoUrl) {
      const ok = await confirm({
        title: 'Replace your logo?',
        description: 'The new logo shows on your sign-in page and fee receipts straight away.',
        confirmLabel: 'Replace logo',
      });
      if (!ok) return;
    }
    if (!LOGO_TYPES.includes(file.type)) {
      setError('Please choose a PNG, JPEG or WebP image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('That logo is larger than 2 MB. Please choose a smaller one.');
      return;
    }
    setUploading(true);
    try {
      const { logoUrl } = await uploadLogo(file);
      onSaved({ ...account, institution: { ...institution, logoUrl } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground">Logo</p>
      <div className="flex items-center gap-4">
        {uploading ? (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </span>
        ) : (
          <BrandMark name={institution.name} logoUrl={institution.logoUrl} color={color} className="h-14 w-14 rounded-xl text-base" />
        )}
        <div className="min-w-0 space-y-1">
          <label htmlFor={inputId} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-input bg-background px-3 font-medium text-foreground hover:bg-muted/50">
            <ImagePlus className="mr-1.5 h-4 w-4" />
            {institution.logoUrl ? 'Change logo' : 'Upload logo'}
          </label>
          <input
            id={inputId}
            type="file"
            accept={LOGO_TYPES.join(',')}
            className="sr-only"
            disabled={uploading}
            onChange={event => {
              void choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB. Saved straight away.</p>
        </div>
      </div>
      {error && <FieldError message={error} />}
      {confirmDialog}
    </div>
  );
}

/** How the students' sign-in page looks with these choices. */
function SignInPreview({ name, logoUrl, color, exams }: { name: string; logoUrl?: string; color: string; exams: ExamCode[] }) {
  const tint = validColor(color) ? color : BRAND_COLORS[0];
  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground">Preview</p>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${tint}22, transparent 70%)` }}>
          <BrandMark name={name} logoUrl={logoUrl} color={tint} className="h-10 w-10 rounded-lg text-sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{exams.length ? exams.map(examName).join(' · ') : 'Student sign-in'}</p>
          </div>
        </div>
        <div className="space-y-2 p-4 pt-1">
          <div className="h-9 rounded-lg border border-border bg-muted/40" />
          <div className="h-9 rounded-lg border border-border bg-muted/40" />
          <div className="flex h-9 items-center justify-center rounded-lg text-xs font-medium text-white" style={{ backgroundColor: tint }}>
            Sign in
          </div>
        </div>
      </div>
    </div>
  );
}
