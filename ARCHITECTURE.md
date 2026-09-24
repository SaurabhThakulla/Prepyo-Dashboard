# How this codebase is put together

A short tour for anyone joining. Read it once, then go read
[src/lib/types/index.ts](src/lib/types/index.ts) — the types are the best map
of what the app actually deals with.

## The product in four sentences

Prepyo helps learners in Nepal prepare for two English exams, **PTE** and
**IELTS**. Each exam has four **skills** (speaking, writing, reading,
listening), and each skill has **task types** defined by that exam's syllabus.
Learners answer **questions** one at a time in Practice, or sit a whole timed
**mock** exam. Answers are graded on the server — never in the browser.

## Where things live

```
index.html      the shell: title, fonts, #root
src/
  main.tsx      entry point: mounts the router and the providers
  App.tsx       the route table — every URL the app answers to
  pages/        one component per route, named after it
  components/
    ui/         generic primitives (Button, Card, Badge). No app logic.
    layout/     the shell: sidebar, header
    <feature>/  components for one feature (mocks/, practice/, auth/, dashboard/)
  lib/
    api.ts      the only place that talks to the backend
    types/      every shape the API returns
    hooks/      stateful logic pulled out of components
    fixtures.ts sample data for working without a backend
  context/      React context for app-wide state (user, exam, theme)
```

**Adding a page takes two steps, not one.** Under Next's App Router a route was
a folder with a `page.tsx` in it, and creating the folder created the URL. Now
you write the component in `pages/` and add a `<Route>` to
[App.tsx](src/App.tsx). The upside is that the entire URL surface — including
the redirects and the auth gating — is readable on one screen.

Pages are lazy-loaded so each one is its own bundle. A new page should be
`lazy(() => import(...))` like its neighbours; importing it directly still works
but quietly adds it to everyone's first download.

## The rules worth knowing

**1. Grading happens on the server.**
The browser never decides whether an answer is right. It sends the response and
renders what comes back. If you find yourself writing scoring logic in a
component, something has gone wrong.

**2. All requests go through `lib/api.ts`.**
Never call `fetch` directly. `api.get` / `api.post` handle auth, the `/api/v1`
prefix, and turn failures into `ApiError`. Use `errorMessage(err)` to get text
safe to show a learner.

**3. Reads go through a hook in `lib/hooks/`, never `api.get` in a component.**

Every GET is a React Query hook in
[useResources.ts](src/lib/hooks/useResources.ts) (or a dedicated file like
[useLeaderboard.ts](src/lib/hooks/useLeaderboard.ts)). Adding one:

```ts
export function useThings(exam: ExamType) {
  return useQuery({
    queryKey: queryKeys.things(exam),
    queryFn: () => api.get<{ things: Thing[] }>('/things', { exam }),
  });
}
```

Then in the page:

```ts
const { data, isPending, error } = useThings(activeExam);
const things = data?.things ?? [];
```

Why it matters: two components asking for the same thing share **one** request,
and navigating away and back reads from cache instead of refetching. The
dashboard and the leaderboard page both call `useLeaderboard(exam)`, so the
dashboard's rank card costs no extra request. Keys live in
[queryKeys.ts](src/lib/queryKeys.ts) — two callers must build the *same* key or
they will not share.

Writes still use `api.post` directly. After one, either update the cache with
`queryClient.setQueryData` or invalidate it with `invalidateQueries`, so the
screen reflects what just happened.

**4. Show the error. Do not swallow it.**

```ts
useEffect(() => {
  if (error) toast.error('Could not load things', errorMessage(error));
}, [error]);
```

Never render sample data in place of a failure. A learner who sees
confident-looking wrong data is worse off than one who sees "could not load".
This mistake has already been made here once — see fixtures below.

**5. Prices and quotas have no fallback.**
[src/pages/SubscriptionPage.tsx](src/pages/SubscriptionPage.tsx) shows an error
rather than a guess, because whatever it displays must match what checkout
charges.

