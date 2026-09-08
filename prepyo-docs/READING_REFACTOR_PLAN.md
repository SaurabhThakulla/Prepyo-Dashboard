# Reading refactor — implementation plan

Status: **implemented.** All six phases shipped; see [What shipped](#what-shipped)
at the end for the deviations from this plan. The plan below is left as written
so the two can be compared.

Companion to [READING_ARCHITECTURE.md](READING_ARCHITECTURE.md), which this plan
supersedes where the two differ. Three deliberate reductions from that proposal,
following your constraints:

- **No `question_types` registry table.** You asked to keep the existing
  `typeId` system. Type ids stay exactly as they are; the renderer registry
  lives in TypeScript only.
- **No canonical type-id rename.** `reading-true-false` stays
  `reading-true-false`. It is the contract with the grader, the seeds and
  `correct_answers`, and renaming it buys nothing this refactor needs.
- **`reading_reorder_items` is not folded into the passage model.** It works,
  it is isolated, and folding it is migration risk with no payoff here.

---

## 1. Files and tables affected

### Backend — `D:\Prepyo-Backend`

| File | Change | Phase |
|---|---|---|
| `migrations/000023…000027` | new | 1–4, 6 |
| `internal/models/models.go` | `AnswerSubmission.Exam`, `Question.SupportedExams`, `PracticeAttempt.Exam`, `Mistake.Exam` | 1, 3 |
| `internal/practice/handler.go` | resolve exam from request/user, not from the question | 1 |
| `internal/practice/repository.go` | `SaveParams.Exam`, INSERT + SELECT columns | 1 |
| `internal/mistakes/mistakes.go` | `RecordParams.Exam`; filter on `m.exam` not `q.exam` | 1 |
| `internal/progress/progress.go` | 3 queries move off `q.exam` | 1 |
| `internal/questions/repository.go` | `selectFields` gains `supported_exams`; `List` filters on it | 3 |
| `internal/reading/repository.go` | `TaskTypes`, `PickPracticeGroup`, `PickMockPassages`, blueprint reads | 2, 4 |
| `internal/reading/service.go` | `PaperSlots` const → blueprint rows; `buildSets`/`hydrate` rebuild from stored ids | 4 |
| `internal/reading/handler.go` | unchanged (already resolves exam via `examFor`) | – |
| `internal/scoring/scoring.go` | `scoring_config` read with `points` fallback | 4 |

Untouched by design: `internal/mocks` (`GradeAnswers` and the fixed-mock path),
`internal/billing`, `internal/evaluations`, `internal/gamification`.

### Backend — tables

| Table | Change |
|---|---|
| `questions` | `+ supported_exams TEXT[]`, `+ source_paragraphs TEXT[]`, `+ scoring_config JSONB`; `exam` → nullable (ph. 6) |
| `practice_attempts` | `+ exam TEXT NOT NULL` |
| `mistakes` | `+ exam TEXT NOT NULL` |
| `user_passage_exposures` | `+ exam TEXT`, PK becomes `(user_id, passage_id, exam, context)` |
| `reading_passages` | `exam` → nullable (ph. 2), dropped (ph. 6) |
| `reading_mock_blueprints` | new |
| `reading_mock_blueprint_slots` | new |
| `reading_question_groups` | `paper_slot` deprecated, dropped (ph. 6) |
| `reading_mock_sessions` | unchanged — `question_ids TEXT[]` stays |

### Frontend — `D:\prepyo`

| File | Change | Phase |
|---|---|---|
| `src/lib/readingTypes.ts` | renderer keys alongside the existing type ids | 5 |
| `src/components/reading/ReadingQuestionRow.tsx` | `AnswerControl` → explicit registry, fallback removed | 5 |
| `src/components/reading/renderers/*` | 8 new renderer components | 5 |
| `src/components/reading/ReadingGroupCard.tsx` | pass group context (paragraph labels, resources) to renderers | 5 |
| `src/lib/types/index.ts` | `supportedExams` on `Question` | 3 |
| `src/lib/hooks/useReading.ts` | send `exam` with practice submissions | 1 |

---

## 2. Current dependency graph

```
reading_passages.exam ──┬─► TaskTypes           ($1='' OR p.exam=$1)
                        ├─► PickPracticeGroup   ($3='' OR p.exam=$3)
                        ├─► PickMockPassages    (p.exam=$2)   ← hard filter
                        └─► 000008 seed: questions.exam := p.exam

questions.exam ─────────┬─► mistakes.go:67  filter
                        ├─► mistakes.go:81  projection
                        ├─► progress.go:70  score estimate
                        ├─► progress.go:142 skill breakdown
                        └─► progress.go:235 bank size
                        (billing joins questions for group_id ONLY — not exam)

questions.exam_version_id ─► practice/handler.go:157 → practice_attempts.exam_version_id

reading_question_groups.paper_slot ─┬─► PickMockPassages  (COUNT DISTINCT = 3)
                                    ├─► buildSets         (slot filter)
                                    └─► PaperSlots  (Go const, 13/13/14)

reading_mock_sessions.question_ids ─► hydrate() → filter + sortByOrder   [immutability]

group_id ─► billing.SubTestKeyForQuestion  → daily sub-test quota
```

**Note on the `000009` guard.** The 13/13/14 assertion is a one-shot `DO $$`
block that already ran; it is not a live constraint and blocks nothing today.
What actually persists is (a) `PickMockPassages` requiring
`COUNT(DISTINCT paper_slot) = 3` per passage, and (b) `buildSets` filtering by
slot. Those two are the live version of the assumption and are what phase 4
removes. The `word_count >= 700` CHECK from the same migration is a real
constraint and stays.

---

## 3. Exact migration changes

### `000023_attempt_exam_context` — phase 1

```sql
ALTER TABLE practice_attempts ADD COLUMN exam TEXT;
UPDATE practice_attempts a SET exam = q.exam FROM questions q WHERE q.id = a.question_id;
ALTER TABLE practice_attempts
    ALTER COLUMN exam SET NOT NULL,
    ADD CONSTRAINT practice_attempts_exam_valid CHECK (exam IN ('PTE','IELTS'));
CREATE INDEX idx_practice_attempts_user_exam ON practice_attempts(user_id, exam, created_at DESC);

ALTER TABLE mistakes ADD COLUMN exam TEXT;
UPDATE mistakes m SET exam = q.exam FROM questions q WHERE q.id = m.question_id;
ALTER TABLE mistakes
    ALTER COLUMN exam SET NOT NULL,
    ADD CONSTRAINT mistakes_exam_valid CHECK (exam IN ('PTE','IELTS'));
```

`mistakes` keeps `UNIQUE (user_id, question_id)`. A mistake is one row per
learner per question and `exam` records the context of the most recent failure.
Splitting the key to `(user_id, question_id, exam)` would let one question sit
twice in the bank; I judge that worse. Flagging it because it is a semantic call,
not a mechanical one.

### `000024_question_eligibility` — phase 3

```sql
ALTER TABLE questions
    ADD COLUMN supported_exams   TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN source_paragraphs TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN scoring_config    JSONB  NOT NULL DEFAULT '{}';

UPDATE questions SET supported_exams = ARRAY[exam] WHERE supported_exams = '{}';

ALTER TABLE questions ADD CONSTRAINT questions_supported_exams_nonempty
    CHECK (cardinality(supported_exams) > 0);

CREATE INDEX idx_questions_supported_exams ON questions USING GIN (supported_exams);
```

### `000025_passage_exam_neutral` — phase 2

```sql
ALTER TABLE reading_passages ALTER COLUMN exam DROP NOT NULL;
ALTER TABLE reading_passages ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE user_passage_exposures ADD COLUMN exam TEXT NOT NULL DEFAULT 'IELTS';
ALTER TABLE user_passage_exposures DROP CONSTRAINT user_passage_exposures_pkey;
ALTER TABLE user_passage_exposures ADD PRIMARY KEY (user_id, passage_id, exam, context);
```

The `'IELTS'` default is correct for every existing row — the only PTE passage
(`rp-time-01`) has no generated mock and PTE practice exposure is negligible —
but the migration asserts it rather than assuming:

```sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM user_passage_exposures e
               JOIN reading_passages p ON p.id = e.passage_id
              WHERE p.exam <> 'IELTS') THEN
    RAISE EXCEPTION 'exposure backfill: non-IELTS passage exposures exist; backfill by passage exam instead';
  END IF;
END $$;
```

### `000026_mock_blueprints` — phase 4

```sql
CREATE TABLE reading_mock_blueprints (
    id               TEXT PRIMARY KEY,
    mock_id          TEXT NOT NULL REFERENCES mocks(id),   -- mock_attempts.mock_id FK still needs this
    exam             TEXT NOT NULL CHECK (exam IN ('PTE','IELTS')),
    passage_count    INT  NOT NULL CHECK (passage_count > 0),
    total_questions  INT  NOT NULL CHECK (total_questions > 0),
    duration_minutes INT  NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX idx_reading_blueprint_active ON reading_mock_blueprints(exam) WHERE is_active;

CREATE TABLE reading_mock_blueprint_slots (
    blueprint_id   TEXT NOT NULL REFERENCES reading_mock_blueprints(id) ON DELETE CASCADE,
    position       INT  NOT NULL,
    type_ids       TEXT[] NOT NULL,
    question_count INT  NOT NULL CHECK (question_count > 0),
    PRIMARY KEY (blueprint_id, position)
);
```

Seeded IELTS blueprint reproduces today's paper exactly (3 passages, 40
questions, 13/13/14 over the same type sets), so phase 4 is a no-op for IELTS
behaviour — which is what makes it testable against current output.

