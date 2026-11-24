import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Sparkles,
  ChevronRight,
  Layers,
  FileText,
  AlignLeft,
  CheckSquare2,
  Search,
  ArrowUpDown,
  HelpCircle,
  Edit3,
  CheckCircle2,
  Compass,
  Volume2,
  RotateCw,
  Image,
  GraduationCap,
  MessageCircle,
  FileAudio,
  ListChecks,
  Highlighter,
  PenLine,
  Folder,
  CreditCard,
  ClipboardCheck,
  LayoutGrid,
  ChartColumn,
  Scale,
  MessagesSquare,
  Lightbulb,
  GitFork,
  ListOrdered,
  Lock,
  SpellCheck,
  Puzzle,
  Quote,
  ArrowLeftRight,
  Type,
  Link2,
  FlaskConical,
  Landmark,
  ScrollText,
  Globe,
  Shield,
  TrendingUp,
  Calculator,
  Triangle,
  Sigma,
  Ruler,
  Box,
  Languages,
  LucideIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { SecondaryNavItem } from './navigation';
import { SkillType } from '@/lib/types';

/** Skill colours for PTE score contributions: text on the white pill, text and bar in the tooltip. */
const SKILL_COLORS: Record<SkillType, { pill: string; pillDark: string; text: string; bar: string; label: string }> = {
  speaking: { pill: 'text-orange-500', pillDark: 'dark:text-orange-400', text: 'text-orange-500 dark:text-orange-400', bar: 'bg-orange-400', label: 'Speaking' },
  writing: { pill: 'text-sky-500', pillDark: 'dark:text-cyan-300', text: 'text-sky-500 dark:text-sky-400', bar: 'bg-sky-400', label: 'Writing' },
  reading: { pill: 'text-emerald-600', pillDark: 'dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', label: 'Reading' },
  listening: { pill: 'text-blue-900', pillDark: 'dark:text-white', text: 'text-blue-900 dark:text-blue-300', bar: 'bg-blue-900 dark:bg-blue-400', label: 'Listening' },
};

interface SecondaryNavListProps {
  items: SecondaryNavItem[];
  /** Heading shown above the list when the items are not already grouped. */
  fallbackHeading: string;
  /** Icon for that heading (the section's own icon). */
  fallbackIcon: LucideIcon;
  isItemActive: (item: SecondaryNavItem) => boolean;
  onNavigate: () => void;
  /** Lays the groups out side by side, for the top bar's wide panel. */
  columns?: boolean;
}

/** Renders a weight badge (e.g. "16%") with a little space between the number and '%' so they don't merge. */
function renderWeightBadge(weight: string) {
  if (weight.endsWith('%')) {
    return (
      <span className="inline-flex items-center justify-center">
        <span>{weight.slice(0, -1)}</span>
        <span className="ml-0.5">%</span>
      </span>
    );
  }
  return weight;
}

/** Returns the icon appropriate for the main topic/skill group. */
function getGroupIcon(groupName?: string): LucideIcon {
  const norm = (groupName ?? '').toLowerCase();
  if (norm.startsWith('unit ')) return GraduationCap;
  if (norm.includes('full mock')) return ClipboardCheck;
  if (norm.includes('sectional')) return LayoutGrid;
  if (norm.includes('result')) return ChartColumn;
  if (norm.includes('speak')) return Mic;
  if (norm.includes('writ')) return PenTool;
  if (norm.includes('read')) return BookOpen;
  if (norm.includes('listen')) return Headphones;
  if (norm.includes('study') || norm.includes('resource')) return Sparkles;
  if (norm === 'english') return Languages;
  if (norm.includes('general knowledge')) return Globe;
  if (norm.includes('mathematics')) return Calculator;
  return Folder;
}

