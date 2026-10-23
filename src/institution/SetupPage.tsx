import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, Check, GraduationCap, ImageUp, Loader2, LogOut, MapPin, Minus, Palette, Plus, Users, X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api';
import { ExamCode, InstitutionAccount, InstitutionProfile, saveProfile, uploadLogo } from './api';
import BrandMark from './BrandMark';
import { dashboardPath } from './paths';
import {
  BRAND_COLORS, CITIES, EMPTY_PROFILE, EXAM_CHOICES, MAX_BRANCHES, MAX_LOGO_BYTES, STUDENT_RANGES,
  branchesLabel, examName, studentRangeLabel, validCity, validColor,
} from './profile';

const STEPS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'exams', label: 'Exams you teach', icon: GraduationCap },
  { id: 'location', label: 'City & branches', icon: MapPin },
  { id: 'students', label: 'Student numbers', icon: Users },
  { id: 'brand', label: 'Logo & colour', icon: Palette },
  { id: 'review', label: 'Review', icon: Check },
];

interface Props {
  account: InstitutionAccount;
  onSaved: (account: InstitutionAccount) => void;
  /** Given when editing a finished setup; a first setup cannot be skipped. */
  onCancel?: () => void;
  onSignOut?: () => void;
}

/** The setup an institution finishes before its dashboard opens, and edits later from it. */
export default function SetupPage({ account, onSaved, onCancel, onSignOut }: Props) {
  const { institution } = account;
  const editing = Boolean(onCancel);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<InstitutionProfile>(() =>
    institution.onboarded ? { ...institution.profile } : { ...EMPTY_PROFILE, ...pickFilled(institution.profile) },
  );
  const [cityChoice, setCityChoice] = useState<string>(() =>
    !profile.city || CITIES.includes(profile.city) ? profile.city : 'other',
  );
  const [logoUrl, setLogoUrl] = useState(institution.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus({ preventScroll: true }), [step]);

  const update = (changes: Partial<InstitutionProfile>) => setProfile(previous => ({ ...previous, ...changes }));
  const current = STEPS[step];

  const canContinue = (() => {
    switch (current.id) {
      case 'exams':
        return profile.exams.length > 0;
      case 'location':
        return validCity(profile.city) && profile.branches >= 1 && profile.branches <= MAX_BRANCHES;
      case 'students':
        return profile.monthlyStudents !== '';
      case 'brand':
        return validColor(profile.brandColor) && !uploading;
      default:
        return true;
    }
  })();

  const toggleExam = (id: ExamCode) =>
    update({
      exams: profile.exams.includes(id) ? profile.exams.filter(exam => exam !== id) : [...profile.exams, id],
    });

  const chooseLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError('Please choose a PNG, JPEG or WebP image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('That logo is larger than 512 KB. Please choose a smaller one.');
      return;
    }
    setUploading(true);
    try {
      setLogoUrl((await uploadLogo(file)).logoUrl);
    } catch (err) {
      setLogoError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      onSaved(await saveProfile({ ...profile, city: profile.city.trim() }));
    } catch (err) {
      setSaveError(err instanceof ApiError && err.fields ? Object.values(err.fields).join(' ') : errorMessage(err));
      setSaving(false);
    }
  };

  const next = () => (step === STEPS.length - 1 ? void finish() : setStep(step + 1));

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:flex-row">
      <aside className="hidden w-[300px] shrink-0 flex-col border-r border-border bg-card px-6 py-7 lg:flex">
        <div className="flex items-center gap-2">
          <img src="/prepyo-mark.webp" alt="" width={32} height={32} className="h-8 w-8 rounded-xl bg-white object-contain shadow-sm" />
          <span className="font-display text-lg font-black">
            prep<span className="text-primary">yo</span>
          </span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <Building2 className="h-3 w-3" />
            Institution
          </span>
        </div>

        <ol className="mt-10 space-y-1">
          {STEPS.map((item, index) => {
            const done = index < step;
            const now = index === step;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    now ? 'bg-primary/10 font-bold text-primary' : done ? 'font-semibold text-foreground hover:bg-muted' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      done ? 'border-primary bg-primary text-primary-foreground' : now ? 'border-primary text-primary' : 'border-border'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-auto space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your students will see</p>
          <SignInPreview name={institution.name} code={institution.code} profile={profile} logoUrl={logoUrl} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-5 py-3.5 backdrop-blur sm:px-10">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">
                {editing ? 'Edit your institution' : `Set up ${institution.name}`}
                <span className="font-semibold text-muted-foreground"> · Step {step + 1} of {STEPS.length}</span>
              </p>
              <div className="mt-2 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
                {STEPS.map((item, index) => (
                  <span key={item.id} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
            </div>
            {onCancel ? (
              <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-full text-xs font-bold">
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
            ) : (
              onSignOut && (
                <Button variant="ghost" size="sm" onClick={onSignOut} className="rounded-full text-xs font-bold text-muted-foreground">
                  <LogOut className="mr-1 h-3.5 w-3.5" /> Sign out
                </Button>
              )
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-10 sm:py-12">
          <div key={current.id} className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 duration-300">
            {current.id === 'exams' && (
              <>
                <Heading
                  headingRef={headingRef}
                  eyebrow={editing ? undefined : `Welcome, ${account.admin.name.split(' ')[0]}`}
                  title="Which exams do you prepare students for?"
                  text="Choose every one you teach. Your dashboard and student sign-in page show them."
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  {EXAM_CHOICES.map(exam => {
                    const selected = profile.exams.includes(exam.id);
                    return (
                      <button
                        key={exam.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleExam(exam.id)}
                        style={selected ? { borderColor: exam.accent, boxShadow: `0 0 0 3px ${exam.accent}22` } : undefined}
                        className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-display text-xl font-bold">{exam.name}</span>
                          <CheckBox on={selected} color={exam.accent} />
                        </span>
                        <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{exam.detail}</span>
                        <span aria-hidden className="mt-4 h-1 w-10 rounded-full" style={{ backgroundColor: exam.accent }} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {current.id === 'location' && (
              <>
                <Heading headingRef={headingRef} title="Where are you based?" text="Your main city, and how many branches you run." />
                <fieldset className="space-y-3">
                  <legend className="mb-3 text-sm font-bold">City</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...CITIES, 'other'].map(city => {
                      const selected = cityChoice === city;
                      return (
                        <button
                          key={city}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setCityChoice(city);
                            update({ city: city === 'other' ? '' : city });
                          }}
                          className={`h-9 rounded-full border px-4 text-sm font-semibold transition-colors ${
                            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          {city === 'other' ? 'Somewhere else' : city}
                        </button>
                      );
                    })}
                  </div>
                  {cityChoice === 'other' && (
                    <input
                      autoFocus
                      aria-label="Your city"
                      placeholder="Type your city"
                      maxLength={60}
                      value={profile.city}
                      onChange={event => update({ city: event.target.value })}
                      className="h-11 w-full max-w-sm rounded-xl border border-input bg-card px-4 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                  <div>
                    <p className="text-sm font-bold">Branches</p>
                    <p className="text-xs text-muted-foreground">Count your main office as one. All branches share one account.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StepButton label="Fewer branches" disabled={profile.branches <= 1} onClick={() => update({ branches: profile.branches - 1 })}>
                      <Minus className="h-4 w-4" />
                    </StepButton>
                    <span className="min-w-[3ch] text-center font-display text-3xl font-black tabular-nums" aria-live="polite">
                      {profile.branches}
                    </span>
                    <StepButton label="More branches" disabled={profile.branches >= MAX_BRANCHES} onClick={() => update({ branches: profile.branches + 1 })}>
                      <Plus className="h-4 w-4" />
                    </StepButton>
                  </div>
                </div>
              </>
            )}

            {current.id === 'students' && (
              <>
                <Heading
                  headingRef={headingRef}
                  title="How many students do you prepare each month?"
                  text="A rough number is fine. It helps us suggest the right number of student seats; you start free with 2."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {STUDENT_RANGES.map((range, index) => {
                    const selected = profile.monthlyStudents === range.id;
                    return (
                      <button
                        key={range.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => update({ monthlyStudents: range.id })}
                        className={`flex items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 ${
                          selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-foreground/20'
                        }`}
                      >
                        <span aria-hidden className="flex h-11 items-end gap-1">
                          {[0, 1, 2, 3].map(bar => (
                            <span
                              key={bar}
                              style={{ height: `${10 + bar * 9}px` }}
                              className={`w-2 rounded-sm ${bar <= index ? (selected ? 'bg-primary' : 'bg-primary/40') : 'bg-muted'}`}
                            />
                          ))}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-lg font-bold">{range.label}</span>
                          <span className="block text-xs text-muted-foreground">{range.detail}</span>
                        </span>
                        <CheckBox on={selected} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {current.id === 'brand' && (
              <>
                <Heading
                  headingRef={headingRef}
                  title="Add your logo and colour"
                  text="They appear on your dashboard and on the page where your students sign in."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-bold">Logo <span className="font-medium text-muted-foreground">(optional)</span></p>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/30">
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : logoUrl ? (
                        <BrandMark name={institution.name} logoUrl={logoUrl} className="h-16 w-16 rounded-2xl" />
                      ) : (
                        <ImageUp className="h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold text-primary">{logoUrl ? 'Change logo' : 'Upload logo'}</span>
                      <span className="text-[11px] text-muted-foreground">PNG, JPEG or WebP, up to 512 KB</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploading}
                        onChange={event => {
                          void chooseLogo(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    {logoError && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{logoError}</p>}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-bold">Brand colour</p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {BRAND_COLORS.map(color => {
                        const selected = profile.brandColor.toLowerCase() === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Colour ${color}`}
                            aria-pressed={selected}
                            onClick={() => update({ brandColor: color })}
                            style={{ backgroundColor: color }}
                            className={`flex h-11 items-center justify-center rounded-xl text-white transition-transform hover:scale-105 ${
                              selected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''
                            }`}
                          >
                            {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                      <input
                        type="color"
                        value={validColor(profile.brandColor) ? profile.brandColor : BRAND_COLORS[0]}
                        onChange={event => update({ brandColor: event.target.value.toLowerCase() })}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-card p-1"
                      />
                      Or pick your own
                      <span className="ml-auto font-mono text-foreground">{profile.brandColor}</span>
                    </label>
                  </div>
                </div>
                <div className="lg:hidden">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your students will see</p>
                  <SignInPreview name={institution.name} code={institution.code} profile={profile} logoUrl={logoUrl} />
                </div>
              </>
            )}

            {current.id === 'review' && (
              <>
                <Heading
                  headingRef={headingRef}
                  title={editing ? 'Check your changes' : 'All set? Check your answers'}
                  text="You can change any of this later from your dashboard."
                />
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-4 p-5" style={{ background: `linear-gradient(135deg, ${profile.brandColor}1f, transparent 70%)` }}>
                    <BrandMark name={institution.name} logoUrl={logoUrl} color={profile.brandColor} className="h-14 w-14 rounded-2xl text-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-black">{institution.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{window.location.host}{dashboardPath(institution.code)}</p>
                    </div>
                  </div>
                  <dl className="divide-y divide-border border-t border-border">
                    {[
                      { label: 'Exams', value: profile.exams.map(examName).join(', '), step: 0 },
                      { label: 'City', value: profile.city.trim(), step: 1 },
                      { label: 'Branches', value: branchesLabel(profile.branches), step: 1 },
                      { label: 'Students a month', value: studentRangeLabel(profile.monthlyStudents), step: 2 },
                      { label: 'Logo', value: logoUrl ? 'Uploaded' : 'None yet', step: 3 },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                        <dt className="w-36 shrink-0 text-xs font-semibold text-muted-foreground">{row.label}</dt>
                        <dd className="min-w-0 flex-1 truncate font-semibold">{row.value}</dd>
                        <button type="button" onClick={() => setStep(row.step)} className="text-xs font-bold text-primary hover:underline">
                          Change
                        </button>
                      </div>
                    ))}
                  </dl>
                </div>
                {saveError && (
                  <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {saveError}
                  </p>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-10">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving} className="h-11 rounded-full px-3 text-sm font-semibold">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
            ) : (
              <span aria-hidden />
            )}
            <Button onClick={next} disabled={!canContinue || saving} className="h-11 rounded-full px-7 text-sm font-bold shadow-md shadow-primary/20">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {current.id === 'review' ? (editing ? 'Save changes' : 'Finish setup') : 'Continue'}
              {!saving && current.id !== 'review' && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Keeps answers already saved (none before the first setup) over the defaults.
function pickFilled(profile: InstitutionProfile): Partial<InstitutionProfile> {
  const filled: Partial<InstitutionProfile> = {};
  if (profile.exams?.length) filled.exams = profile.exams;
  if (profile.city) filled.city = profile.city;
  if (profile.monthlyStudents) filled.monthlyStudents = profile.monthlyStudents;
  if (validColor(profile.brandColor ?? '')) filled.brandColor = profile.brandColor;
  return filled;
}

function Heading({ title, text, eyebrow, headingRef }: { title: string; text: string; eyebrow?: string; headingRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="space-y-2">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p>}
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-black tracking-tight outline-none sm:text-3xl">
        {title}
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function CheckBox({ on, color }: { on: boolean; color?: string }) {
  return (
    <span
      style={on && color ? { backgroundColor: color, borderColor: color } : undefined}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        on ? 'border-primary bg-primary text-white' : 'border-border'
      }`}
    >
      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** A small copy of the student sign-in page, updated as the answers change. */
function SignInPreview({ name, code, profile, logoUrl }: { name: string; code: string; profile: InstitutionProfile; logoUrl?: string }) {
  const color = validColor(profile.brandColor) ? profile.brandColor : BRAND_COLORS[0];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <BrandMark name={name} logoUrl={logoUrl} color={color} className="h-9 w-9 rounded-xl text-xs" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[profile.city.trim(), profile.exams.map(examName).join(' · ')].filter(Boolean).join(' — ') || `/${code}`}
            </p>
          </div>
        </div>
        <div className="space-y-1.5" aria-hidden>
          <div className="h-7 rounded-lg border border-border bg-card" />
          <div className="h-7 rounded-lg border border-border bg-card" />
          <div className="flex h-7 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
            Sign in
          </div>
        </div>
      </div>
    </div>
  );
}
