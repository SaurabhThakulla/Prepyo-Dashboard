import React, { useId, useState } from 'react';
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
  LucideIcon,
  Mail,
  Palette,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatExamDate } from '@/lib/dates';
import { ApiError, errorMessage } from '@/lib/api';
import { ExamCode, InstitutionAccount, InstitutionProfile, PLANS, saveProfile, STUDENT_ALLOWANCE, uploadLogo } from './api';
import { dashboardPath } from './paths';
import BrandMark from './BrandMark';
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

type PanelId = 'details' | 'exams' | 'branding' | 'signin' | 'plan' | 'account';

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
      <ul className="mx-auto flex max-w-3xl flex-col gap-3">
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
            <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card font-sans shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
              {open === 'details' && <DetailsPanel account={account} onSaved={onSaved} onClose={() => setOpen(null)} />}
              {open === 'exams' && <ExamsPanel account={account} onSaved={onSaved} onClose={() => setOpen(null)} />}
              {open === 'branding' && <BrandingPanel account={account} onSaved={onSaved} onClose={() => setOpen(null)} />}
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

// ---------------------------------------------------------------- the panel frame

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-6 py-5">
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
  return <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">{children}</div>;
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
    <div className="space-y-2 border-t border-border px-6 py-4">
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
                  {!planExams.includes(choice.id) && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">Not in your plan yet</span>}
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
  const inputId = useId();

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
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