Seeded PTE blueprint (**needs your confirmation, see Open questions**), following
the current official PTE Academic Reading format of 13–18 items in ~30 minutes:

| Position | Types | Items |
|---|---|---|
| 1 | `fill-in-blanks-rw` | 5 |
| 2 | `fill-in-blanks-r` | 4 |
| 3 | `reading-mcq-single` | 2 |
| 4 | `reading-mcq-multiple` | 2 |
| 5 | `reorder-paragraphs` | 2 |

### `000027_pte_sets_on_shared_passages` — phase 4, data only

The §15 proof. No new passage text: PTE question sets authored on the three
existing IELTS passages (gapped rewrites derived from their own paragraphs), and
an IELTS TFNG + Matching Information set authored on `rp-time-01`.

### `000028_drop_legacy_exam` — phase 6, destructive

```sql
ALTER TABLE reading_passages DROP COLUMN exam;
ALTER TABLE reading_question_groups DROP COLUMN paper_slot;
ALTER TABLE questions ALTER COLUMN exam DROP NOT NULL;   -- kept as authored-for hint
```

`questions.exam` is **made nullable, not dropped**, in this pass. Dropping it is
a separate migration once a full release cycle has confirmed no consumer reads
it.

---

## 4. How `questions.exam` migrates safely

