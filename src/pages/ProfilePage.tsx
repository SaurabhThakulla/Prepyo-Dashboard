import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { api, errorMessage, profileImageUrl } from '@/lib/api';
import { EXAM_LABELS, EXAM_TYPES, ExamType, ProgressSummary, SkillType, isAdmin, IELTSModule, IELTS_MODULE_LABEL, ieltsModuleOf } from '@/lib/types';

/** How each exam track is named in the profile form. */
const TRACK_LABEL: Record<ExamType, string> = { PTE: 'PTE Academic', IELTS: 'IELTS Academic', EPS_TOPIK: 'EPS-TOPIK', JLPT: 'JLPT N5' };
import { useToast } from '@/components/ui/toast';
import { BookOpen, Camera, Trash2, Sparkles, Edit3, Loader2, CheckCircle2, X, ChevronDown, Headphones, PenLine, Mic } from 'lucide-react';
import { ProfilePageSkeleton } from '@/components/layout/PageSkeleton';
import MistakesPage from '@/pages/MistakesPage';

const REGIONS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal', 'Dharan', 'Biratnagar', 'Melbourne', 'Sydney'];

/** The four skills the API scores, in the order the radar draws them. */
const SKILL_LABELS: { skill: SkillType; name: string }[] = [
  { skill: 'listening', name: 'Listening' },
  { skill: 'reading', name: 'Reading' },
  { skill: 'writing', name: 'Writing' },
  { skill: 'speaking', name: 'Speaking' },
];

/** Stands in for a number the learner has not generated yet. */
const NONE = '—';