/** Assigns topic-specific icons instead of repeating identical skill icons. */
function getSubtopicIcon(label: string, fallbackIcon: LucideIcon): LucideIcon {
  const norm = label.toLowerCase();

  // Reading subtopics
  if (norm.includes('complete the sentence') || norm.includes('sentence completion')) return AlignLeft;
  if (norm.includes('true and false') || norm.includes('true/false')) return CheckSquare2;
  if (norm.includes('find the writer')) return Search;
  if (norm.includes('match the heading') || norm.includes('arrange the passage') || norm.includes('re-order') || norm.includes('reorder')) return ArrowUpDown;
  if (norm.includes('yes / no') || norm.includes('yes/no')) return HelpCircle;
  if (norm.includes('matching') || norm.includes('match')) return Layers;
  if (norm.includes('multiple choice') || norm.includes('single answer')) return CheckCircle2;
  if (norm.includes('fill in the blank') || norm.includes('reading & writing')) return Edit3;

  // Writing subtopics
  if (norm.includes('describe the figure') || norm.includes('describe image')) return Image;
  if (norm.includes('agree or disagree') || norm.includes('opinion')) return PenLine;
  if (norm.includes('discuss both views')) return MessagesSquare;
  if (norm.includes('advantages')) return Scale;
  if (norm.includes('problem / solution')) return Lightbulb;
  if (norm.includes('cause / effect')) return GitFork;
  if (norm.includes('two-part')) return ListOrdered;
  if (norm.includes('summarize written') || norm.includes('summarize')) return FileText;
  if (norm.includes('essay')) return PenTool;

  // Speaking subtopics
  if (norm.includes('introduction')) return MessageCircle;
  if (norm.includes('cue card')) return Sparkles;
  if (norm.includes('read aloud')) return Volume2;
  if (norm.includes('repeat sentence')) return RotateCw;
  if (norm.includes('re-tell') || norm.includes('lecture')) return GraduationCap;
  if (norm.includes('short question')) return HelpCircle;

  // Listening subtopics
  if (norm.includes('spoken text') || norm.includes('audio')) return FileAudio;
  if (norm.includes('choose the correct') || norm.includes('multiple answers')) return ListChecks;
  if (norm.includes('navigating')) return Compass;
  if (norm.includes('highlight correct')) return Highlighter;
  if (norm.includes('missing word')) return HelpCircle;
  if (norm.includes('dictation')) return PenLine;

  // CDS question types
  if (norm.includes('spotting errors')) return SpellCheck;
  if (norm.includes('ordering of')) return ArrowUpDown;
  if (norm.includes('reading comprehension')) return BookOpen;
  if (norm.includes('cloze')) return Puzzle;
  if (norm.includes('idioms')) return Quote;
  if (norm.includes('synonyms')) return ArrowLeftRight;
  if (norm.includes('parts of speech')) return Type;
  if (norm.includes('paired words')) return Link2;
  if (norm.includes('general science')) return FlaskConical;
  if (norm.includes('polity')) return Landmark;
  if (norm.includes('history')) return ScrollText;
  if (norm.includes('geography')) return Globe;
  if (norm.includes('defence')) return Shield;
  if (norm.includes('economy')) return TrendingUp;
  if (norm.includes('arithmetic')) return Calculator;
  if (norm.includes('geometry') || norm.includes('trigonometry')) return Triangle;
  if (norm.includes('algebra')) return Sigma;
  if (norm.includes('mensuration')) return Box;
  if (norm.includes('statistics')) return Ruler;

  // Plan & subscription subtopics
  if (norm.includes('plan') || norm.includes('subscription')) return CreditCard;

  return fallbackIcon;
}

interface NavGroup {
  name?: string;
  icon?: LucideIcon;
  groupHref?: string;
  items: SecondaryNavItem[];
}

