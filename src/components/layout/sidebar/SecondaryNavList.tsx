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
  if (norm.includes('match the heading') || norm.includes('arrange the passage') || norm.includes('re-order') || norm.includes('reorder')) return ArrowUpDown;
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
    <div className="flex-1 overflow-y-auto py-2 space-y-1">
      {!items[0]?.group && (
        <div className="px-4 py-1.5 bg-slate-200/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border-y border-slate-300/80 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-300/90 dark:bg-slate-700/90 flex items-center justify-center border border-slate-400/40 dark:border-slate-600/60 text-slate-900 dark:text-slate-100">
              <Folder className="w-3 h-3 text-slate-800 dark:text-slate-200" />
            </div>
            <h4 className="font-display text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {fallbackHeading}
            </h4>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={120}>
        <div className="space-y-1">
          {groups.map((group, groupIndex) => {
            if (!group.name) {
              return (
                <div key={`ungrouped-${groupIndex}`} className="space-y-0.5">
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
              <div key={`group-${group.name}-${groupIndex}`} className="space-y-0.5">
                <GroupHeading
                  groupName={group.name}
                  groupHref={group.groupHref}
                  isGroupActive={isGroupActive}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleGroup(group.name!)}
                  onNavigate={onNavigate}
                />

                {!isCollapsed && (
                  <div className="space-y-0.5 pt-0.5 pb-0.5">
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
    <div
      className={`group/header flex items-center justify-between w-full px-4 py-1.5 rounded-none transition-all duration-150 border-y ${
        isGroupActive
          ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-300/90 dark:border-blue-800/70 text-blue-950 dark:text-blue-100'
          : 'bg-slate-200/80 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800/90 border-slate-300/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/header:scale-105 border ${
            isGroupActive
              ? 'bg-blue-200/90 dark:bg-blue-900/80 border-blue-400/50 text-blue-700 dark:text-blue-300'
              : 'bg-slate-300/90 dark:bg-slate-700/90 border-slate-400/40 dark:border-slate-600/60 text-slate-900 dark:text-slate-100'
          }`}
        >
          <GroupIcon className="w-3 h-3" />
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          {groupHref ? (
            <Link
              to={groupHref}
              onClick={onNavigate}
              className={`font-display text-[11px] font-extrabold uppercase tracking-wider transition-colors truncate ${
                isGroupActive
                  ? 'text-blue-950 dark:text-blue-200 hover:text-blue-700'
                  : 'text-slate-900 dark:text-slate-100 hover:text-primary'
              }`}
            >
              {groupName}
            </Link>
          ) : (
            <span
              className={`font-display text-[11px] font-extrabold uppercase tracking-wider truncate ${
                isGroupActive ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {groupName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-slate-700/60 transition-colors"
          title={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
          aria-label={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90 text-slate-600 dark:text-slate-400' : 'rotate-0 text-slate-800 dark:text-slate-200'
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

const NavItem = React.forwardRef<HTMLElement, NavItemProps>(function NavItem(
  { item, isActive, onNavigate },
  ref,
) {
  const Icon = getSubtopicIcon(item.label, item.icon);

  const className = `group flex items-center justify-between w-full text-left pl-[22px] pr-3.5 py-2 rounded-none text-xs transition-colors duration-150 border ${
    isActive
      ? 'border-transparent bg-slate-100 dark:bg-white/10 text-foreground dark:text-white font-semibold shadow-xs'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-slate-100/60 dark:hover:bg-white/5 font-medium'
  }`;

  const content = (
    <>
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
        <Icon
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/80 group-hover:text-foreground'
          }`}
        />
        <span
          title={item.label}
          className={`line-clamp-2 text-xs leading-snug ${
            isActive ? 'font-semibold text-foreground dark:text-white' : 'font-medium text-foreground/85 group-hover:text-foreground'
          }`}
        >
          {item.label}
        </span>
      </div>

      {item.badge && (
        <Badge
          variant={isActive ? 'default' : 'outline'}
          className={`text-[9px] px-1.5 py-0 shrink-0 ml-1.5 font-bold uppercase rounded-sm ${
            isActive
              ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white border-transparent'
              : 'border-border text-muted-foreground'
          }`}
        >
          {item.badge}
        </Badge>
      )}
      {item.count !== undefined && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 ml-1.5 font-mono ${
            isActive
              ? 'bg-blue-500/25 text-blue-800 dark:text-blue-200 border border-blue-400/40'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30'
          }`}
        >
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
