import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Sparkles,
  ChevronDown,
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
  isItemActive: (item: SecondaryNavItem) => boolean;
  onNavigate: () => void;
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

  // Plan & subscription subtopics
  if (norm.includes('plan') || norm.includes('subscription')) return CreditCard;

  return fallbackIcon;
}

interface NavGroup {
  name?: string;
  groupHref?: string;
  items: SecondaryNavItem[];
}

/** The list of links inside the blue secondary panel; the open link is a white pill. */
export default function SecondaryNavList({
  items,
  fallbackHeading,
  isItemActive,
  onNavigate,
}: SecondaryNavListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

    return result;
  }, [items]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-2 [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/35">
      {!items[0]?.group && (
        <h4 className="px-3 pt-1 pb-2 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
          {fallbackHeading}
        </h4>
      )}

      <TooltipProvider delayDuration={120}>
        <div>
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
            const isCollapsed = Boolean(collapsedGroups[group.name]) && !isGroupActive;

            return (
              <div
                key={`group-${group.name}-${groupIndex}`}
                className={groupIndex > 0 ? 'mt-5' : ''}
              >
                <GroupHeading
                  groupName={group.name}
                  groupHref={group.groupHref}
                  isGroupActive={isGroupActive}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleGroup(group.name!)}
                  onNavigate={onNavigate}
                />

                {!isCollapsed && (
                  // Tasks hang off the heading's icon on a guide line, like a folder tree.
                  <div className="ml-[13px] pl-2 border-l border-white/20 space-y-0.5">
                    {group.items.map((item, idx) => (
                      <TooltipItem
                        key={`${item.href ?? item.label}-${idx}`}
                        item={item}
                        isActive={isItemActive(item)}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}

interface GroupHeadingProps {
  groupName: string;
  groupHref?: string;
  isGroupActive: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}

function GroupHeading({
  groupName,
  groupHref,
  isGroupActive,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
}: GroupHeadingProps) {
  const GroupIcon = getGroupIcon(groupName);

  return (
    // Flat full-width strip (bleeds past the list's px-3), square edges.
    <div className={`-mx-3 mb-1.5 flex items-center justify-between pl-4 pr-3 py-2 ${isGroupActive ? 'bg-white/15' : 'bg-white/[0.08]'}`}>
      <div className={`flex items-center gap-2.5 min-w-0 flex-1 ${isGroupActive ? 'text-white' : 'text-white/90'}`}>
        <GroupIcon className={`w-[18px] h-[18px] shrink-0 ${isGroupActive ? 'text-[#00c4a7]' : ''}`} />
        {groupHref ? (
          <Link
            to={groupHref}
            onClick={onNavigate}
            className="font-display text-[17px] font-semibold tracking-wide truncate hover:text-white transition-colors"
          >
            {groupName}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="font-display text-[17px] font-semibold tracking-wide truncate text-left hover:text-white transition-colors"
          >
            {groupName}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="p-1 shrink-0 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        title={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
        aria-label={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
      >
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
      </button>
    </div>
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
            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full font-mono min-w-[36px] text-center inline-flex items-center justify-center ${
              isActive
                ? 'bg-primary text-primary-foreground dark:bg-black dark:text-white'
                : 'bg-white text-blue-950 dark:bg-white/10 dark:text-white'
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
