import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { api, errorMessage } from '@/lib/api';
import { ExamType, ProgressSummary, SkillType } from '@/lib/types';
import { useToast } from '@/components/ui/toast';
import { BookOpen, Camera, Trash2, Sparkles, Edit3, ChevronLeft, ChevronRight, Mic, PenTool, Headphones, Loader2, CheckCircle2, X } from 'lucide-react';

const REGIONS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal', 'Dharan', 'Biratnagar', 'Melbourne', 'Sydney'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HEAT = ['bg-slate-100 dark:bg-zinc-800', 'bg-blue-200 dark:bg-blue-900/60', 'bg-blue-400 dark:bg-blue-700/80', 'bg-blue-600', 'bg-blue-800 dark:bg-blue-500'];
const dKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getLogs = (): Record<string, { count: number; skills?: Partial<Record<SkillType, number>> }> => { try { return JSON.parse(localStorage.getItem('prepyo_practice_activity_logs') || '{}'); } catch { return {}; } };

export default function ProfilePage() {
  const { user, activeExam, setActiveExam, updateProfile } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null), coverRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(() => localStorage.getItem('prepyo-user-avatar')), [cover, setCover] = useState<string | null>(() => localStorage.getItem('prepyo-user-cover'));
  const [isEdit, setIsEdit] = useState(false), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);
  const [view, setView] = useState<'yearly' | 'monthly'>('yearly'), [skillView, setSkillView] = useState<'radar' | 'breakdown'>('radar');
  const [mIdx, setMIdx] = useState(new Date().getMonth()), [progress, setProgress] = useState<ProgressSummary | null>(null), [logs, setLogs] = useState(getLogs);

  const targetExam = user?.targetExam || activeExam || 'PTE', isIELTS = targetExam === 'IELTS', maxScale = isIELTS ? 9 : 90;
  const target = user?.targetScore != null ? String(user.targetScore) : isIELTS ? '8.0' : '79', targetNum = Number(target) || (isIELTS ? 8 : 79), planId = user?.subscription?.planId?.toLowerCase();
  const [form, setForm] = useState({ name: '', exam: 'PTE' as ExamType, score: '79', date: '2026-09-12', region: 'Kathmandu' });

  useEffect(() => {
    const reload = () => setLogs(getLogs());
    api.get<ProgressSummary>('/progress').then(setProgress).catch(() => {});
    window.addEventListener('prepyo_practice_logged', reload); window.addEventListener('storage', reload);
    return () => { window.removeEventListener('prepyo_practice_logged', reload); window.removeEventListener('storage', reload); };
  }, [activeExam]);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>, isCov?: boolean) => {
    const f = e.target.files?.[0]; if (!f?.type.startsWith('image/')) return toast.error('Invalid image', 'Please select an image.');
    const r = new FileReader();
    r.onload = () => { const d = r.result as string; if (isCov) { setCover(d); localStorage.setItem('prepyo-user-cover', d); } else { setPhoto(d); localStorage.setItem('prepyo-user-avatar', d); } toast.success(`${isCov ? 'Cover' : 'Photo'} updated`); };
    r.readAsDataURL(f);
  };

  const onRemove = (e: React.MouseEvent, isCov?: boolean) => {
    e.stopPropagation();
    if (isCov) { setCover(null); localStorage.removeItem('prepyo-user-cover'); } else { setPhoto(null); localStorage.removeItem('prepyo-user-avatar'); }
    toast.success(`${isCov ? 'Cover' : 'Photo'} reset`);
  };

  const openEdit = () => { setForm({ name: user?.name || 'sachin', exam: targetExam, score: target, date: user?.examDate ? user.examDate.split('T')[0] : '2026-09-12', region: user?.nepalRegion || 'Kathmandu' }); setSaving(false); setSaved(false); setIsEdit(true); };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (form.exam !== activeExam) await setActiveExam(form.exam);
      await updateProfile({ name: form.name.trim(), targetExam: form.exam, targetScore: form.score.trim() ? Number(form.score) : null, examDate: form.date || undefined, nepalRegion: form.region });
      setSaved(true); toast.success('Profile updated'); setTimeout(() => setIsEdit(false), 400);
    } catch (e) { toast.error('Failed to update', errorMessage(e)); } finally { setSaving(false); }
  };

  const { weeks, yearTotal, streak, headers, totalSessions } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0); const start = new Date(today); start.setDate(today.getDate() - 52 * 7 + 1);
    const wList = [], hdrs = []; let lastM = -1, yTotal = 0, allSessions = 0;
    for (let w = 0; w < 52; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start); cur.setDate(start.getDate() + (w * 7 + d));
        if (d === 0 && cur.getMonth() !== lastM) { hdrs.push({ name: MONTHS[cur.getMonth()], w }); lastM = cur.getMonth(); }
        const count = logs[dKey(cur)]?.count || 0; if (count > 0) yTotal += count;
        days.push({ date: `${cur.getDate()} ${MONTHS[cur.getMonth()]}`, count, lvl: Math.min(4, Math.ceil(count / 2)) });
      }
      wList.push(days);
    }
    Object.keys(logs).forEach(k => { allSessions += logs[k]?.count || 0; });
    let curStreak = 0; const check = new Date(today); if (!logs[dKey(check)]?.count) check.setDate(check.getDate() - 1);
    while ((logs[dKey(check)]?.count || 0) > 0) { curStreak++; check.setDate(check.getDate() - 1); }
    return { weeks: wList, yearTotal: yTotal, streak: user?.streakDays || curStreak, headers: hdrs, totalSessions: allSessions };
  }, [logs, user?.streakDays]);

  const monthData = useMemo(() => {
    const y = new Date().getFullYear(), count = new Date(y, mIdx + 1, 0).getDate(), first = (new Date(y, mIdx, 1).getDay() + 6) % 7;
    const days = [], sk = { speaking: 0, writing: 0, reading: 0, listening: 0 }; let mTotal = 0;
    for (let i = 1; i <= count; i++) {
      const d = logs[dKey(new Date(y, mIdx, i))], c = d?.count || 0; mTotal += c;
      if (d?.skills) (['speaking', 'writing', 'reading', 'listening'] as const).forEach(s => { sk[s] += d.skills?.[s] || 0; });
      days.push({ day: i, count: c, lvl: Math.min(4, Math.ceil(c / 2)) });
    }
    const tot = Object.values(sk).reduce((a, b) => a + b, 0) || 1;
    return { days, first, mTotal, skills: { speaking: Math.round((sk.speaking / tot) * 100), writing: Math.round((sk.writing / tot) * 100), reading: Math.round((sk.reading / tot) * 100), listening: Math.round((sk.listening / tot) * 100) } };
  }, [logs, mIdx]);

  const { skillList, overallScore } = useMemo(() => {
    const p = progress?.skills || [];
    const get = (s: SkillType) => { const it = p.find(x => x.skill === s), score = it?.estimate || (isIELTS ? 6.5 : 65); return { score: Number(score.toFixed(1)), acc: it?.accuracy || 75, att: it?.attempts || 0 }; };
    const [l, r, w, s] = [get('listening'), get('reading'), get('writing'), get('speaking')];
    const items = [
      { name: 'Listening', ...l }, { name: 'Reading', ...r }, { name: 'Writing', ...w }, { name: 'Speaking', ...s },
      { name: isIELTS ? 'Fluency' : 'Pronunciation', score: Number(((s.score + l.score) / 2).toFixed(1)), acc: 80, att: s.att + l.att },
      { name: isIELTS ? 'Vocabulary' : 'Oral Fluency', score: Number(((w.score + r.score) / 2).toFixed(1)), acc: 80, att: w.att + r.att },
    ].map(x => ({ ...x, gap: Number((x.score - targetNum).toFixed(1)) }));
    return { skillList: items, overallScore: (items.reduce((a, b) => a + b.score, 0) / items.length).toFixed(isIELTS ? 1 : 0) };
  }, [progress, isIELTS, targetNum]);

  const rad = 105, cx = 150, cy = 150;
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos((i * Math.PI) / 3 - Math.PI / 2), y: cy + r * Math.sin((i * Math.PI) / 3 - Math.PI / 2) });
  const poly = (r: number | ((i: number) => number)) => skillList.map((_, i) => { const p = pt(i, (typeof r === 'function' ? r(i) : r) * rad); return `${p.x},${p.y}`; }).join(' ');
  const anchors = [{ dx: 0, dy: -10, a: 'middle' }, { dx: 10, dy: 0, a: 'start' }, { dx: 10, dy: 10, a: 'start' }, { dx: 0, dy: 15, a: 'middle' }, { dx: -10, dy: 10, a: 'end' }, { dx: -10, dy: 0, a: 'end' }] as const;
  const predicted = user?.estimate?.value ? (isIELTS ? user.estimate.value.toFixed(1) : String(Math.round(user.estimate.value))) : isIELTS ? '7.0' : '72';
  const readiness = Math.min(100, Math.round((Number(predicted) / targetNum) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 pb-12">
      <input type="file" ref={fileRef} accept="image/*" onChange={e => onUpload(e)} className="hidden" /><input type="file" ref={coverRef} accept="image/*" onChange={e => onUpload(e, true)} className="hidden" />

      {/* Hero Card */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-gradient-to-r from-[#0c1e4c] via-[#123e8e] to-[#1c6fe9]">
          {cover && <img src={cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
          <div className="absolute top-4 left-4 sm:left-6 z-20 flex items-center gap-1.5"><button type="button" onClick={() => coverRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/70 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition shadow-sm"><Camera className="w-3.5 h-3.5" /><span>Change cover</span></button>{cover && <button type="button" onClick={e => onRemove(e, true)} className="p-1.5 rounded-xl bg-black/45 hover:bg-rose-600 text-white border border-white/20 backdrop-blur-md transition shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
          <div className="absolute top-4 right-4 sm:right-6 z-20 flex items-center bg-black/45 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-md"><span className="text-[10px] font-bold text-white/70 uppercase px-2 hidden sm:inline">Track:</span>{(['IELTS', 'PTE'] as const).map(exam => <button key={exam} type="button" onClick={() => setActiveExam(exam)} className={`px-3 py-1 text-xs font-extrabold rounded-lg transition ${targetExam === exam ? 'bg-white text-blue-900 shadow-sm' : 'text-white/80 hover:text-white'}`}>{exam}</button>)}</div>
        </div>
        <div className="px-5 sm:px-8 pb-7 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="-mt-16 sm:-mt-20 relative z-10 inline-block">
              <div onClick={() => fileRef.current?.click()} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-slate-100 dark:bg-zinc-800 shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer">{photo ? <img src={photo} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-bold text-muted-foreground text-xs">photo</span>}<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-bold"><Camera className="w-5 h-5 mb-1" /><span>{photo ? 'Change' : 'Upload'}</span></div></div>
              <div className="absolute bottom-0 right-0 flex items-center gap-1 z-20"><button type="button" onClick={() => fileRef.current?.click()} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-card"><Camera className="w-3.5 h-3.5" /></button>{photo && <button type="button" onClick={e => onRemove(e)} className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md border-2 border-card"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{user?.name || 'sachin'}</h1><span className="bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase border border-border">{planId === 'elite' ? <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> ELITE</span> : planId?.toUpperCase() || 'FREE'}</span></div>
              <p className="text-xs sm:text-sm font-medium text-foreground/90">{isIELTS ? `IELTS Academic · Target Band ${target}` : `PTE Academic · Target Score ${target}`} · Exam on {user?.examDate ? new Date(user.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '12 Sep 2026'}</p>
              <p className="text-xs text-muted-foreground">{user?.nepalRegion || 'Kathmandu'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1"><Link to="/practice" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /><span>Assign practice</span></Link><button type="button" onClick={openEdit} className="border border-border hover:bg-muted/70 bg-card text-foreground font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /><span>Edit profile</span></button></div>
          </div>
          <div className="w-full lg:w-[380px] space-y-4 shrink-0">
            <div className="grid grid-cols-3 gap-2.5">{[{ v: predicted, l: isIELTS ? 'Predicted band' : 'Predicted score' }, { v: String(Math.round((totalSessions * 15) / 60)), l: 'Practice hours' }, { v: String(user?.subscription?.mockTestsUsed ?? 0), l: 'Scored mocks' }].map((s, i) => <div key={i} className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-zinc-900/60 p-3 text-center"><div className="text-2xl font-black text-foreground">{s.v}</div><div className="text-[10px] text-muted-foreground font-medium truncate">{s.l}</div></div>)}</div>
            <div className="space-y-1.5"><div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>Readiness to Target</span><span>{readiness}%</span></div><div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${readiness}%` }} /></div></div>
          </div>
        </div>
      </div>

      {/* Practice Activity */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-foreground">Practice activity</h2><p className="text-xs text-muted-foreground">{view === 'yearly' ? `${yearTotal} sessions in 12 months` : `${monthData.mTotal} sessions in ${MONTHS[mIdx]}`}</p></div>
          <div className="flex items-center gap-4"><div className="text-xs font-bold text-foreground">{streak}d <span className="text-[9px] text-muted-foreground font-normal">STREAK</span></div><div className="flex bg-muted/60 p-1 rounded-xl border border-border">{(['yearly', 'monthly'] as const).map(m => <button key={m} onClick={() => setView(m)} className={`px-2.5 py-1 text-xs font-bold capitalize rounded-lg transition ${view === m ? 'bg-card text-blue-600 shadow-xs' : 'text-muted-foreground'}`}>{m}</button>)}</div></div>
        </div>
        {view === 'yearly' ? (
          <div className="overflow-x-auto no-scrollbar min-w-[700px] space-y-1">
            <div className="flex text-[10px] text-muted-foreground pl-7">{headers.map((h, i) => <div key={i} style={{ width: `${100 / headers.length}%` }}>{h.name}</div>)}</div>
            <div className="flex gap-1"><div className="flex flex-col justify-between text-[10px] text-muted-foreground w-6 py-0.5 select-none"><span>Mon</span><span>Wed</span><span>Fri</span></div><div className="flex gap-[3.5px] flex-1">{weeks.map((w, wi) => <div key={wi} className="flex flex-col gap-[3.5px]">{w.map((d, di) => <div key={di} title={`${d.count} sessions on ${d.date}`} className={`w-3 h-3 rounded-[3px] transition ${HEAT[d.lvl]}`} />)}</div>)}</div></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2"><div className="flex items-center gap-2"><button onClick={() => setMIdx(p => p === 0 ? 11 : p - 1)} className="p-1 rounded border border-border hover:bg-muted"><ChevronLeft className="w-3.5 h-3.5" /></button><span className="text-xs font-bold">{MONTHS[mIdx]}</span><button onClick={() => setMIdx(p => p === 11 ? 0 : p + 1)} className="p-1 rounded border border-border hover:bg-muted"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-[10px] font-bold text-muted-foreground">{d}</div>)}{Array.from({ length: monthData.first }).map((_, i) => <div key={i} className="h-9" />)}{monthData.days.map(d => <div key={d.day} className={`h-9 rounded-lg border border-border p-1 flex flex-col justify-between ${d.count ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200' : 'bg-card'}`}><span className="text-[10px] font-bold">{d.day}</span><span className="text-[8px] text-muted-foreground">{d.count ? `${d.count}s` : ''}</span></div>)}</div>
            </div>
            <div className="md:col-span-4 rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs"><span className="font-bold">Skills Breakdown</span>{[{ l: 'Speaking', v: monthData.skills.speaking, icon: Mic }, { l: 'Writing', v: monthData.skills.writing, icon: PenTool }, { l: 'Reading', v: monthData.skills.reading, icon: BookOpen }, { l: 'Listening', v: monthData.skills.listening, icon: Headphones }].map(s => <div key={s.l} className="space-y-0.5"><div className="flex justify-between text-[11px]"><span className="flex items-center gap-1 text-muted-foreground"><s.icon className="w-3 h-3 text-blue-500" />{s.l}</span><span className="font-bold">{s.v}%</span></div><div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${s.v}%` }} /></div></div>)}</div>
          </div>
        )}
      </div>

      {/* Skill Profile */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-foreground">Skill profile ({isIELTS ? 'IELTS Academic' : 'PTE Academic'})</h2><p className="text-xs text-muted-foreground">{isIELTS ? 'Evaluated band per skill (0–9.0)' : 'Evaluated score per skill (10–90)'}</p></div><div className="flex bg-muted/60 p-1 rounded-xl border border-border">{(['radar', 'breakdown'] as const).map(m => <button key={m} onClick={() => setSkillView(m)} className={`px-2.5 py-1 text-xs font-bold capitalize rounded-lg transition ${skillView === m ? 'bg-card text-blue-600 shadow-xs' : 'text-muted-foreground'}`}>{m}</button>)}</div></div>
        {skillView === 'radar' ? (
          <div className="flex justify-center py-1">
            <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-full max-w-[300px] overflow-visible select-none">
              {[0.25, 0.5, 0.75, 1.0].map((l, i) => <polygon key={i} points={poly(l)} fill="none" stroke="currentColor" className="text-slate-200 dark:text-zinc-800" strokeWidth="1" />)}
              {skillList.map((_, i) => <line key={i} x1={cx} y1={cy} x2={pt(i, rad).x} y2={pt(i, rad).y} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" strokeWidth="1" />)}
              <polygon points={poly(Math.min(1, targetNum / maxScale))} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" /><polygon points={poly(i => Math.min(1, Math.max(0.05, skillList[i].score / maxScale)))} fill="rgba(59, 130, 246, 0.2)" stroke="#2563eb" strokeWidth="2" />
              {skillList.map((s, i) => { const p = pt(i, Math.min(1, Math.max(0.05, s.score / maxScale))), lbl = pt(i, rad), anc = anchors[i]; return <g key={i}><circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#2563eb" strokeWidth="2" /><text x={lbl.x + anc.dx} y={lbl.y + anc.dy} textAnchor={anc.a} className="text-[10px] font-bold fill-foreground">{s.name} <tspan className="text-blue-600 font-black">{s.score}</tspan></text></g>; })}
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">{skillList.map(s => <div key={s.name} className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-1.5 text-xs"><div className="flex justify-between font-bold"><span>{s.name}</span><span className={`text-[9px] px-1.5 py-0.5 rounded ${s.gap >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{s.gap >= 0 ? 'Target Met' : String(s.gap)}</span></div><div className="text-base font-black text-foreground">{s.score} <span className="text-[11px] font-normal text-muted-foreground">/ {maxScale}</span></div><div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.round((s.score / maxScale) * 100))}%` }} /></div></div>)}</div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border"><span className="text-xs font-bold text-muted-foreground uppercase">{isIELTS ? 'Overall band (0–9.0)' : 'Overall score (10–90)'}</span><span className="text-xl font-black text-foreground font-mono">{overallScore}</span></div>
      </div>

      {/* Edit Modal */}
      {isEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border"><h3 className="text-sm font-bold text-foreground">Edit Profile &amp; Goals</h3><button onClick={() => setIsEdit(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <div className="space-y-3 text-xs">
              <div><label className="font-bold">Full Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div>
              <div><label className="font-bold">Track</label><div className="grid grid-cols-2 gap-2 mt-1">{(['PTE', 'IELTS'] as const).map(e => <button key={e} type="button" onClick={() => setForm({ ...form, exam: e, score: e === 'IELTS' ? '8.0' : '79' })} className={`py-1.5 rounded-xl border text-xs font-bold transition ${form.exam === e ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-foreground'}`}>{e} Academic</button>)}</div></div>
              <div className="grid grid-cols-2 gap-2.5"><div><label className="font-bold">{form.exam === 'IELTS' ? 'Band (0-9)' : 'Score (10-90)'}</label><input type="number" step={form.exam === 'PTE' ? '1' : '0.5'} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div><div><label className="font-bold">Test Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1" /></div></div>
              <div><label className="font-bold">City / Region</label><select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="w-full h-8.5 rounded-xl border border-input bg-card px-3 text-xs mt-1">{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            </div>
            <div className="pt-2 border-t border-border flex justify-end gap-2"><button type="button" onClick={() => setIsEdit(false)} className="px-3 py-1.5 text-xs rounded-xl hover:bg-muted font-medium text-muted-foreground">Cancel</button><button type="button" onClick={handleSave} disabled={saving || !form.name.trim()} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 disabled:opacity-50">{saved ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span> : saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
