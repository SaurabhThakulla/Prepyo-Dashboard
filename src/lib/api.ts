// The one place the frontend talks to the API.
//
// Requests go to /api/v1/* on our own origin and Next proxies them to the Go
// backend (see next.config.js). Because it is same-origin, the HttpOnly session
// cookie is sent automatically and there is no token for page scripts to leak.

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

/** Thrown for any non-2xx response. `code` is the stable string to branch on. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }

  /** No session, or it expired. Callers usually send the learner to /login. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** A plan allowance ran out, e.g. the daily evaluation limit. */
  get isLimitReached(): boolean {
    return this.code === 'limit_reached';
  }

  /** The AI provider is not configured or is unreachable. */
  get isAIUnavailable(): boolean {
    return this.code === 'ai_unavailable';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildPath(path: string, query?: Query): string {
  const base = `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // Skip empty filters so "all" selections don't narrow the query.
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function request<T>(method: string, path: string, options: { body?: unknown; query?: Query } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildPath(path, options.query), {
      method,
      // Same-origin already sends cookies, but being explicit means this keeps
      // working if the API ever moves to its own hostname.
      credentials: 'include',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    // fetch only rejects when the request never completed.
    throw new ApiError(0, {
      code: 'network_error',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  }

  if (res.status === 204) return undefined as T;

  let payload: any;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(res.status, {
      code: 'bad_response',
      message: 'The server returned an unreadable response.',
    });
  }

  if (!res.ok || payload?.success === false) {
    const err: ApiErrorBody = payload?.error ?? {
      code: 'internal_error',
      message: 'Something went wrong. Please try again.',
    };
    throw new ApiError(res.status, err);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, { body }),
};

/** Turns any thrown value into something safe to show a learner. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) return err.message;
  return fallback;
}
