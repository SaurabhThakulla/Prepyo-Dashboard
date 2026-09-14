import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { api, errorMessage, profileImageUrl } from '@/lib/api';
import { ActivitySummary, ExamType, ProgressSummary, SkillType, isAdmin } from '@/lib/types';
import { useToast } from '@/components/ui/toast';
import { BookOpen, Camera, Trash2, Sparkles, Edit3, Loader2, CheckCircle2, X, ChevronDown } from 'lucide-react';
import { ProfilePageSkeleton } from '@/components/layout/PageSkeleton';

const REGIONS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal', 'Dharan', 'Biratnagar', 'Melbourne', 'Sydney'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HEAT = ['bg-slate-100 dark:bg-zinc-800', 'bg-blue-200 dark:bg-blue-900/60', 'bg-blue-400 dark:bg-blue-700/80', 'bg-blue-600', 'bg-blue-800 dark:bg-blue-500'];

/** The four skills the API scores, in the order the radar draws them. */
const SKILL_LABELS: { skill: SkillType; name: string }[] = [
  { skill: 'listening', name: 'Listening' },
  { skill: 'reading', name: 'Reading' },
  { skill: 'writing', name: 'Writing' },
  { skill: 'speaking', name: 'Speaking' },
];

const dKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Stands in for a number the learner has not generated yet. */
const NONE = '—';

type DayLog = { count: number; skills: Partial<Record<SkillType, number>> };