**6. Numbered mock tests are permanent and immutable.**
Every section mock (PTE & IELTS) displays numbered papers (Test 1, 2, 3...) via
`MockPaperList` and `MockPaperDrawer`. Papers never regenerate on the catalog GET
and revisions are immutable. For full design rules and architecture, see
[Prepyo-Backend/docs/mock-papers.md](../Prepyo-Backend/docs/mock-papers.md).

## Working without a backend

Set this in `.env.local` and restart:

```
VITE_USE_FIXTURES=true
```

Queries then use `src/data/*.json` as React Query `placeholderData`, via
[src/lib/fixtures.ts](src/lib/fixtures.ts). Placeholder data is *not* cached —
the real request still runs and still reports its errors. Fixtures only fill
the empty first render so you can build UI. The flag is off by default and must
stay off in production.

## When a file gets long

The pattern used throughout: **a page decides what to show; components render
it; a hook holds the state.**

[src/pages/MocksPage.tsx](src/pages/MocksPage.tsx) is the clearest example.
It picks one of four screens and does nothing else. The exam itself —
questions, countdown, answers, submitting — lives in
[useMockExam](src/lib/hooks/useMockExam.ts). Each screen is its own component
in `components/mocks/`.

PTE mock tests follow the same split on their own route
(`/mocks/pte/:kind`): [PteMockPage](src/pages/PteMockPage.tsx) picks the
screen, [usePteTestRunner](src/lib/hooks/usePteTestRunner.ts) holds the live
paper, and each task is drawn by a component in
[components/pteMock/items](src/components/pteMock/items). The server owns the
order, every clock and the score — see `Prepyo-Backend/docs/pte-mock.md`.

Rules of thumb:

- More than ~250 lines, or more than ~5 `useState` calls → look for a split.
- If a chunk of JSX has its own heading and its own state, it is a component.
- If a page early-returns different screens, each of those is a component.
- Data (menu entries, tab lists, skill configs) goes in a plain array or a
  separate `.ts` file — see
  [sidebar/navigation.ts](src/components/layout/sidebar/navigation.ts).

## Known scaling limits

These are real and not yet fixed. Worth knowing before you build on them.

- **`GET /questions` is unpaginated.** [useQuestions](src/lib/hooks/useResources.ts)
  pulls every question for a skill into memory, and QuestionNavigator renders
  all of them into the DOM. Fine at today's volume; it will not survive a few
  thousand per skill. Needs `limit`/`offset` on the endpoint.
- **The mistake bank ignores its own pagination.** The endpoint returns
  `{total, limit, offset, hasMore}` and the UI shows page one forever. The
  backend side already works — the frontend just needs a "load more".
- **Rank requires downloading the whole leaderboard.** See the TODO in
  [useLeaderboard.ts](src/lib/hooks/useLeaderboard.ts). Adding `rank` to
  `GET /progress` turns a list scan into a field read.
- **`examVersionId` is received and ignored.** The backend pins attempts to a
  syllabus version; nothing in the UI surfaces it.
- **The syllabus is duplicated across two repos.** `SYLLABUS` in
  [syllabus.ts](src/lib/syllabus.ts) is a hardcoded list of task-type names,
  matched against backend `typeName` values by string normalisation
  (`typeKey`). Rename a task type on the backend and the sidebar link silently
  matches nothing — no error, no type failure. Serving the syllabus from the
  API would remove the whole class of bug.

## Things to be careful about

- **`as any` is almost always hiding a bug.** A flag button here asked for a
  Button variant that did not exist; the cast silenced it and the button
  rendered with no styling for months. If a type does not fit, fix the type.
- **The dashboard shows placeholder numbers.** Skill scores, readiness, and the
  "Weakest skill" card are from the original design mock, not from the API.
  See the note at the top of
  [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx).
- **`.env.local` may point at the production backend.** Check before assuming a
  local API change will show up in your browser.
- **One dev server at a time.** A stray `vite` process still holding port 3000
  will serve a different checkout than the one you are editing, which reads as
  broken CSS or stale data. Check the port before debugging the code.

## Before you push

```bash
npm run typecheck
```

There is no ESLint config wired up yet, so `tsc` is the gate.
