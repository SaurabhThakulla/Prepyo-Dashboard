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
    throw new ApiError(0, { code: 'network_error', message: '' });
  }

  if (res.status === 204) return undefined as T;

  let payload: any;
  try {
    payload = await res.json();
  } catch {
    // Something answered that was not our API: a proxy error page, a gateway
    // timeout, a middlebox. There is nothing here worth showing a learner, so
    // errorMessage supplies the wording.
    throw new ApiError(res.status, {
      code: 'bad_response',
      message: '',
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

/**
 * Wording this app owns, keyed by the stable error code.
 *
 * Anything a learner reads comes from here unless the server is the only one
 * that knows the specifics (see SERVER_WORDED). That keeps messages written for
 * a developer — a rejected field name, a JSON offset, a proxy's error page —
 * from ever reaching a screen.
 */
const MESSAGES: Record<string, string> = {
  network_error: 'We could not reach Prepyo. Check your internet connection and try again.',
  bad_response: 'We could not reach Prepyo just now. Please try again in a moment.',
  bad_request: 'We could not process that. Please refresh the page and try again.',
  validation_failed: 'Please check the highlighted fields and try again.',
  not_found: 'We could not find what you were looking for.',
  too_many_requests: 'That was a lot of tries in a short time. Please wait a minute and try again.',
  internal_error: 'Something went wrong on our side. Please try again in a moment.',
};

/**
 * Codes where the server writes the copy, because only it knows the detail:
 * which plan allowance ran out, that an email is already taken, why evaluation
 * is unavailable. These messages are hand-written for learners in the handlers.
 */
const SERVER_WORDED: ReadonlySet<string> = new Set([
  'unauthorized',
  'forbidden',
  'conflict',
  'limit_reached',
  'ai_unavailable',
]);

const GENERIC = 'Something went wrong. Please try again.';

/** Longer than any real message; a guard against painting a wall of text. */
const MAX_MESSAGE_LENGTH = 200;

function usable(message: string | undefined): message is string {
  if (!message) return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
}

/**
 * Turns any thrown value into something safe to show a learner.
 *
 * Every path through this function returns copy we control or copy the server
 * wrote for a learner. A raw error, a stack, or an unrecognised code all come
 * out as the generic line rather than leaking whatever they contained.
 */
export function errorMessage(err: unknown, fallback = GENERIC): string {
  if (!(err instanceof ApiError)) return fallback;

  // A rejected field is the most actionable thing we can say, so it wins.
  if (err.fields) {
    const first = Object.values(err.fields).find(usable);
    if (first) return first.trim();
  }

  if (SERVER_WORDED.has(err.code) && usable(err.message)) {
    return err.message.trim();
  }

  return MESSAGES[err.code] ?? fallback;
}