export default function ProfilePage() {
  const { user, activeExam, setActiveExam, updateProfile, refreshUser } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null), coverRef = useRef<HTMLInputElement>(null);
  const photo = user?.avatarUpdatedAt ? profileImageUrl('avatar', user.avatarUpdatedAt) : null;
  const cover = user?.coverUpdatedAt ? profileImageUrl('cover', user.coverUpdatedAt) : null;
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [isEdit, setIsEdit] = useState(false), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);
  const [skillView, setSkillView] = useState<'radar' | 'breakdown'>('radar');

  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
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
  const [form, setForm] = useState({ name: '', exam: 'PTE' as ExamType, score: '', date: '', region: REGIONS[0] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<ProgressSummary>('/progress'),
      api.get<{ activity: ActivitySummary }>('/progress/activity', { days: 365 }),
      api.get<{ pagination: { total: number } }>('/mocks/attempts', { limit: 1 }),
    ])
      .then(([summary, act, mocks]) => {
        if (cancelled) return;
        setProgress(summary);
        setActivity(act.activity);
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

  // The server sends only practised days, keyed by date in the learner's own
  // timezone. Every date missing from it is a real zero, not a gap in loading.
  const logs = useMemo(() => {
    const map: Record<string, DayLog> = {};
    for (const day of activity?.days ?? []) map[day.date] = { count: day.count, skills: day.skills };
    return map;
  }, [activity]);

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
      await updateProfile({ name: form.name.trim(), ...(canSwitchExam ? { targetExam: form.exam } : {}), targetScore: form.score.trim() ? Number(form.score) : null, examDate: form.date || undefined, nepalRegion: form.region });
      setSaved(true); toast.success('Profile updated'); setTimeout(() => setIsEdit(false), 400);
    } catch (e) { toast.error('Failed to update', errorMessage(e)); } finally { setSaving(false); }
  };

  const { weeks, yearTotal, headers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align start to Monday 51 weeks ago so row 0 is always Monday, and the last column ends with the current week
    const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon, 1 = Tue, ..., 6 = Sun
    const start = new Date(today);
    start.setDate(today.getDate() - (51 * 7 + dayOfWeek));

    const wList = [];
    const hdrs: { name: string; w: number }[] = [];
    let lastM = -1;
    let yTotal = 0;

    for (let w = 0; w < 52; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + (w * 7 + d));
        if (d === 0 && cur.getMonth() !== lastM) {
          hdrs.push({ name: MONTHS[cur.getMonth()], w });
          lastM = cur.getMonth();
        }
        const isFuture = w === 51 && d > dayOfWeek;
        const count = logs[dKey(cur)]?.count || 0;
        if (count > 0 && !isFuture) yTotal += count;
        days.push({
          date: `${cur.getDate()} ${MONTHS[cur.getMonth()]}`,
          count,
          lvl: Math.min(4, Math.ceil(count / 2)),
          isFuture,
        });
      }
      wList.push(days);
    }

    const headerItems = hdrs.map((h, i) => {
      const nextW = i < hdrs.length - 1 ? hdrs[i + 1].w : 52;
      const span = nextW - h.w;
      return {
        name: h.name,
        w: h.w,
        span,
        widthPercent: (span / 52) * 100,
      };
    });

    return { weeks: wList, yearTotal: yTotal, headers: headerItems };
  }, [logs]);

  const streak = activity?.currentStreak ?? user?.streakDays ?? 0;
  const practiceHours = activity ? Math.round(activity.totalMinutes / 60) : null;

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

    const scored = items.filter(i => i.score != null);
    const overall = scored.length
      ? (scored.reduce((a, b) => a + (b.score as number), 0) / scored.length).toFixed(isIELTS ? 1 : 0)
      : NONE;
    return { skillList: items, overallScore: overall };
  }, [progress, isIELTS, targetNum]);

  const rad = 105, cx = 150, cy = 150, axes = skillList.length;
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos((i * 2 * Math.PI) / axes - Math.PI / 2), y: cy + r * Math.sin((i * 2 * Math.PI) / axes - Math.PI / 2) });
  const poly = (r: number | ((i: number) => number)) => skillList.map((_, i) => { const p = pt(i, (typeof r === 'function' ? r(i) : r) * rad); return `${p.x},${p.y}`; }).join(' ');
  const norm = (score: number) => Math.min(1, Math.max(0.05, (score - minScale) / (maxScale - minScale)));
  const anchors = [{ dx: 0, dy: -10, a: 'middle' }, { dx: 12, dy: 4, a: 'start' }, { dx: 0, dy: 16, a: 'middle' }, { dx: -12, dy: 4, a: 'end' }] as const;

  const estimate = user?.estimate?.value ?? progress?.estimate?.value ?? null;
  const predicted = estimate != null ? (isIELTS ? estimate.toFixed(1) : String(Math.round(estimate))) : NONE;
  const readiness = user?.estimate?.readiness ?? progress?.estimate?.readiness ?? null;
  const hasSkillData = skillList.some(s => s.score != null);

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
          {isAdmin(user) && <div className="absolute top-4 right-4 sm:right-6 z-20 flex items-center bg-black/45 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-md"><span className="text-[10px] font-bold text-white/70 uppercase px-2 hidden sm:inline">Track:</span>{(['IELTS', 'PTE'] as const).map(exam => <button key={exam} type="button" onClick={() => setActiveExam(exam)} className={`px-3 py-1 text-xs font-extrabold rounded-lg transition ${targetExam === exam ? 'bg-white text-blue-900 shadow-sm' : 'text-white/80 hover:text-white'}`}>{exam}</button>)}</div>}
        </div>
        <div className="px-5 sm:px-8 pb-7 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="-mt-16 sm:-mt-20 relative z-10 inline-block">
              <div onClick={() => fileRef.current?.click()} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-slate-100 dark:bg-zinc-800 shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer">{photo ? <img src={photo} alt="Avatar" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <span className="font-bold text-muted-foreground text-xs">photo</span>}<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-bold"><Camera className="w-5 h-5 mb-1" /><span>{photo ? 'Change' : 'Upload'}</span></div>{uploading === 'avatar' && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}</div>
              <div className="absolute bottom-0 right-0 flex items-center gap-1 z-20"><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading === 'avatar'} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-card disabled:opacity-60"><Camera className="w-3.5 h-3.5" /></button>{photo && <button type="button" onClick={e => onRemove(e)} disabled={uploading === 'avatar'} className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md border-2 border-card disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{user?.name}</h1><span className="bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase border border-border">{planId === 'elite' ? <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> ELITE</span> : planId?.toUpperCase() || 'FREE'}</span></div>
              <p className="text-xs sm:text-sm font-medium text-foreground/90">{isIELTS ? 'IELTS Academic' : 'PTE Academic'}{target ? ` · ${isIELTS ? 'Target Band' : 'Target Score'} ${target}` : ' · No target set'} · {user?.examDate ? `Exam on ${new Date(user.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No exam date set'}</p>
              <p className="text-xs text-muted-foreground">{user?.nepalRegion}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1"><Link to="/practice" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /><span>Assign practice</span></Link><button type="button" onClick={openEdit} className="border border-border hover:bg-muted/70 bg-card text-foreground font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /><span>Edit profile</span></button></div>
          </div>
          <div className="w-full lg:w-[380px] space-y-4 shrink-0">
            <div className="grid grid-cols-3 gap-2.5">{[{ v: predicted, l: isIELTS ? 'Predicted band' : 'Predicted score' }, { v: practiceHours == null ? NONE : String(practiceHours), l: 'Practice hours' }, { v: mockCount == null ? NONE : String(mockCount), l: 'Scored mocks' }].map((s, i) => <div key={i} className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-zinc-900/60 p-3 text-center"><div className="text-2xl font-black text-foreground">{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /> : s.v}</div><div className="text-[10px] text-muted-foreground font-medium truncate">{s.l}</div></div>)}</div>
            <div className="space-y-1.5"><div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>Readiness to Target</span><span>{readiness == null ? NONE : `${readiness}%`}</span></div><div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${readiness ?? 0}%` }} /></div></div>
          </div>
        </div>
      </div>

      {/* Profile Page Content: Practice Activity, Skill Profile */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Practice Activity */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-foreground">Practice activity</h2><p className="text-xs text-muted-foreground">{loading ? 'Loading your practice history…' : `${yearTotal} sessions in 12 months`}</p></div>
          <div className="flex items-center gap-4"><div className="text-xs font-bold text-foreground">{streak}d <span className="text-[9px] text-muted-foreground font-normal">STREAK</span></div></div>
        </div>
        {loaded && activity?.totalSessions === 0 && (
          <p className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-xl px-3 py-2">No practice logged yet. <Link to="/practice" className="text-blue-600 font-semibold hover:underline">Start a session</Link> and it will show up here.</p>
        )}
        <div className="overflow-x-auto no-scrollbar pb-1">
            <div className="min-w-[700px] w-full space-y-2">
              <div className="flex text-[10px] text-muted-foreground pl-7 select-none">
                {headers.map((h, i) => (
                  <div
                    key={i}
                    style={{ width: `${h.widthPercent}%` }}
                    className="truncate font-medium text-left"
                  >
                    {h.span >= 2 ? h.name : ''}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col justify-between text-[10px] text-muted-foreground w-5 py-0.5 select-none self-stretch shrink-0">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>
                <div className="flex gap-[3px] sm:gap-1 flex-1 w-full">
                  {weeks.map((w, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px] sm:gap-1 flex-1 min-w-0">
                      {w.map((d, di) => (
                        <div
                          key={di}
                          title={d.isFuture ? '' : `${d.count} sessions on ${d.date}`}
                          className={`w-full aspect-square rounded-[3px] transition-colors ${d.isFuture ? 'opacity-0 pointer-events-none' : HEAT[d.lvl]
                            }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground pt-1 pr-1">
                <span>Less</span>
                {HEAT.map((c, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
      </div>

      {/* Skill Profile */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-foreground">Skill profile ({isIELTS ? 'IELTS Academic' : 'PTE Academic'})</h2><p className="text-xs text-muted-foreground">{isIELTS ? 'Evaluated band per skill (0–9.0)' : 'Evaluated score per skill (10–90)'}</p></div><div className="flex bg-muted/60 p-1 rounded-xl border border-border">{(['radar', 'breakdown'] as const).map(m => <button key={m} onClick={() => setSkillView(m)} className={`px-2.5 py-1 text-xs font-bold capitalize rounded-lg transition ${skillView === m ? 'bg-card text-blue-600 shadow-xs' : 'text-muted-foreground'}`}>{m}</button>)}</div></div>
        {skillView === 'radar' ? (
          <div className="flex justify-center py-1">
            <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-full max-w-[300px] overflow-visible select-none">
              {[0.25, 0.5, 0.75, 1.0].map((l, i) => <polygon key={i} points={poly(l)} fill="none" stroke="currentColor" className="text-slate-200 dark:text-zinc-800" strokeWidth="1" />)}
              {skillList.map((_, i) => <line key={i} x1={cx} y1={cy} x2={pt(i, rad).x} y2={pt(i, rad).y} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" strokeWidth="1" />)}
              {targetNum != null && <polygon points={poly(norm(targetNum))} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />}
              {hasSkillData && <polygon points={poly(i => (skillList[i].score != null ? norm(skillList[i].score as number) : 0.05))} fill="rgba(59, 130, 246, 0.2)" stroke="#2563eb" strokeWidth="2" />}
              {skillList.map((s, i) => { const p = pt(i, s.score != null ? norm(s.score) : 0.05), lbl = pt(i, rad), anc = anchors[i]; return <g key={i}>{s.score != null && <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#2563eb" strokeWidth="2" />}<text x={lbl.x + anc.dx} y={lbl.y + anc.dy} textAnchor={anc.a} className="text-[10px] font-bold fill-foreground">{s.name} <tspan className="text-blue-600 font-black">{s.score ?? NONE}</tspan></text></g>; })}
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">{skillList.map(s => <div key={s.name} className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-1.5 text-xs"><div className="flex justify-between font-bold"><span>{s.name}</span>{s.gap != null ? <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.gap >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{s.gap >= 0 ? 'Target Met' : String(s.gap)}</span> : <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.att === 0 ? 'No attempts' : 'No target'}</span>}</div><div className="text-base font-black text-foreground">{s.score ?? NONE} <span className="text-[11px] font-normal text-muted-foreground">/ {maxScale}</span></div><div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${s.score != null ? Math.round(norm(s.score) * 100) : 0}%` }} /></div><div className="text-[10px] text-muted-foreground">{s.att} {s.att === 1 ? 'attempt' : 'attempts'}{s.att > 0 ? ` · ${s.acc}% accuracy` : ''}</div></div>)}</div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border"><span className="text-xs font-bold text-muted-foreground uppercase">{isIELTS ? 'Overall band (0–9.0)' : 'Overall score (10–90)'}</span><span className="text-xl font-black text-foreground font-mono">{overallScore}</span></div>
      </div>
      </div>

      {/* Edit Modal */}
      {isEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border"><h3 className="text-sm font-bold text-foreground">Edit Profile &amp; Goals</h3><button onClick={() => setIsEdit(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <div className="space-y-3 text-xs">
              <div><label className="font-bold">Full Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div>
              <div><label className="font-bold">Track</label>{isAdmin(user) ? <div className="grid grid-cols-2 gap-2 mt-1">{(['PTE', 'IELTS'] as const).map(e => <button key={e} type="button" onClick={() => setForm({ ...form, exam: e, score: '' })} className={`py-1.5 rounded-xl border text-xs font-bold transition ${form.exam === e ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-foreground'}`}>{e} Academic</button>)}</div> : <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground"><span>{form.exam} Academic</span><span className="text-[10px] font-semibold text-muted-foreground">Fixed</span></div>}</div>
              <div className="grid grid-cols-2 gap-2.5"><div><label className="font-bold">{form.exam === 'IELTS' ? 'Band (0-9)' : 'Score (10-90)'}</label><input type="number" step={form.exam === 'PTE' ? '1' : '0.5'} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div><div><label className="font-bold">Test Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div></div>
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
