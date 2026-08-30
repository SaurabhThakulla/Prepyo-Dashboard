import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

/**
 * React Query holds fetched data in a cache keyed by query key, so navigating
 * away and back does not refetch, and two components asking for the same thing
 * share one request.
 *
 * Before this, every page refetched on mount. Dashboard → mistakes → dashboard
 * was three round trips; now it is one.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for a minute. Within that window, mounting a
        // component that wants it renders from cache with no request at all.
        staleTime: 60_000,
        // Keep it around for five minutes after the last component unmounts, so
        // going back to a page is instant.
        gcTime: 5 * 60_000,

        // The learner did not ask for a refetch by tabbing back to the browser,
        // and on a metered mobile connection they would not thank us for it.
        refetchOnWindowFocus: false,

        retry: (failureCount, error) => {
          // Retrying a 401 or a 404 just delays the error. Only retry the
          // failures that might genuinely be transient, and only twice.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState so the client is created once per browser session rather than on
  // every render, and is never shared between users during SSR.
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