export default function ProfilePage() {
  const { user, activeExam, setActiveExam, updateProfile, refreshUser } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null), coverRef = useRef<HTMLInputElement>(null);
  const photo = user?.avatarUpdatedAt ? profileImageUrl('avatar', user.avatarUpdatedAt) : null;
  const cover = user?.coverUpdatedAt ? profileImageUrl('cover', user.coverUpdatedAt) : null;
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [isEdit, setIsEdit] = useState(false), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);

  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [mockCount, setMockCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const targetExam = user?.targetExam || activeExam || 'PTE', isIELTS = targetExam === 'IELTS';
  const minScale = isIELTS ? 0 : 10, maxScale = isIELTS ? 9 : 90;
  const targetNum = user?.targetScore ?? null;
  const target = targetNum != null ? String(targetNum) : null;
  const planId = user?.subscription?.planId?.toLowerCase();
  const [form, setForm] = useState({ name: '', exam: 'PTE' as ExamType, module: 'academic' as IELTSModule, score: '', date: '', region: REGIONS[0] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<ProgressSummary>('/progress'),
      api.get<{ pagination: { total: number } }>('/mocks/attempts', { limit: 1 }),
    ])
      .then(([summary, mocks]) => {
        if (cancelled) return;
        setProgress(summary);
        setMockCount(mocks.pagination.total);
        setLoaded(true);
      })
      .catch(err => {
        if (!cancelled) toastRef.current.error('Could not load your progress', errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeExam]);


  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCov?: boolean) => {
    const f = e.target.files?.[0];
    // Clearing the input lets the same file be picked again after a failure.
    e.target.value = '';
    if (!f?.type.startsWith('image/')) return toast.error('Invalid image', 'Please select an image.');

    const kind = isCov ? 'cover' : 'avatar', label = isCov ? 'Cover' : 'Photo';
    setUploading(kind);
    try {
      await api.upload(`/profile/${kind}`, f);
      await refreshUser();
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(`Could not update your ${label.toLowerCase()}`, errorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  const onRemove = async (e: React.MouseEvent, isCov?: boolean) => {
    e.stopPropagation();
    const kind = isCov ? 'cover' : 'avatar', label = isCov ? 'Cover' : 'Photo';
    setUploading(kind);
    try {
      await api.delete(`/profile/${kind}`);
      await refreshUser();
      toast.success(`${label} removed`);
    } catch (err) {
      toast.error(`Could not remove your ${label.toLowerCase()}`, errorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  const openEdit = () => {
    setForm({
      name: user?.name || '',
      exam: targetExam,
      module: ieltsModuleOf(user),
      score: target ?? '',
      date: user?.examDate ? user.examDate.split('T')[0] : '',
      region: user?.nepalRegion || REGIONS[0],
    });
    setSaving(false); setSaved(false); setIsEdit(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const canSwitchExam = isAdmin(user);
      if (canSwitchExam && form.exam !== activeExam) await setActiveExam(form.exam);
      await updateProfile({ name: form.name.trim(), ...(canSwitchExam ? { targetExam: form.exam } : {}), ...(form.exam === 'IELTS' ? { targetModule: form.module } : {}), targetScore: form.score.trim() ? Number(form.score) : null, examDate: form.date || undefined, nepalRegion: form.region });
      setSaved(true); toast.success('Profile updated'); setTimeout(() => setIsEdit(false), 400);
    } catch (e) { toast.error('Failed to update', errorMessage(e)); } finally { setSaving(false); }
  };



  const { skillList, overallScore } = useMemo(() => {
    const rows = progress?.skills ?? [];
    const items = SKILL_LABELS.map(({ skill, name }) => {
      const row = rows.find(x => x.skill === skill);
      const score = row?.estimate ?? null;
      return {
        name,
        score: score != null ? Number(score.toFixed(1)) : null,
        acc: row?.accuracy ?? 0,
        att: row?.attempts ?? 0,
        gap: score != null && targetNum != null ? Number((score - targetNum).toFixed(1)) : null,
      };
    });

    // The overall figure is the server's. For IELTS it is the mean of all four
    // skill bands with the official rounding, and does not exist until all
    // four have evidence; a mean of whichever skills happen to be practised,
    // shown to one decimal place, is not an IELTS overall band.
    const serverOverall = user?.estimate?.value ?? progress?.estimate?.value ?? null;
    const overall = serverOverall != null ? (isIELTS ? serverOverall.toFixed(1) : String(Math.round(serverOverall))) : NONE;
    return { skillList: items, overallScore: overall };
  }, [progress, isIELTS, targetNum, user?.estimate?.value]);

  const skillsCovered = user?.estimate?.skillsCovered ?? progress?.estimate?.skillsCovered;
  const skillsRequired = user?.estimate?.skillsRequired ?? progress?.estimate?.skillsRequired;
  const overallNote =
    isIELTS && overallScore === NONE && skillsRequired
      ? `Needs all four skills (${skillsCovered ?? 0} of ${skillsRequired} so far)`
      : null;

  const norm = (score: number) => Math.min(1, Math.max(0.05, (score - minScale) / (maxScale - minScale)));

  const estimate = user?.estimate?.value ?? progress?.estimate?.value ?? null;
  const predicted = estimate != null ? (isIELTS ? estimate.toFixed(1) : String(Math.round(estimate))) : NONE;
  const readiness = user?.estimate?.readiness ?? progress?.estimate?.readiness ?? null;

  if (loading && !loaded) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="w-full pb-12">
      <input type="file" ref={fileRef} accept="image/*" onChange={e => onUpload(e)} className="hidden" /><input type="file" ref={coverRef} accept="image/*" onChange={e => onUpload(e, true)} className="hidden" />

      {/* Hero Section: Full width edge-to-edge, zero top/left/right gaps */}
      <div className="w-full bg-card border-b border-border/80 overflow-hidden">
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-gradient-to-r from-[#0c1e4c] via-[#123e8e] to-[#1c6fe9]">
          {cover && <img src={cover} alt="Cover" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
          <div className="absolute top-4 left-4 sm:left-6 z-20 flex items-center gap-1.5"><button type="button" onClick={() => coverRef.current?.click()} disabled={uploading === 'cover'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/70 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition shadow-sm disabled:opacity-60">{uploading === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}<span>Change cover</span></button>{cover && <button type="button" onClick={e => onRemove(e, true)} disabled={uploading === 'cover'} className="p-1.5 rounded-xl bg-black/45 hover:bg-rose-600 text-white border border-white/20 backdrop-blur-md transition shadow-sm disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
          {isAdmin(user) && <div className="absolute top-4 right-4 sm:right-6 z-20 flex items-center bg-black/45 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-md"><span className="text-xs font-bold text-white/70 uppercase px-2 hidden sm:inline">Track:</span>{EXAM_TYPES.map(exam => <button key={exam} type="button" onClick={() => setActiveExam(exam)} className={`px-3 py-1 text-xs font-extrabold rounded-lg transition ${targetExam === exam ? 'bg-white text-blue-900 shadow-sm' : 'text-white/80 hover:text-white'}`}>{EXAM_LABELS[exam]}</button>)}</div>}
        </div>
        <div className="px-5 sm:px-8 pb-7 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="-mt-16 sm:-mt-20 relative z-10 inline-block">
              <div onClick={() => fileRef.current?.click()} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-slate-100 dark:bg-slate-800 shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer">{photo ? <img src={photo} alt="Avatar" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <span className="font-bold text-muted-foreground text-xs">photo</span>}<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-xs font-bold"><Camera className="w-5 h-5 mb-1" /><span>{photo ? 'Change' : 'Upload'}</span></div>{uploading === 'avatar' && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}</div>
              <div className="absolute bottom-0 right-0 flex items-center gap-1 z-20"><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading === 'avatar'} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-card disabled:opacity-60"><Camera className="w-3.5 h-3.5" /></button>{photo && <button type="button" onClick={e => onRemove(e)} disabled={uploading === 'avatar'} className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md border-2 border-card disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{user?.name}</h1><span className="bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-extrabold text-xs px-2.5 py-0.5 rounded-md uppercase border border-border">{planId === 'elite' ? <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> ELITE</span> : planId?.toUpperCase() || 'FREE'}</span></div>
              <p className="text-xs sm:text-sm font-medium text-foreground/90">{isIELTS ? 'IELTS Academic' : 'PTE Academic'}{target ? ` · ${isIELTS ? 'Target Band' : 'Target Score'} ${target}` : ' · No target set'} · {user?.examDate ? `Exam on ${new Date(user.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No exam date set'}</p>
              <p className="text-xs text-muted-foreground">{user?.nepalRegion}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1"><Link to="/practice" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /><span>Assign practice</span></Link><button type="button" onClick={openEdit} className="border border-border hover:bg-muted/70 bg-card text-foreground font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /><span>Edit profile</span></button></div>
          </div>
          <div className="w-full lg:w-[380px] space-y-4 shrink-0">
            <div className="grid grid-cols-2 gap-2.5">{[{ v: predicted, l: isIELTS ? 'Predicted band' : 'Predicted score' }, { v: mockCount == null ? NONE : String(mockCount), l: 'Scored mocks' }].map((s, i) => <div key={i} className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/60 p-3 text-center"><div className="text-2xl font-black text-foreground">{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /> : s.v}</div><div className="text-xs text-muted-foreground font-medium truncate">{s.l}</div></div>)}</div>
            <div className="space-y-1.5"><div className="flex justify-between text-xs font-bold text-muted-foreground uppercase"><span>Readiness to Target</span><span>{readiness == null ? NONE : `${readiness}%`}</span></div><div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${readiness ?? 0}%` }} /></div></div>
          </div>
        </div>
      </div>

      {/* Profile Page Content: Skill profile, then Practice history */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        <SkillProfile
          title={`Skill profile · ${isIELTS ? 'IELTS Academic' : 'PTE Academic'}`}
          scaleLabel={isIELTS ? 'Band per skill, 0–9' : 'Score per skill, 10–90'}
          overallLabel={isIELTS ? 'Overall band' : 'Overall score'}
          overall={overallScore}
          overallNote={overallNote}
          skills={skillList}
          target={targetNum}
          maxScale={maxScale}
          norm={norm}
        />
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
          <MistakesPage embedded />
        </div>
      </div>

      {/* Edit Modal */}
      {isEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border"><h3 className="text-sm font-bold text-foreground">Edit Profile &amp; Goals</h3><button onClick={() => setIsEdit(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <div className="space-y-3 text-xs">
              <div><label className="font-bold">Full Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div>
              <div><label className="font-bold">Track</label>{isAdmin(user) ? <div className="grid grid-cols-4 gap-2 mt-1">{(['PTE', 'IELTS', 'EPS_TOPIK', 'JLPT'] as const).map(e => <button key={e} type="button" onClick={() => setForm({ ...form, exam: e, score: '' })} className={`py-1.5 rounded-xl border text-xs font-bold transition ${form.exam === e ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-foreground'}`}>{TRACK_LABEL[e]}</button>)}</div> : <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground"><span>{form.exam === 'IELTS' ? 'IELTS' : TRACK_LABEL[form.exam]}</span><span className="text-xs font-semibold text-muted-foreground">Fixed</span></div>}</div>
              {form.exam === 'IELTS' && <div><label className="font-bold">IELTS test</label><div className="grid grid-cols-2 gap-2 mt-1">{(['academic', 'general_training'] as const).map(m => <button key={m} type="button" aria-pressed={form.module === m} onClick={() => setForm({ ...form, module: m })} className={`py-1.5 rounded-xl border text-xs font-bold transition ${form.module === m ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-foreground'}`}>{IELTS_MODULE_LABEL[m]}</button>)}</div><p className="mt-1 text-xs text-muted-foreground">Reading texts and Writing Task 1 differ; Listening, Speaking and Task 2 are the same.</p></div>}
              <div className="grid grid-cols-2 gap-2.5"><div><label className="font-bold">{form.exam === 'IELTS' ? 'Band (0-9)' : form.exam === 'EPS_TOPIK' ? 'Score (0-100)' : form.exam === 'JLPT' ? 'Score (0-180)' : 'Score (10-90)'}</label><input type="number" step={form.exam === 'PTE' ? '1' : form.exam === 'EPS_TOPIK' ? '2.5' : '0.5'} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div><div><label className="font-bold">Test Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div></div>
              <div>
                <label className="font-bold">City / Region</label>
                <div className="relative group mt-1">
                  <select
                    value={form.region}
                    onChange={e => setForm({ ...form, region: e.target.value })}
                    className="w-full h-8.5 appearance-none rounded-xl border border-input bg-card pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs hover:border-primary/50 transition-all cursor-pointer"
                  >
                    {REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-border flex justify-end gap-2"><button type="button" onClick={() => setIsEdit(false)} className="px-3 py-1.5 text-xs rounded-xl hover:bg-muted font-medium text-muted-foreground">Cancel</button><button type="button" onClick={handleSave} disabled={saving || !form.name.trim()} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 disabled:opacity-50">{saved ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span> : saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

type SkillRow = { name: string; score: number | null; acc: number; att: number; gap: number | null };

const SKILL_ICON: Record<string, typeof Mic> = { Listening: Headphones, Reading: BookOpen, Writing: PenLine, Speaking: Mic };

/** Overall score, a radar of the four skills, and a row per skill with its gap to the target. */
function SkillProfile({ title, scaleLabel, overallLabel, overall, overallNote, skills, target, maxScale, norm }: {
  title: string; scaleLabel: string; overallLabel: string; overall: string; overallNote: string | null;
  skills: SkillRow[]; target: number | null; maxScale: number; norm: (score: number) => number;
}) {
  const rad = 130, c = 170, axes = skills.length;
  const gradId = `radar-${React.useId().replace(/:/g, '')}`;
  const pt = (i: number, r: number) => ({ x: c + r * Math.cos((i * 2 * Math.PI) / axes - Math.PI / 2), y: c + r * Math.sin((i * 2 * Math.PI) / axes - Math.PI / 2) });
  const poly = (r: (i: number) => number) => skills.map((_, i) => { const p = pt(i, r(i) * rad); return `${p.x},${p.y}`; }).join(' ');
  // Label offsets per axis (top, right, bottom, left): skill name, then its score below it.
  const anchors = [{ dx: 0, dy: -30, a: 'middle' }, { dx: 16, dy: -4, a: 'start' }, { dx: 0, dy: 24, a: 'middle' }, { dx: -16, dy: -4, a: 'end' }] as const;
  const hasData = skills.some(s => s.score != null);
  const at = (s: SkillRow) => (s.score != null ? norm(s.score) : 0);

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{scaleLabel}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{overallLabel}</p>
          <p className="font-display text-3xl font-black leading-none text-foreground tabular-nums">{overall}</p>
          {overallNote && <p className="mt-1 text-[11px] text-muted-foreground">{overallNote}</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-8">
        <div className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-primary/[0.04] to-transparent py-4">
          <svg viewBox="-40 0 420 360" className="w-full max-w-[520px] overflow-visible select-none text-primary" role="img" aria-label={`${title} radar chart`}>
            <defs>
              <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
              </radialGradient>
            </defs>
            {[1, 0.75, 0.5, 0.25].map((l, k) => <polygon key={l} points={poly(() => l)} fill="currentColor" className={k % 2 === 0 ? 'text-muted/70' : 'text-card'} stroke="currentColor" strokeWidth="1" style={{ stroke: 'hsl(var(--border))' }} />)}
            {skills.map((_, i) => <line key={i} x1={c} y1={c} x2={pt(i, rad).x} y2={pt(i, rad).y} stroke="hsl(var(--border))" strokeWidth="1" />)}
            {target != null && <polygon points={poly(() => norm(target))} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" strokeDasharray="5 4" />}
            {hasData && <polygon points={poly(i => at(skills[i]))} fill={`url(#${gradId})`} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" className="transition-all duration-500" />}
            {skills.map((s, i) => {
              const p = pt(i, at(s)), lbl = pt(i, rad), anc = anchors[i];
              return (
                <g key={s.name}>
                  {s.score != null && <circle cx={p.x} cy={p.y} r="5.5" className="fill-card" stroke="currentColor" strokeWidth="2.5" />}
                  <text x={lbl.x + anc.dx} y={lbl.y + anc.dy} textAnchor={anc.a} className="fill-muted-foreground text-[13px] font-semibold">{s.name}</text>
                  <text x={lbl.x + anc.dx} y={lbl.y + anc.dy + 17} textAnchor={anc.a} className={`text-[15px] font-black tabular-nums ${s.score != null ? 'fill-foreground' : 'fill-muted-foreground/60'}`}>{s.score ?? NONE}</text>
                </g>
              );
            })}
          </svg>
          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />Your score</span>
            {target != null && <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-muted-foreground" />Target {target}</span>}
          </div>
        </div>

        <ul className="space-y-3">
          {skills.map(s => {
            const Icon = SKILL_ICON[s.name] ?? BookOpen;
            const pct = s.score != null ? Math.round(norm(s.score) * 100) : 0;
            return (
              <li key={s.name} className="rounded-xl border border-border/80 bg-muted/20 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.att === 0 ? 'Not practised yet' : `${s.att} ${s.att === 1 ? 'attempt' : 'attempts'} · ${s.acc}% accuracy`}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-black leading-none text-foreground tabular-nums">{s.score ?? NONE}<span className="text-xs font-medium text-muted-foreground"> / {maxScale}</span></p>
                    {s.gap != null && (
                      <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold ${s.gap >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {s.gap >= 0 ? 'Target met' : `${s.gap} vs target`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative mt-3 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                  {target != null && <span title={`Target ${target}`} className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/60" style={{ left: `${Math.round(norm(target) * 100)}%` }} />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
