import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Video,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Search,
  Play,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Layers,
  GraduationCap,
  PlaySquare,
  Award,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TUTORIAL_VIDEOS, TutorialVideo } from '@/data/tutorials';
import { SkillType } from '@/lib/types';

export default function TutorialsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeExam } = useApp();

  const skillParam = searchParams.get('skill') as SkillType | null;
  const videoParam = searchParams.get('video');

  const [selectedExam, setSelectedExam] = useState<'all' | 'IELTS' | 'PTE'>('all');
  const [selectedSkill, setSelectedSkill] = useState<SkillType | 'all'>(skillParam || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const playerRef = useRef<HTMLDivElement>(null);

  // Sync skillParam with internal state if query param changes
  useEffect(() => {
    if (skillParam && ['speaking', 'writing', 'reading', 'listening'].includes(skillParam)) {
      setSelectedSkill(skillParam);
    } else if (!skillParam) {
      setSelectedSkill('all');
    }
  }, [skillParam]);

  // Set default exam from user preference if on first load
  useEffect(() => {
    if (activeExam) {
      setSelectedExam(activeExam);
    }
  }, [activeExam]);

  // Filter video list
  const filteredVideos = useMemo(() => {
    return TUTORIAL_VIDEOS.filter(video => {
      // Exam filter
      if (selectedExam !== 'all' && video.exam !== selectedExam && video.exam !== 'both') {
        return false;
      }
      // Skill filter
      if (selectedSkill !== 'all' && video.skill !== selectedSkill) {
        return false;
      }
      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = video.title.toLowerCase().includes(q);
        const matchesInstructor = video.instructor.toLowerCase().includes(q);
        const matchesDesc = video.description.toLowerCase().includes(q);
        const matchesTakeaways = video.keyTakeaways.some(t => t.toLowerCase().includes(q));
        return matchesTitle || matchesInstructor || matchesDesc || matchesTakeaways;
      }
      return true;
    });
  }, [selectedExam, selectedSkill, searchQuery]);

  // Active / featured video
  const activeVideo: TutorialVideo | null = useMemo(() => {
    if (videoParam) {
      const found = TUTORIAL_VIDEOS.find(v => v.id === videoParam);
      if (found) return found;
    }
    return filteredVideos[0] ?? TUTORIAL_VIDEOS[0] ?? null;
  }, [videoParam, filteredVideos]);

  const selectVideo = (video: TutorialVideo) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('video', video.id);
      return next;
    });
    // Smooth scroll to player on mobile
    if (window.innerWidth < 1024 && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const setSkillFilter = (skill: SkillType | 'all') => {
    setSelectedSkill(skill);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (skill === 'all') {
        next.delete('skill');
      } else {
        next.set('skill', skill);
      }
      return next;
    });
  };

  const skillTabs: { id: SkillType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Lessons', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'speaking', label: 'Speaking', icon: <Mic className="w-3.5 h-3.5" /> },
    { id: 'writing', label: 'Writing', icon: <PenTool className="w-3.5 h-3.5" /> },
    { id: 'reading', label: 'Reading', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'listening', label: 'Listening', icon: <Headphones className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Video className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Video Tutorials & Masterclasses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Watch proven exam strategies, template breakdowns, and scoring secrets for Speaking, Writing, Reading, and
            Listening.
          </p>
        </div>

        {/* Exam switcher pill */}
        <div className="flex items-center bg-card p-1 rounded-xl border border-border shrink-0 self-start lg:self-auto">
          {(['all', 'IELTS', 'PTE'] as const).map(exam => (
            <button
              key={exam}
              type="button"
              onClick={() => setSelectedExam(exam)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedExam === exam
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {exam === 'all' ? 'All Exams' : exam}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Skill filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {skillTabs.map(tab => {
            const count = TUTORIAL_VIDEOS.filter(
              v =>
                (selectedExam === 'all' || v.exam === selectedExam || v.exam === 'both') &&
                (tab.id === 'all' || v.skill === tab.id),
            ).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSkillFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedSkill === tab.id
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75 font-mono ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 md:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search strategies, topics..."
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Active Video Player Section ── */}
      {activeVideo && (
        <div ref={playerRef} className="space-y-4">
          <Card className="overflow-hidden border-border bg-card shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Left / Top: Responsive 16:9 Embedded YouTube Player */}
              <div className="lg:col-span-8 bg-black aspect-video relative flex items-center justify-center">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Right / Bottom: Lesson Metadata & Quick Action */}
              <div className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between space-y-4 border-t lg:border-t-0 lg:border-l border-border bg-card/60">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-bold text-[10px] uppercase">
                      {activeVideo.exam}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="font-bold text-[10px] uppercase bg-primary/10 text-primary border-primary/20"
                    >
                      {activeVideo.skill}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activeVideo.duration}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {activeVideo.level}
                    </Badge>
                  </div>

                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-foreground leading-snug">
                    {activeVideo.title}
                  </h2>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{activeVideo.instructor}</span>
                    <span>•</span>
                    <span>Verified Masterclass</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {activeVideo.description}
                  </p>
                </div>

                {/* Key Takeaways */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Key Exam Strategies
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {activeVideo.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick Practice & Mock Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => navigate(activeVideo.practiceUrl)}
                    className="w-full gap-2 font-bold shadow-sm"
                  >
                    <span>Practice {activeVideo.skill.toUpperCase()} Questions</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => navigate(activeVideo.mockUrl)}
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 font-bold"
                  >
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span>Open {activeVideo.exam} {activeVideo.skill} Mock Tests</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Video Catalog Grid ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {selectedSkill === 'all'
                ? 'All Available Lessons'
                : `${selectedSkill.charAt(0).toUpperCase() + selectedSkill.slice(1)} Video Masterclasses`}
            </h3>
            <p className="text-xs text-muted-foreground">
              Showing {filteredVideos.length} {filteredVideos.length === 1 ? 'lesson' : 'lessons'}
            </p>
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <Card className="p-12 text-center space-y-3 bg-muted/20 border-dashed">
            <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No tutorial videos match your filter</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search query or selecting "All Exams" to explore more strategy lessons.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedExam('all');
                setSelectedSkill('all');
                setSearchQuery('');
              }}
              className="mt-2"
            >
              Reset Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map(video => {
              const isActive = activeVideo?.id === video.id;

              return (
                <Card
                  key={video.id}
                  onClick={() => selectVideo(video)}
                  className={`overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col justify-between group ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]'
                      : 'hover:border-primary/40 bg-card'
                  }`}
                >
                  <div>
                    {/* Thumbnail container */}
                    <div className="aspect-video w-full relative overflow-hidden bg-black/80">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-10 w-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="h-4 w-4 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Duration pill */}
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white">
                        {video.duration}
                      </span>

                      {/* Now Playing badge */}
                      {isActive && (
                        <span className="absolute top-2 left-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          Playing
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          {video.exam}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0">
                          {video.skill}
                        </Badge>
                      </div>

                      <h4 className="font-display text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {video.title}
                      </h4>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-3 pt-1 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{video.instructor}</span>
                    <span className="text-[10px]">{video.level}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