/** The list of links inside the blue menu panel; the open link is a white pill. */
export default function SecondaryNavList({
  items,
  fallbackHeading,
  fallbackIcon,
  isItemActive,
  onNavigate,
  columns = false,
}: SecondaryNavListProps) {
  const groups = useMemo(() => {
    const result: NavGroup[] = [];
    let currentGroup: NavGroup | null = null;

    for (const item of items) {
      if (!item.group) {
        if (currentGroup && currentGroup.name !== undefined) {
          result.push(currentGroup);
          currentGroup = null;
        }
        if (!currentGroup) {
          currentGroup = { items: [] };
        }
        currentGroup.items.push(item);
      } else {
        if (currentGroup && currentGroup.name === item.group) {
          currentGroup.items.push(item);
        } else {
          if (currentGroup) {
            result.push(currentGroup);
          }
          currentGroup = {
            name: item.group,
            groupHref: item.groupHref,
            items: [item],
          };
        }
      }
    }

    if (currentGroup) {
      result.push(currentGroup);
    }

    // Leading links with no group get the section's name as a collapsible heading.
    if (result[0] && !result[0].name) {
      result[0] = { ...result[0], name: fallbackHeading, icon: fallbackIcon };
    }

    return result;
  }, [items, fallbackHeading, fallbackIcon]);

  // A panel of plain pages with no groups (the Admin Hub) is one list of full
  // rows: each page with what it is for and any live count, and no badges.
  if (columns && items.length > 0 && items.every(item => !item.group)) {
    const FallbackIcon = fallbackIcon;
    return (
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="w-[min(52rem,calc(100vw-4rem))]">
          <div className="mb-2 flex items-center justify-between gap-3 px-2">
            <span className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00c4a7] text-white">
                <FallbackIcon className="h-4 w-4" />
              </span>
              {fallbackHeading}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/15">
              {items.length} {items.length === 1 ? 'page' : 'pages'}
            </span>
          </div>
          <div className="space-y-1">
            {items.map((item, idx) => (
              <HubRow key={`${item.href ?? item.label}-${idx}`} item={item} isActive={isItemActive(item)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-2 [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/35">
      <TooltipProvider delayDuration={120}>
        <div
          className={columns ? 'grid gap-3' : undefined}
          style={columns ? { gridTemplateColumns: `repeat(${Math.min(groups.length, 4)}, minmax(13rem, 18rem))` } : undefined}
        >
          {groups.map((group, groupIndex) => {
            if (!group.name) {
              return (
                <div key={`ungrouped-${groupIndex}`} className="space-y-1">
                  {group.items.map((item, idx) => (
                    <TooltipItem
                      key={`${item.href ?? item.label}-${idx}`}
                      item={item}
                      isActive={isItemActive(item)}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              );
            }

            const isGroupActive = group.items.some(item => isItemActive(item));

            return (
              <div
                key={`group-${group.name}-${groupIndex}`}
                className={columns ? 'rounded-2xl bg-white/[0.06] p-2 ring-1 ring-white/10' : groupIndex > 0 ? 'mt-5' : ''}
              >
                <GroupHeading
                  card={columns}
                  count={group.items.length}
                  groupName={group.name}
                  groupIcon={group.icon}
                  groupHref={group.groupHref}
                  isGroupActive={isGroupActive}
                  onNavigate={onNavigate}
                />

                {/* Tasks hang off the heading's icon on a guide line, like a folder tree. Groups always show their tasks. */}
                <div className={columns ? 'space-y-0.5' : 'ml-[13px] pl-2 border-l border-white/20 space-y-0.5'}>
                  {group.items.map((item, idx) => (
                    <TooltipItem
                      key={`${item.href ?? item.label}-${idx}`}
                      item={item}
                      isActive={isItemActive(item)}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}

interface GroupHeadingProps {
  /** Heading of a column card in the wide panel, rather than a full-width strip. */
  card?: boolean;
  count: number;
  groupName: string;
  groupIcon?: LucideIcon;
  groupHref?: string;
  isGroupActive: boolean;
  onNavigate: () => void;
}

function GroupHeading({
  card = false,
  count,
  groupName,
  groupIcon,
  groupHref,
  isGroupActive,
  onNavigate,
}: GroupHeadingProps) {
  const GroupIcon = groupIcon ?? getGroupIcon(groupName);

  return (
    // Flat full-width strip (bleeds past the list's px-3), square edges.
    <div
      className={card
        ? 'mb-1 flex items-center justify-between gap-2 border-b border-white/10 px-1.5 pb-2 pt-1'
        : `-mx-3 mb-1.5 flex items-center justify-between pl-4 pr-3 py-2 ${isGroupActive ? 'bg-white/15' : 'bg-white/[0.08]'}`}
    >
      <div className={`flex items-center gap-2.5 min-w-0 flex-1 ${isGroupActive ? 'text-white' : 'text-white/90'}`}>
        {card ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isGroupActive ? 'bg-[#00c4a7] text-white' : 'bg-white text-primary dark:text-blue-950'}`}>
            <GroupIcon className="h-4 w-4" />
          </span>
        ) : (
          <GroupIcon className={`w-[18px] h-[18px] shrink-0 ${isGroupActive ? 'text-[#00c4a7]' : ''}`} />
        )}
        {groupHref ? (
          <Link
            to={groupHref}
            onClick={onNavigate}
            className={`font-display text-[17px] font-semibold tracking-wide ${card ? 'leading-tight' : 'truncate'} hover:text-white transition-colors`}
          >
            {groupName}
          </Link>
        ) : (
          <span className={`font-display text-[17px] font-semibold tracking-wide ${card ? 'leading-tight' : 'truncate'}`}>{groupName}</span>
        )}
      </div>

      {card && <span className="shrink-0 text-[11px] font-medium text-white/55">{count} types</span>}
    </div>
  );
}

/** One page of the Admin Hub: its icon, name, what it is for and any live count. */
function HubRow({ item, isActive, onNavigate }: { item: SecondaryNavItem; isActive: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  const className = `group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white ${
    isActive ? 'bg-white text-primary shadow-lg shadow-black/15 dark:text-blue-950' : 'text-white hover:bg-white/10'
  }`;
  const body = (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
          isActive ? 'bg-primary text-white dark:bg-blue-950' : 'text-white/85 group-hover:bg-white/10'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight">{item.label}</span>
        {item.sublabel && (
          <span className={`mt-0.5 block truncate text-[13px] ${isActive ? 'text-slate-600 dark:text-blue-950/70' : 'text-white/65'}`}>{item.sublabel}</span>
        )}
      </span>
      {item.status && (
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
            item.status.tone === 'warn'
              ? isActive
                ? 'bg-amber-100 text-amber-800 ring-amber-200'
                : 'bg-amber-300/15 text-amber-200 ring-amber-300/30'
              : isActive
                ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                : 'bg-emerald-300/15 text-emerald-200 ring-emerald-300/30'
          }`}
        >
          {item.status.text}
        </span>
      )}
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${isActive ? '' : 'text-white/60'}`} />
    </>
  );
  if (item.href) {
    return (
      <Link to={item.href} onClick={onNavigate} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onNavigate();
      }}
      className={className}
    >
      {body}
    </button>
  );
}

function TooltipItem({
  item,
  isActive,
  onNavigate,
}: {
  item: SecondaryNavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavItem item={item} isActive={isActive} onNavigate={onNavigate} />
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        sideOffset={8}
        className="p-2.5 space-y-0.5 rounded-xl border border-border/90 bg-popover/95 backdrop-blur-xl shadow-2xl"
      >
        <div className="font-bold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
          <span>{item.label}</span>
          {item.weight && !item.contributions && (
            <span className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
              Weight: {renderWeightBadge(item.weight)}
            </span>
          )}
          {item.badge && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0 rounded font-semibold uppercase">
              {item.badge}
            </span>
          )}
        </div>
        {item.contributions && (
          <div className="pt-1.5 pb-1 w-[200px] space-y-1.5">
            <p className={`text-[11px] font-semibold ${SKILL_COLORS[item.contributions[0].skill].text}`}>Contribution</p>
            {item.contributions.map(({ skill, percent }) => (
              <div key={skill} className="flex items-center gap-2 text-[11px]">
                <span className="w-14 shrink-0 text-muted-foreground">{SKILL_COLORS[skill].label}</span>
                <span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <span className={`block h-full rounded-full ${SKILL_COLORS[skill].bar}`} style={{ width: `${percent}%` }} />
                </span>
                <span className={`w-8 shrink-0 text-right font-mono font-bold ${SKILL_COLORS[skill].text}`}>{percent}%</span>
              </div>
            ))}
          </div>
        )}
        {item.isLocked && item.lockedReason && (
          <p className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1 pt-0.5">
            <Lock className="w-3 h-3 shrink-0" /> {item.lockedReason}
          </p>
        )}
        {item.sublabel && !item.isLocked && (
          <p className="text-[11px] text-muted-foreground font-normal leading-tight max-w-[220px]">
            {item.sublabel}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Extends the HTML props so the tooltip trigger's hover and focus handlers reach the link.
interface NavItemProps extends React.HTMLAttributes<HTMLElement> {
  item: SecondaryNavItem;
  isActive: boolean;
  onNavigate: () => void;
}

const NavItem = React.forwardRef<HTMLElement, NavItemProps>(function NavItem(
  { item, isActive, onNavigate, onClick: triggerClick, className: _className, ...triggerProps },
  ref,
) {
  const toast = useToast();
  // Course lessons carry their state (done, open, locked) in the icon, so a
  // topic icon picked from the label must not replace it.
  const Icon = item.href?.startsWith('/learn') ? item.icon : getSubtopicIcon(item.label, item.icon);

  if (item.isLocked) {
    return (
      <button
        {...triggerProps}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={e => {
          triggerClick?.(e);
          toast.warning('Task unavailable', item.lockedReason ?? 'This task is not included in your selected exam.');
        }}
        className="group flex items-center justify-between gap-2 w-full text-left pl-1.5 pr-2 py-1.5 rounded-xl text-[13.5px] transition-all duration-150 outline-none text-white/45 hover:text-white/65 hover:bg-white/5 cursor-not-allowed font-medium select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 text-white/35">
            <Icon className="w-4 h-4" />
          </span>
          <span title={item.label} className="line-clamp-2 leading-tight">
            {item.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Lock className="w-3 h-3 text-white/40" />
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 font-bold uppercase rounded-md border-white/20 text-white/45 bg-white/5"
          >
            {item.badge || 'Locked'}
          </Badge>
        </div>
      </button>
    );
  }

  const className = `group flex items-center justify-between gap-2 w-full text-left pl-1.5 pr-2 py-1.5 rounded-xl text-[13.5px] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white ${
    isActive
      ? 'bg-white text-primary dark:text-blue-950 font-semibold shadow-lg shadow-black/15'
      : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
  }`;

  const content = (
    <>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Icon sits in a small tile so every row lines up */}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            isActive ? 'bg-primary/10 text-primary dark:text-blue-950' : 'bg-white/10 text-white/75 group-hover:bg-white/15 group-hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span title={item.label} className="leading-tight line-clamp-2">
          {item.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item.badge === 'AI' && (
          <span
            title="Scored by AI"
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isActive ? 'bg-primary/10 text-primary dark:text-blue-950' : 'bg-sky-300/15 text-sky-100'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </span>
        )}

        {item.contributions ? (
          <span
            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full font-mono inline-flex items-center gap-1 ${
              isActive ? 'bg-slate-100' : 'bg-white dark:bg-white/10'
            }`}
          >
            {item.contributions.map(({ skill, percent }, i) => (
              <React.Fragment key={skill}>
                {i > 0 && <span className="text-slate-300 dark:text-white/30">·</span>}
                <span className={`${SKILL_COLORS[skill].pill} ${isActive ? '' : SKILL_COLORS[skill].pillDark}`}>{percent}%</span>
              </React.Fragment>
            ))}
          </span>
        ) : item.weight && (
          <span
            className={`text-[11px] font-semibold tabular-nums whitespace-nowrap px-2 py-0.5 rounded-full min-w-[36px] text-center inline-flex items-center justify-center ${
              isActive
                ? 'bg-primary/10 text-primary dark:text-blue-950'
                : 'bg-white/10 text-white/75 ring-1 ring-inset ring-white/15 group-hover:text-white'
            }`}
            title={`Score Weight: ${item.weight}`}
          >
            {renderWeightBadge(item.weight)}
          </span>
        )}
      </div>

      {item.badge && item.badge !== 'AI' && (
        <Badge
          variant={isActive ? 'default' : 'outline'}
          className={`text-xs px-1.5 py-0 shrink-0 ml-auto font-bold uppercase rounded-sm ${
            isActive
              ? 'bg-primary text-white dark:bg-blue-950 border-transparent'
              : 'border-white/40 text-white/80'
          }`}
        >
          {item.badge}
        </Badge>
      )}
      {item.count !== undefined && (
        <span
          className={`text-xs font-bold px-1.5 py-0.2 rounded-sm shrink-0 ml-1.5 font-mono ${
            isActive
              ? 'bg-primary/15 text-primary dark:text-blue-950 border border-primary/30'
              : 'bg-amber-300/20 text-amber-200 border border-amber-300/40'
          }`}
        >
          {item.count}
        </span>
      )}
    </>
  );

  if (item.href) {
    const toHref =
      item.href.startsWith('/practice') && (item.href.includes('type=') || item.href.includes('mock='))
        ? (item.href.includes('drawer=') ? item.href : `${item.href}&drawer=open`)
        : item.href;

    return (
      <Link
        {...triggerProps}
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={toHref}
        onClick={e => {
          triggerClick?.(e);
          onNavigate();
        }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...triggerProps}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={e => {
        triggerClick?.(e);
        item.onClick?.();
        onNavigate();
      }}
      className={className}
    >
      {content}
    </button>
  );
});