Five read sites, each with its replacement:

| Site | Now | After |
|---|---|---|
| `mistakes.go:67` filter | `($2 = '' OR q.exam = $2)` | `($2 = '' OR m.exam = $2)` |
| `mistakes.go:81` projection | `q.exam` | `m.exam` |
| `progress.go:70` score estimate | `q.exam = $2` | `a.exam = $2` |
| `progress.go:142` skill breakdown | `q.exam = $2` | `a.exam = $2` |
| `progress.go:235` bank size | `q.exam = $2` | `$2 = ANY(q.supported_exams)` |

Line 235 is the odd one out and must not be converted to `a.exam`: it counts how
much of the *bank* exists for an exam, which is a property of the question, not
of any attempt.

**Where the attempt's exam comes from.** Today `practice/handler.go:157` takes
`ExamVersionID` from `question.ExamVersionID`, which is passage-derived and
becomes wrong for a shared question. New flow, mirroring `reading.examFor`
exactly:

```
exam := sub.Exam, defaulting to user.TargetExam        (validated)
reject unless exam ∈ question.SupportedExams           (422)
version := exams.Current(exam)                         (not question.ExamVersionID)
save attempt with exam + version
```

The eligibility check is the part that keeps grading honest: an IELTS-only TFNG
question can no longer be attempted under a PTE context and land in PTE progress.

