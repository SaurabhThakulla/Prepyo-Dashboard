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
  LucideIcon,
} from 'lucide-react';
import { SecondaryNavItem } from './navigation';

interface SecondaryNavListProps {
  items: SecondaryNavItem[];
  /** Heading shown above the list when the items are not already grouped. */
  fallbackHeading: string;
  isItemActive: (item: SecondaryNavItem) => boolean;
  onNavigate: () => void;
}

/** Returns the icon appropriate for the main topic/skill group. */
function getGroupIcon(groupName?: string): LucideIcon {
  const norm = (groupName ?? '').toLowerCase();
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
  if (norm.includes('arrange the passage') || norm.includes('re-order') || norm.includes('reorder')) return ArrowUpDown;
  if (norm.includes('yes / no') || norm.includes('yes/no')) return HelpCircle;
  if (norm.includes('matching') || norm.includes('match')) return Layers;
  if (norm.includes('multiple choice') || norm.includes('single answer')) return CheckCircle2;
  if (norm.includes('fill in the blank') || norm.includes('reading & writing')) return Edit3;

  // Writing subtopics
  if (norm.includes('describe the figure') || norm.includes('describe image')) return Image;
  if (norm.includes('agree or disagree') || norm.includes('opinion')) return PenLine;
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

/** The list of links inside the secondary panel, with adaptive light/dark blue headers. */
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
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      {!items[0]?.group && (
        <div className="px-2.5 py-1.5 rounded-xl bg-blue-50/90 dark:bg-[#112046] text-[#132d6c] dark:text-white border border-blue-200/70 dark:border-blue-900/60 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-100/90 dark:bg-white/10 flex items-center justify-center border border-blue-200/60 dark:border-white/10">
              <Folder className="w-3.5 h-3.5 text-blue-700 dark:text-blue-100" />
            </div>
            <h4 className="font-display text-[11px] font-bold uppercase tracking-wider text-[#132d6c] dark:text-white">
              {fallbackHeading}
            </h4>
          </div>
          <span className="text-[10px] font-semibold text-blue-800/80 dark:text-white/80 bg-white/80 dark:bg-white/10 px-1.5 py-0.2 rounded-full border border-blue-200/80 dark:border-white/20 font-mono">
            {items.length}
          </span>
        </div>
      )}

      <TooltipProvider delayDuration={120}>
        <div className="space-y-3">
          {groups.map((group, groupIndex) => {
            if (!group.name) {
              // Ungrouped items (like top-level links)
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
            // Keep group open if it contains the currently active topic
            const isCollapsed = Boolean(collapsedGroups[group.name]) && !isGroupActive;

            return (
              <div key={`group-${group.name}-${groupIndex}`} className="space-y-1">
                <GroupHeading
                  groupName={group.name}
                  groupHref={group.groupHref}
                  itemCount={group.items.length}
                  isGroupActive={isGroupActive}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleGroup(group.name!)}
                  onNavigate={onNavigate}
                />

                {!isCollapsed && (
                  <div className="ml-3.5 pl-2.5 border-l border-blue-200/60 dark:border-blue-800/30 space-y-1 pt-1 pb-0.5">
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
  itemCount: number;
  isGroupActive: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}

function GroupHeading({
  groupName,
  groupHref,
  itemCount,
  isGroupActive,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
}: GroupHeadingProps) {
  const GroupIcon = getGroupIcon(groupName);

  return (
    <div
      className={`group/header flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all duration-200 border ${
        isGroupActive
          ? 'bg-blue-100/95 dark:bg-[#142654] border-blue-300 dark:border-blue-400/60 ring-2 ring-blue-400/40 dark:ring-blue-400/50 text-[#0f255c] dark:text-white shadow-xs'
          : 'bg-blue-50/90 hover:bg-blue-100/75 dark:bg-[#112046] dark:hover:bg-[#152757] border-blue-200/70 dark:border-blue-900/60 text-[#132d6c] dark:text-white shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Micro-badge icon container: light blue in light mode, frosted in dark mode */}
        <div className="w-6 h-6 rounded-lg bg-blue-100/90 dark:bg-white/10 flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover/header:scale-105 border border-blue-200/60 dark:border-white/10">
          <GroupIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-200" />
        </div>

        {/* Group Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          {groupHref ? (
            <Link
              to={groupHref}
              onClick={onNavigate}
              className="font-display text-[11px] font-bold uppercase tracking-wider text-[#132d6c] hover:text-blue-600 dark:text-white dark:hover:text-blue-200 transition-colors truncate"
            >
              {groupName}
            </Link>
          ) : (
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[#132d6c] dark:text-white truncate">
              {groupName}
            </span>
          )}

          {/* Active indicator dot */}
          {isGroupActive && (
            <span className="relative flex h-1.5 w-1.5 shrink-0" title="Active module">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-500 dark:bg-cyan-300" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600 dark:bg-cyan-300" />
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Count Pill + Collapse Chevron */}
      <div className="flex items-center gap-1 shrink-0 ml-1.5">
        <span className="text-[10px] font-semibold text-blue-800/80 dark:text-white/80 bg-white/80 dark:bg-white/10 px-1.5 py-0.2 rounded-full border border-blue-200/80 dark:border-white/20 font-mono">
          {itemCount}
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-blue-700/70 hover:text-blue-950 dark:text-white/70 dark:hover:text-white hover:bg-blue-100/80 dark:hover:bg-white/15 transition-colors"
          title={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
          aria-label={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90 text-blue-600/60 dark:text-white/60' : 'rotate-0 text-blue-800/80 dark:text-white/90'
            }`}
          />
        </button>
      </div>
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
        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
          <span>{item.label}</span>
          {item.badge && (
            <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0 rounded font-semibold uppercase">
              {item.badge}
            </span>
          )}
        </div>
        {item.sublabel && (
          <p className="text-[11px] text-muted-foreground font-normal leading-tight max-w-[220px]">
            {item.sublabel}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface NavItemProps {
  item: SecondaryNavItem;
  isActive: boolean;
  onNavigate: () => void;
}

/**
 * One row. Renders as a Link when it has an href and a button otherwise.
 * Clean, unified blue active styling with no excessive colors.
 */
const NavItem = React.forwardRef<HTMLElement, NavItemProps>(function NavItem(
  { item, isActive, onNavigate },
  ref,
) {
  const Icon = getSubtopicIcon(item.label, item.icon);

  const className = `group flex items-center justify-between w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
    isActive
      ? 'bg-blue-100/70 dark:bg-blue-950/50 text-[#132d6c] dark:text-blue-300 font-semibold shadow-xs ring-1 ring-blue-300 dark:ring-blue-700/60'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.99]'
  }`;

  const content = (
    <>
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
        <Icon
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isActive ? 'text-[#132d6c] dark:text-blue-400' : 'text-muted-foreground/80 group-hover:text-foreground'
          }`}
        />
        <span className="truncate font-medium text-xs text-foreground/90">{item.label}</span>
      </div>

      {item.badge && (
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 border-border text-muted-foreground shrink-0 ml-1.5 font-semibold"
        >
          {item.badge}
        </Badge>
      )}
      {item.count !== undefined && (
        <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30 shrink-0 ml-1.5">
          {item.count}
        </span>
      )}
    </>
  );

  if (item.href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={item.href}
        onClick={onNavigate}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={() => {
        item.onClick?.();
        onNavigate();
      }}
      className={className}
    >
      {content}
    </button>
  );
});
