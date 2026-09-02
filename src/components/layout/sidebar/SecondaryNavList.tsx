import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SecondaryNavItem } from './navigation';

interface SecondaryNavListProps {
  items: SecondaryNavItem[];
  /** Heading shown above the list when the items are not already grouped. */
  fallbackHeading: string;
  isItemActive: (item: SecondaryNavItem) => boolean;
  onNavigate: () => void;
}

/** The list of links inside the secondary panel, with its group headings. */
export default function SecondaryNavList({
  items,
  fallbackHeading,
  isItemActive,
  onNavigate,
}: SecondaryNavListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
      {!items[0]?.group && (
        <div className="px-2.5 py-1.5 rounded-lg bg-muted/80 dark:bg-muted/50 border border-border/50">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            {fallbackHeading} Options
          </h4>
        </div>
      )}

      <TooltipProvider delayDuration={120}>
        <div className="space-y-1 pt-1">
          {items.map((item, index) => {
            // One heading per run, so "Study Resources" and the skill headings
            // stay legible now that they share this panel.
            const previousGroup = index > 0 ? items[index - 1].group : undefined;
            const startsGroup = Boolean(item.group) && item.group !== previousGroup;

            return (
              <React.Fragment key={`${item.href ?? item.label}-${index}`}>
                {startsGroup && <GroupHeading item={item} onNavigate={onNavigate} />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavItem item={item} isActive={isItemActive(item)} onNavigate={onNavigate} />
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
              </React.Fragment>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}

function GroupHeading({ item, onNavigate }: { item: SecondaryNavItem; onNavigate: () => void }) {
  return (
    <div className="mt-3.5 mb-1.5 first:mt-0 px-2.5 py-1.5 rounded-lg bg-muted/80 dark:bg-muted/50 border border-border/50">
      <h5 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
        {item.groupHref ? (
          <Link to={item.groupHref} onClick={onNavigate} className="hover:text-primary transition-colors block">
            {item.group}
          </Link>
        ) : (
          <span>{item.group}</span>
        )}
      </h5>
    </div>
  );
}

interface NavItemProps {
  item: SecondaryNavItem;
  isActive: boolean;
  onNavigate: () => void;
}

/**
 * One row. Renders as a Link when it has an href and a button otherwise, but
 * looks identical either way.
 *
 * forwardRef because Tooltip's `asChild` trigger needs a ref on the real
 * element underneath.
 */
const NavItem = React.forwardRef<HTMLElement, NavItemProps>(function NavItem(
  { item, isActive, onNavigate },
  ref,
) {
  const Icon = item.icon;

  const className = `group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
    isActive
      ? 'bg-accent text-accent-foreground font-semibold shadow-xs ring-1 ring-primary/20'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.99]'
  }`;

  const content = (
    <>
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
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