Ordering guarantee: phase 1 writes `practice_attempts.exam` and switches
consumers **before** phase 2 stops passages from being exam-owned, so at no point
does a consumer read a column whose meaning has changed underneath it.

---

## 5. How eligibility is represented

`questions.supported_exams TEXT[]`, backfilled from `exam`. Not on the passage,
not on the group.

The group inherits nothing: a group's eligibility is "the exams its questions
support", computed at query time. That is what lets one passage carry an IELTS
TFNG group and a PTE fill-in-blanks group side by side.

Selection filters move from passage-level to question-level:

```sql
-- PickPracticeGroup, after
WHERE g.type_id = $2
  AND EXISTS (SELECT 1 FROM questions q
               WHERE q.group_id = g.id AND q.is_published
                 AND ($3 = '' OR $3 = ANY(q.supported_exams)))
```

`TaskTypes` gets the same treatment, and its counts become per-exam correct
(today a PTE learner's menu counts IELTS questions if the type ids overlap —
`reading-mcq-single` is on both, so this is a live bug the refactor fixes).

Which questions get which value, from existing data:

| Questions | `supported_exams` |
|---|---|
| 120 IELTS passage questions | `{IELTS}` |
| 7 PTE passage questions | `{PTE}` |
| 3 reorder questions | `{PTE}` |
| new, authored in `000027` | per type |

MCQ-single and MCQ-multiple are the only types where `{IELTS,PTE}` is
defensible, and even there it is per-question, not automatic.

---

## 6. How IELTS/PTE mock selection works

`PaperSlots` (Go const) and `paper_slot` (column) are both replaced by
blueprint-driven selection:

```
blueprint := active blueprint for exam
for each slot in blueprint.slots (ordered):
    passage := unseen-first passage, not already used in THIS paper, that has
               ≥ slot.question_count published questions whose type_id ∈ slot.type_ids
               and whose supported_exams contains exam
    take that many questions from it, in group then group_position order
freeze the flattened question id list into reading_mock_sessions.question_ids
```

Consequences:

- **A passage no longer needs all three slots.** `COUNT(DISTINCT paper_slot) = 3`
  is gone; a passage qualifies for a slot if it has enough eligible questions of
  that slot's types. This is your §6 and §12.
- **PTE mocks work** through the same code, differing only in blueprint rows.
- **The `mocks` blueprint row stays.** `mock_attempts.mock_id` is a FK to
  `mocks(id)`, so a `mock-pte-reading-gen` row is added there too — dropping that
  indirection is not worth the FK churn.
- **Immutability is unchanged and slightly strengthened.** `question_ids TEXT[]`
  stays the authority. `hydrate()` currently rebuilds groups by `paper_slot` and
  then filters against the stored ids; it will instead build *from* the stored
  ids and group them by their group/passage. A paper then cannot be affected by
  a blueprint edit, only by a question being unpublished — strictly better than
  today.
- Bank-too-small still fails loudly (`ErrBankTooSmall`) rather than dealing a
  short paper. With today's content a PTE paper cannot be filled, which is
  exactly why `000027` authors PTE sets on the shared passages.

---

## 7. Renderers that already exist

| Component | Covers | Quality |
|---|---|---|
| `BlankedText` | `fill-in-blanks-rw` (per-gap dropdowns), `fill-in-blanks-r` (drag from shared word bank, click-to-place keyboard path) | good, exam-accurate |
| `ReorderAnswer` | `reorder-paragraphs` (dnd-kit sortable, keyboard sensor) | good, exam-accurate |
| `OptionGrid` | everything with `options` — the generic fallback | works, not exam-accurate |
| `PassageReader` | passage context: split pane, `[A]`–`[J]` labels, highlighting, text sizing | good |
| plain `<input>` | `reading-sentence-completion` | works, not exam-accurate |

So two of the twelve are already right, and the passage-context half of the
experience is already built.

## 8. Renderers that are missing

