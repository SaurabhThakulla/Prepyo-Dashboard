import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { buildMobileTabs, getMobileTab } from './mobileNav';

/** True while the on-screen keyboard is likely up: a text field has focus. */
function useTypingFocus(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (el: Element | null) =>
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        el.tagName === 'TEXTAREA' ||
        (el.tagName === 'INPUT' &&
          !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes((el as HTMLInputElement).type)));
    const update = () => setTyping(isField(document.activeElement));
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);
    return () => {
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
    };
  }, []);
  return typing;
}

/**
 * The phone's bottom tab bar: five destinations, always one tap away.
 *
 * Below `lg` only; the desktop keeps its sidebar. It steps aside while a text
 * field has focus, because Android lifts fixed bars above the keyboard, where
 * the bar would sit on top of what the learner is typing.
 */
export default function MobileTabBar() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { user, activeExam } = useApp();
  const typing = useTypingFocus();

  const tabs = buildMobileTabs(activeExam, user);
  const current = getMobileTab(pathname, searchParams);

  return (
    <nav
      aria-label="Main"
      className={cn(
        'lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl',
        'pb-[env(safe-area-inset-bottom)] transition-transform duration-200',
        typing && 'translate-y-full',
      )}
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = tab.id === current;
          return (
            <li key={tab.id} className="flex">
              <Link
                to={tab.href}
                aria-current={active ? 'page' : undefined}
                onClick={event => {
                  // Tapping the tab you are already on takes you to its top,
                  // the way native apps do.
                  if (active && pathname === tab.href.split('?')[0]) {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={cn(
                  'group flex flex-1 select-none flex-col items-center justify-center gap-1 text-[11px] font-semibold outline-none [-webkit-tap-highlight-color:transparent]',
                  'transition-colors focus-visible:text-primary',
                  active ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 group-active:scale-90',
                    active ? 'bg-primary/10 dark:bg-primary/20' : 'bg-transparent',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
                </span>
                <span className="leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
