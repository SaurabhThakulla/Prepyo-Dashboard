import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * True below 768px, where the shadcn sidebar becomes a slide-in sheet. It reads the same
 * media query the CSS uses (md:), so the page's layout and the menu never disagree.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      return;
    }
    const query = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(query.matches);
    query.addEventListener('change', onChange);
    setIsMobile(query.matches);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