| Renderer | Type ids | Why the fallback is wrong today |
|---|---|---|
| `VerdictTriad` | `reading-true-false`, `reading-yes-no-not-given` | renders as a 2-column card grid; should be three wide verdict buttons under the statement |
| `MCQSingleRenderer` | `reading-mcq-single` | shares a component with multi-select; intent is implicit |
| `MCQMultipleRenderer` | `reading-mcq-multiple` | no "choose N" affordance, no selected-count feedback |
| `ParagraphMatcher` | `reading-matching-information`, `reading-find-the-paragraph` | statements render as separate cards each with a full A–J grid; should be a compact matcher against the labelled passage |
| `SentenceCompletion` | `reading-sentence-completion` | bare input under the sentence; the gap belongs *inside* the sentence |
| `OrderedChoice` | `reading-arrange-passage` | "choose the box that belongs at each position" currently renders as a plain option grid |
| `MatchingHeadings` | *(new type, no data yet)* | not implemented at all |
| `UnsupportedType` | fallback | today an unknown type silently renders an option grid; it should say so, matching how `scoring.Grade` refuses to guess |

Registry keyed on the **existing** type ids, no rename:

```ts
const RENDERERS: Record<string, ComponentType<AnswerProps>> = {
  [READING_TYPES.trueFalse]:            VerdictTriad,
  [READING_TYPES.yesNoNotGiven]:        VerdictTriad,
  [READING_TYPES.matchingInformation]:  ParagraphMatcher,
  [READING_TYPES.findTheParagraph]:     ParagraphMatcher,
  [READING_TYPES.sentenceCompletion]:   SentenceCompletion,
  [READING_TYPES.arrangePassage]:       OrderedChoice,
  [READING_TYPES.mcqSingle]:            MCQSingleRenderer,
  [READING_TYPES.mcqMultiple]:          MCQMultipleRenderer,
  [READING_TYPES.fillBlanksRW]:         PTEFillBlankDropdown,
  [READING_TYPES.fillBlanksR]:          PTEFillBlankDrag,
  [READING_TYPES.reorderParagraphs]:    ReorderParagraph,
};
// no `if (question.options?.length)` fallback — unknown → UnsupportedType
```

Every renderer reads and writes the existing `AnswerSubmission` shape
(`selectedOptions` / `blankResponses` / `textResponse`), so **no grading change
is needed for any of them**. The passage stays on screen for every passage-backed
type (your §11); only `passageDisplay === 'hidden'` groups suppress it, which is
already how the gap-fills work.

---

## 9. How existing data migrates

| Data | Before | After |
|---|---|---|
| `rp-choc-01`, `rp-bees-01`, `rp-paper-01` | `exam='IELTS'` | exam-neutral |
| `rp-time-01` | `exam='PTE'` | exam-neutral |
| 120 IELTS questions | `exam='IELTS'` | `supported_exams={IELTS}`, ids unchanged |
| 7 PTE questions | `exam='PTE'` | `supported_exams={PTE}`, ids unchanged |
| 3 reorder items + questions | `exam='PTE'` | `supported_exams={PTE}`, table unchanged |
| existing `practice_attempts` | exam via join | own `exam` column, backfilled |
| existing `mistakes` | exam via join | own `exam` column, backfilled |
| existing `reading_mock_sessions` | `question_ids TEXT[]` | unchanged |
| in-flight sessions | — | abandoned in phase 4 (see §10 of the architecture doc) |

**No question id changes, no passage id changes, no question deletions.** That is
what keeps `practice_attempts`, `mistakes`, `ai_evaluations` and existing mock
sessions resolving.

The proof that the architecture works, using only existing text: after `000027`,
`rp-choc-01` carries IELTS TFNG/Matching/Sentence-Completion **and** PTE
fill-in-blanks/MCQ sets, and `rp-time-01` carries PTE sets **and** an IELTS
TFNG set — one passage row each, two exams.

---

## 10. Tests that must pass before phase 6

Your 16, mapped to where they land. DB-backed tests follow the existing
`internal/billing/metering_db_test.go` pattern (`TEST_DATABASE_URL`, skip when
unset).

| # | Test | File |
|---|---|---|
| 1 | shared passage deals to IELTS practice | `reading/selection_db_test.go` |
| 2 | shared passage deals to PTE practice | `reading/selection_db_test.go` |
| 3 | IELTS-only question never appears in a PTE paper | `reading/selection_db_test.go` |
| 4 | PTE-only question never appears in an IELTS paper | `reading/selection_db_test.go` |
| 5 | `{IELTS,PTE}` question reachable from both | `reading/selection_db_test.go` |
| 6 | existing attempts still resolve their questions | `practice/attempt_db_test.go` |
| 7 | existing mistakes still resolve their questions | `mistakes/mistakes_db_test.go` |
| 8 | progress attributes to the attempt's exam, not the question's | `progress/progress_db_test.go` |
| 9 | quota still counts by `group_id`, unaffected by exam | `billing/metering_db_test.go` (existing, must stay green) |
| 10 | adding a question to a passage does not change a dealt paper | `reading/immutability_db_test.go` |
| 11 | IELTS paper still composes 3 passages / 40 questions / 13-13-14 | `reading/blueprint_db_test.go` |
| 12 | PTE paper composes independently from its own blueprint | `reading/blueprint_db_test.go` |
| 13 | every type id resolves to its own renderer, unknown → Unsupported | `src/components/reading/__tests__/renderers.test.tsx` |
| 14 | each renderer emits the expected `AnswerSubmission` shape | `src/components/reading/__tests__/renderers.test.tsx` |
| 15 | `scoring.Grade` / `GradeAnswers` output unchanged for every seeded type | `scoring/scoring_test.go`, `mocks/grading_test.go` (existing) |
| 16 | migrations run clean from current production schema | `database/migrate_db_test.go` |

Note: the frontend has **no test runner configured today** (no vitest/jest in
`package.json`). Tests 13 and 14 need one added — small, but it is new tooling,
so flagging it rather than assuming.

Phase 6 does not start until 1–16 are green.

---

## 11. Phase plan

| Phase | Content | Migration | Risk |
|---|---|---|---|
| 1 | attempt/mistake exam context; 5 consumers migrated off `questions.exam` | `000023` | medium — touches progress + mistakes |
| 2 | passages exam-neutral; exposure exam-scoped | `000025` | low |
| 3 | `supported_exams`; selection filters move to question level | `000024` | medium — changes what practice deals |
| 4 | blueprints as data; PTE reading mock; `PaperSlots` retired; PTE sets on shared passages | `000026`, `000027` | high — mock composition |
| 5 | per-type renderers | none | low — additive UI |
| 6 | drop `reading_passages.exam`, `paper_slot`; `questions.exam` nullable | `000028` | one-way |

Migration order note: `000024` (phase 3) is numbered before `000025` (phase 2)
because eligibility must exist before passages stop carrying exam. I will number
files in **execution** order when writing them; the table above is grouped by
workstream for readability.

---

## Open questions

1. **PTE blueprint distribution** — the 5/4/2/2/2 in §3 follows the current
   official format (13–18 items, ~30 min). Confirm, or give me the exact
   distribution you want.
2. **`mistakes` uniqueness** — keep one row per learner per question with `exam`
   as the last-failure context (my recommendation), or split the key so a shared
   question can appear twice in the bank?
3. **Frontend test runner** — add vitest for tests 13/14, or verify renderers
   manually this pass?
4. **`000027` authoring volume** — how many PTE questions per shared passage do
   you want for the proof? A minimum viable PTE paper needs 15 items across 5
   type groups; I would author enough for exactly one paper unless you want more.
5. **PTE practice exposure** — `user_passage_exposures` gains `exam`, so a
   passage read in IELTS practice stays fresh for PTE. Confirm that is the
   behaviour you want (the alternative is one shared exposure across exams).

---

# What shipped

All six phases are implemented, migrated and tested. Notes below are where the
implementation differs from the plan above — the plan is left intact so the two
can be compared.

## Migrations

| Migration | What it does |
|---|---|
| `000023_attempt_exam_context` | `practice_attempts.exam`, `mistakes.exam`, both backfilled from the question |
| `000024_question_eligibility` | `questions.supported_exams`, `source_paragraphs`, `scoring_config` |
| `000025_passage_exam_neutral` | `reading_passages.exam` nullable, `metadata`; exposure keyed by exam |
| `000026_mock_blueprints` | `reading_mock_blueprints` + `_slots`; IELTS and PTE blueprints |
| `000027_shared_passage_content` | PTE tasks on the three IELTS passages, IELTS tasks on the PTE one |
| `000028_drop_passage_exam` | drops `reading_passages.exam` and `reading_question_groups.paper_slot` |

Every one has a down migration. All 28 run clean from an empty database.

## Five deviations from the plan

1. **Eight exam filters, not five.** The plan traced `questions.exam` to five
   sites. Two more were unqualified `exam = $1` inside `FROM questions` queries
   (`progress.go` bank size, `questions/repository.go` listing) and an eighth was
   `ListPassages`, which filtered the passage index by `reading_passages.exam`.
   All eight now read the attempt's exam or `supported_exams`.

2. **`questions.exam` is kept, not made nullable.** `internal/evaluations` reads
   it to pick a rubric for writing and speaking. It stays as the exam a question
   was *authored for*; `supported_exams` answers the different question of who
   may be dealt it.

3. **Blueprint slots are one row per task, not a `type_ids` array.** A section is
   "7 sentence completions then 6 True/False", not "13 of these types". With a
   single total, a greedy filler took all 13 from whichever set the passage
   listed first and the task mix drifted. Per-task counts reproduce today's IELTS
   paper exactly.

4. **Passage assignment backtracks.** Filling sections one at a time strands
   itself: `rp-choc-01` carries no multiple-answer set, so if the first three
   sections take the other three passages, section four has nothing left.
   `assignPassages` collects candidates per section, orders by scarcity and
   backtracks. This is what makes "not every passage carries every task type"
   safe rather than a latent failure.

5. **Hydration no longer re-runs composition.** It rebuilds a paper from its
   stored question ids and derives groups and passages from them. `000009` had to
   abandon every in-flight paper because composition changes broke rehydration;
   that dependency is gone, and `000026` abandons nothing.

## Tests

Backend `go test ./...` is green, including the pre-existing billing metering
suite. New DB-backed tests (skip without `TEST_DATABASE_URL`):

- `internal/reading/composition_db_test.go` — shared passages, per-exam
  eligibility in practice and in both papers, IELTS paper shape, PTE paper
  composition, immutability when a question is added, hydration stability.
- `internal/progress/exam_context_db_test.go` — progress follows the attempt not
  the question, cross-exam attempts do not leak, old attempts still resolve, the
  mistake bank filters per exam, bank size counts shared questions for both.

Frontend: **vitest added** (`npm test`). `renderers.test.tsx` covers the registry
and the answer shape each renderer emits — 14 tests.

## Verified end to end

Against a local API and a database carrying every migration:

- IELTS and PTE practice menus each show their own task types and counts.
- PTE practice deals "The Long Road of Papermaking" — a passage that was IELTS
  only — with PTE questions on it.
- IELTS practice deals Matching Information on "The Coming of Standard Time", the
  passage that was PTE only.
- IELTS mock: 3 passages, 40 questions, the same 13/13/14 task mix as before.
- PTE mock: 13 items over 4 passages plus 3 re-order items. It did not exist
  before this work.
- Submitting an IELTS-only question with `exam=PTE` is refused (422); the same
  question under IELTS records `exam=IELTS` with the IELTS exam version.

## Still open

- **Authoring.** Content is still hand-written SQL. Phase 4 of the roadmap in
  §14 of the brief, and the thing that stands between this architecture and
  thousands of passages.
- **Bank depth.** The PTE blueprint is 13 items because that is what four
  passages can fill. The counts are data — raise them as content lands, no code
  change.
- **`reading_reorder_items` keeps its own `exam`.** An item is not shared
  content, so there was nothing to decouple; folding it into the passage model
  was considered and rejected as migration risk without payoff.
