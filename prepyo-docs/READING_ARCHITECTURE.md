# Shared-passage reading architecture — proposal

Status: **proposal, awaiting approval.** No code or schema has been changed.

Scope: the reading content model across `D:\Prepyo-Backend` (Go + Postgres) and
`D:\prepyo` (React). Written after reading migrations `000007`–`000022`,
`internal/reading`, `internal/questions`, `internal/scoring`, `internal/mocks`
and `src/components/reading`.

---

## 1. Current architecture

### Content tables

```
exam_versions ──┬── reading_passages ── reading_question_groups ──┐
                │        (exam)              (type_id, paper_slot) │
                ├── reading_reorder_items ────────────────────────┐│
                └── questions ◄───────────────────────────────────┴┴
                       (exam, type_id, passage_id, group_id,
                        reorder_item_id, options, blanks,
                        correct_answers, points)
```

The passage-first model **already exists** — migration `000007` introduced it
and its reasoning is sound. Questions deliberately stayed in the single flat
`questions` table because `practice_attempts`, `mistakes`, `ai_evaluations`,
scoring and mock grading all key off `questions.id`.

What is in the bank today:

| | passages | groups | questions | reorder items |
|---|---|---|---|---|
| IELTS | 3 (`rp-choc-01`, `rp-bees-01`, `rp-paper-01`) | 8 each | 120 | – |
| PTE | 1 (`rp-time-01`) | 4 | 7 | 3 |

### Exam scoping

- `reading_passages.exam TEXT NOT NULL CHECK (exam IN ('PTE','IELTS'))`
- `questions.exam` is **inherited from the passage** — `000008_reading_seed`
  literally selects `p.exam` into the question row.
- Every selection query filters on it: `PickPracticeGroup` (`p.exam = $3`),
  `PickMockPassages` (`p.exam = $2`), `TaskTypes` (`p.exam = $1`).

### Delivery paths

- **Practice** — `POST /reading/practice {exam, typeId}` → pick an unseen
  passage that carries a group of that type → return passage + one group.
  Exposure written to `user_passage_exposures(user_id, passage_id, 'practice')`.
- **Generated mock** — `POST /reading/mocks {exam}` → `GeneratedBlueprint(exam)`
  (only `mock-ielts-reading-gen` exists, so **PTE has no reading mock today**) →
  deal 3 unseen passages → assign paper slots 1/2/3 → freeze the flattened
  question id list into `reading_mock_sessions.question_ids TEXT[]`.
- **Fixed mocks** — `mocks` + `mock_sections.question_ids TEXT[]`.

Paper composition is a Go constant, not data:

```go
// internal/reading/service.go
var PaperSlots = []PaperSlot{
    {Slot: 1, Types: []string{TypeSentenceCompletion, TypeTrueFalse}, Questions: 13},
    {Slot: 2, Types: []string{TypeFindTheParagraph, TypeArrangePassage, TypeYesNoNotGiven}, Questions: 13},
    {Slot: 3, Types: []string{TypeSentenceCompletion, TypeMatchingInformation, TypeYesNoNotGiven}, Questions: 14},
}
```

with `reading_question_groups.paper_slot SMALLINT` on the group and a migration
guard in `000009` that **fails the migration** unless every published IELTS
passage carries exactly 13/13/14 questions across three slots.

### Scoring

`questions.points INT` plus one formula in `scoring.proportional`:
`score = round(correct/total × points)`. `scoring.Grade` dispatches on *field
presence* (`len(q.Blanks) > 0`, `len(q.CorrectAnswers) > 0 && len(q.Options) > 0`)
with two `type_id` special cases (`reorder-paragraphs`, `write-from-dictation`).
Every seeded IELTS reading question is `points = 1`; the PTE R&W gap-fill is
`points = 5`.

### Frontend

`src/lib/readingTypes.ts` holds the type-id contract; `ReadingQuestionRow`'s
`AnswerControl` is the renderer registry; `PassageReader` is the split pane with
highlighting; `BlankedText` and `ReorderAnswer` are the two specialised controls.

### Authoring

There is none. `internal/questions/handler.go` is read-only and `internal/admin`
exposes `/metrics` only. **All content is authored as hand-written SQL
migrations.**

---

## 2. Problems with the existing architecture

1. **The passage is owned by an exam.** `reading_passages.exam` is `NOT NULL`
   and every selection path filters on it. This is the single hard blocker on
   sharing content — it is not a naming problem, it is a foreign key on the
   wrong entity.

2. **A question cannot declare its own exam eligibility.** It inherits the
   passage's exam. Even with a shared passage there is nowhere to say "this
   TFNG set is IELTS only, this reorder is PTE only".

3. **`questions.exam` is load-bearing far outside reading.** It is joined in
   `progress.go` (3 queries), `mistakes.go` (2) and `billing.go` (2). An
   attempt's exam is derived from the *question*, so the moment a question
   serves both exams, every per-exam progress and quota number becomes
   ambiguous. `practice_attempts` has no `exam` column of its own.

4. **Paper composition is hardcoded and IELTS-shaped.** `PaperSlots`,
   `MockPassageCount = 3` and the `paper_slot` column all assume one exam's
   structure. PTE has no blueprint row and no slot model, so PTE reading mocks
   simply do not exist.

5. **`paper_slot` is a single integer on the group**, so one passage cannot
   simultaneously fill IELTS section 2 and a PTE section — exactly what shared
   passages require.

6. **Scoring is one integer and one formula.** There is no method, no per-exam
   rule and no place for PTE's negative marking on Reading MCQ-Multiple. A
   six-statement TFNG set and a five-gap fill both score through the same ratio.
   `Grade`'s field-presence dispatch means adding a type with the same field
   shape as an existing one silently reuses the wrong grader.

7. **No `mock_passages` / `mock_questions`.** Fixed mocks store a bare `TEXT[]`;
   generated papers store two parallel `TEXT[]`s. Per-question `marks` and
   `position` have nowhere to live, and a mock cannot be inspected with a join.

8. **The authoring path does not scale.** Adding a passage means writing a
   migration that satisfies the `000009` 13/13/14 guard. That is a reasonable
   safety net for three seeded passages and an outright barrier at a hundred.
   This — not the schema — is the real obstacle to the product goal in §13 of
   the brief.

9. **Re-order Paragraphs sits outside the model.** Own table, own exposure
   table, and a `CHECK (reorder_item_id IS NULL OR passage_id IS NULL)`. The
   instinct was right (its boxes must never be shown in correct order beside the
   task) but the mechanism duplicates passage, exposure and question plumbing
   for what is really "a question type that suppresses passage rendering" — the
   same category as the two hidden gap-fills, which are already handled with
   `passage_display = 'hidden'`.

10. **No canonical type registry.** The list of task types exists three times:
    Go consts, `src/lib/readingTypes.ts`, and string literals in seeds. Names
    have already drifted (`reading-sentence-completion` displays as "Fill in the
    Blanks" after `000022`; `reading-find-the-writer` was rewritten in place by
    `000019`). Nothing in the database says which types exist or which exams
    they belong to.

11. **The renderer is only half type-driven.** `AnswerControl` handles reorder
    and gap-fill by type, then falls through to `if (question.options?.length)`.
    So TFNG, YNNG, Matching Information, Find the Paragraph, MCQ-single and
    MCQ-multiple all render as the same two-column option grid. There is no
    matching interface, no in-sentence blank for sentence completion, no
    heading drag. This is the gap against the JumpInto-style presentation the
    brief asks for.

12. **Exposure is not exam-scoped.** `user_passage_exposures` keys on
    `(user_id, passage_id, context)`. Once a passage is shared, an IELTS mock
    would burn that passage for the learner's PTE mocks too.

---

## 3. Proposed architecture

Six layers, each with one job:

```
CONTENT      passages · paragraphs                           no exam, no questions
ASSESSMENT   questions (+ options, answer key)               belongs to a passage
REGISTRY     question_types                                  what a type is + renders as
ELIGIBILITY  questions.supported_exams                       which exams may use it
COMPOSITION  mock_blueprints · mock_passages · mock_questions frozen selections
DELIVERY     reading_mock_sessions · practice_attempts        one learner, one sitting
PRESENTATION frontend renderer registry keyed on type         content ≠ presentation
```

Decisions that follow from it:

- **`reading_passages.exam` is dropped.** A passage is text: title, topic,
  difficulty, paragraphs, word count, metadata. Nothing else.
- **`questions.supported_exams TEXT[]`** carries eligibility. Default is the
  single exam the question is authored for; `{IELTS,PTE}` only where the task is
  genuinely identical (MCQ-single and MCQ-multiple are the two real cases).
- **`question_types` becomes a table** — id, label, family, default renderer,
  default scoring, which exams may use it, whether the passage is rendered. Go
  and TS consts become thin mirrors of it, not the source of truth.
- **Groups stay**, renamed conceptually to *question sets*. They are how a task
  set carries its shared instruction line, word bank and resources, and they are
  already the billing sub-test unit (`billing.SubTestKeyForQuestion`).
- **Paper composition becomes data.** `mock_blueprints` + `mock_blueprint_slots`
  replace the `PaperSlots` Go constant and the `paper_slot` column, so IELTS
  (3 passages / 40 questions) and PTE (its own shape) coexist over one bank.
- **Reorder folds into the passage model** as a question type whose set has
  `passage_display = 'hidden'` and whose boxes live in the set's `resources`.
  `reading_reorder_items` and `user_reorder_exposures` retire.
- **Attempts carry their own exam.** `practice_attempts.exam` and the mistake
  bank stop deriving it from the question.
- **Exposure gains an exam column**, so sharing a passage does not leak spend
  across exams.

---

## 4. Database / schema changes

Additive first, destructive last. Migration numbers continue from `000022`.

### 4.1 Type registry — `000023`

```sql
CREATE TABLE question_types (
    id              TEXT PRIMARY KEY,         -- 'TRUE_FALSE_NOT_GIVEN'
    legacy_type_id  TEXT UNIQUE,              -- 'reading-true-false'
    skill           TEXT NOT NULL,
    family          TEXT NOT NULL,            -- choice | matching | completion | ordering
    label           TEXT NOT NULL,
    renderer        TEXT NOT NULL,            -- the frontend component key
    exams           TEXT[] NOT NULL,          -- which exams set this task
    passage_display TEXT NOT NULL DEFAULT 'full',
    default_scoring JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
```

`legacy_type_id` is what makes this non-destructive: existing rows keep their
`reading-*` ids and join through it.

### 4.2 Free the passage — `000024`

```sql
ALTER TABLE reading_passages ALTER COLUMN exam DROP NOT NULL;   -- dropped in phase 6
ALTER TABLE reading_passages ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE questions
    ADD COLUMN supported_exams   TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN source_paragraphs TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN scoring_config    JSONB NOT NULL DEFAULT '{}';

UPDATE questions SET supported_exams = ARRAY[exam] WHERE supported_exams = '{}';

CREATE INDEX idx_questions_supported_exams ON questions USING GIN (supported_exams);
```

`source_paragraphs` is the `["P2","P4","P6"]` reference from §6 of the brief —
paragraph *labels*, since `reading_passages.paragraphs` already stores
`{"label","text"}` and Matching Information grades against those labels.

A separate `passage_paragraphs` table is **not** proposed. The labelled JSONB
array is already ordered, is already the answer key for two task types, and is
read whole on every request; normalising it buys a join and costs the ordering
guarantee. This is the one place I would diverge from the brief's suggested
schema — flagging it for your call.

### 4.3 Per-exam slots — `000025`

```sql
CREATE TABLE question_set_slots (
    group_id TEXT NOT NULL REFERENCES reading_question_groups(id) ON DELETE CASCADE,
    exam     TEXT NOT NULL,
    slot     SMALLINT NOT NULL CHECK (slot > 0),
    PRIMARY KEY (group_id, exam, slot)
);
-- backfilled from reading_question_groups.paper_slot with exam = 'IELTS'
```

### 4.4 Mock composition — `000026`

```sql
CREATE TABLE mock_blueprints (
    id, exam, title, description, passage_count, total_questions,
    duration_minutes, is_generated, metadata
);

CREATE TABLE mock_blueprint_slots (
    blueprint_id, slot, type_ids TEXT[], question_count
);   -- replaces the PaperSlots Go constant

CREATE TABLE mock_passages (
    id, mock_id, passage_id, position, slot,
    UNIQUE (mock_id, position)
);

CREATE TABLE mock_questions (
    id, mock_passage_id, question_id, position, marks NUMERIC(5,2),
    UNIQUE (mock_passage_id, position),
    UNIQUE (mock_passage_id, question_id)
);
```

For **generated papers**, `reading_mock_sessions.passage_ids/question_ids
TEXT[]` become rows in `mock_session_passages` / `mock_session_questions` with
the same immutability guarantee. The arrays already freeze the selection
correctly, so this migration is about gaining `marks` and `position` per row —
not about fixing a bug.

### 4.5 Attempt-owned exam — `000027`

```sql
ALTER TABLE practice_attempts ADD COLUMN exam TEXT;
UPDATE practice_attempts a SET exam = q.exam FROM questions q WHERE q.id = a.question_id;
ALTER TABLE practice_attempts ALTER COLUMN exam SET NOT NULL;

ALTER TABLE user_passage_exposures ADD COLUMN exam TEXT NOT NULL DEFAULT 'IELTS';
-- primary key becomes (user_id, passage_id, exam, context)
```

### 4.6 Retirements — `000028`+, after everything above ships

`reading_passages.exam`, `reading_question_groups.paper_slot`, `questions.exam`
(kept as a nullable *authored-for* hint, or dropped), `reading_reorder_items`,
`user_reorder_exposures`, `mock_sections.question_ids`.

---

## 5. Question-type model

Canonical ids, against what exists today:

| Canonical id | Exams | Today | Renderer |
|---|---|---|---|
| `MULTIPLE_CHOICE_SINGLE` | IELTS, PTE | `reading-mcq-single` ✅ | OptionGrid (radio) |
| `MULTIPLE_CHOICE_MULTIPLE` | IELTS, PTE | `reading-mcq-multiple` ✅ | OptionGrid (checkbox) |
| `TRUE_FALSE_NOT_GIVEN` | IELTS | `reading-true-false` ✅ | VerdictTriad |
| `YES_NO_NOT_GIVEN` | IELTS | `reading-yes-no-not-given` ✅ | VerdictTriad |
| `MATCHING_INFORMATION` | IELTS | `reading-matching-information` ✅ | ParagraphMatcher |
| `MATCHING_HEADINGS` | IELTS | — new | HeadingMatcher |
| `MATCHING_FEATURES` | IELTS | — new | FeatureMatcher |
| `SENTENCE_COMPLETION` | IELTS | `reading-sentence-completion` ✅ | InlineBlank |
| `SUMMARY_COMPLETION` | IELTS | — new | BlankedText + word bank |
| `NOTE_COMPLETION` | IELTS | — new | BlankedText |
| `TABLE_COMPLETION` | IELTS | — new | TableBlanks |
| `FLOWCHART_COMPLETION` | IELTS | — new | FlowchartBlanks |
| `PARAGRAPH_ORDERING` | IELTS | `reading-arrange-passage` ✅ | OrderedChoice |
| `FIND_THE_PARAGRAPH` | IELTS | `reading-find-the-paragraph` ✅ | ParagraphMatcher |
| `READING_FILL_IN_THE_BLANKS` | PTE | `fill-in-blanks-r` ✅ | DragBlanks + word bank |
| `RW_FILL_IN_THE_BLANKS` | PTE | `fill-in-blanks-rw` ✅ | DropdownBlanks |
| `READING_REORDER_PARAGRAPH` | PTE | `reorder-paragraphs` ✅ | ReorderAnswer |

Nine of seventeen already exist. Only `MULTIPLE_CHOICE_SINGLE` and
`MULTIPLE_CHOICE_MULTIPLE` are genuinely dual-exam; everything else stays
single-exam, exactly as §11 of the brief requires.

`scoring.Grade` gains a `map[typeID]grader` registry so dispatch stops guessing
from field shape.

---

## 6. Mock-test relationship model

```
mock_blueprints ──< mock_blueprint_slots        (what an exam paper looks like)
        │
        ├──< mock_tests ──< mock_passages ──< mock_questions      (authored, fixed)
        │                        │                    │
        └──< reading_mock_sessions ──< session_passages ──< session_questions
                                              │                      │
                             passages ◄───────┘                      └──► questions
```

A mock **never** creates questions. Authored mocks select at author time;
generated papers select at deal time and freeze the result — which
`reading_mock_sessions` already does correctly, and which `hydrate()` already
honours (it filters and re-sorts live groups against the stored id list, so a
question added to a passage tomorrow does not appear on a paper dealt today).
That property must survive the migration from arrays to rows.

---

## 7. Scoring model

On the question:

```json
{ "method": "binary",         "max_score": 1 }
{ "method": "partial_credit", "max_score": 5, "unit": "blank" }
{ "method": "adjacent_pairs", "max_score": 4 }
{ "method": "partial_credit", "max_score": 2, "penalty_per_wrong": 1, "floor": 0 }
```

Layered, highest wins:

1. `question_types.default_scoring` — the type's normal behaviour
2. `questions.scoring_config` — per-item override
3. `mock_questions.marks` — per-paper weighting
4. `exam_versions` + `scoring.Scale` — how raw marks become a band/score, which
   already works and stays where it is

`questions.points` is kept and backfilled into `scoring_config.max_score` so
`proportional()` keeps working through phase 1. PTE's negative marking on
MCQ-multiple becomes expressible for the first time.

---

## 8. Migration strategy

Additive, six phases, each independently shippable and revertible.

| Phase | Ships | Breaks |
|---|---|---|
| 1 | `question_types` registry, backfilled from existing type ids | nothing |
| 2 | `supported_exams`, `scoring_config`, `source_paragraphs`, backfilled | nothing |
| 3 | Queries move from `p.exam` to `$exam = ANY(q.supported_exams)`; `question_set_slots`; `practice_attempts.exam` | nothing (both columns live) |
| 4 | Frontend renderer registry + the new per-type renderers | nothing |
| 5 | `mock_blueprints` / `mock_passages` / `mock_questions`; `PaperSlots` moves to data; PTE blueprint appears | new capability |
| 6 | Drop `reading_passages.exam`, `paper_slot`, `reading_reorder_items`; relax the `000009` guard into a compose-time check | one-way |

**Content migration:** the four existing passages keep their ids. `rp-choc-01`,
`rp-bees-01` and `rp-paper-01` lose `exam='IELTS'` and their 120 questions get
`supported_exams = {IELTS}`. `rp-time-01` loses `exam='PTE'`. The first proof
that this works is authoring PTE question sets on `rp-choc-01` and IELTS sets on
`rp-time-01` — no new passage text, and a data-only migration.

**Not in this proposal but required for §13:** an authoring path. Passages
authored as SQL migrations behind a hard-coded 13/13/14 guard cannot reach
thousands. That is a second workstream (admin CRUD, or a reviewed JSON import),
best scoped right after phase 3 — the schema work does not reach the product
goal without it.

---

## 9. Frontend rendering strategy

```
PracticePage / ReadingMockRunner
  └─ ReadingSet
       ├─ PassageReader          rendered when the set's passageDisplay is 'full'
       └─ QuestionSet            instruction line, resources, word bank
            └─ QuestionRenderer  registry: type → component  ← the only dispatch
```

`ReadingQuestionRow`'s `AnswerControl` becomes a real registry:

```ts
const RENDERERS: Record<QuestionType, ComponentType<AnswerProps>> = {
  TRUE_FALSE_NOT_GIVEN:       VerdictTriad,
  YES_NO_NOT_GIVEN:           VerdictTriad,
  MATCHING_INFORMATION:       ParagraphMatcher,
  FIND_THE_PARAGRAPH:         ParagraphMatcher,
  MATCHING_HEADINGS:          HeadingMatcher,
  SENTENCE_COMPLETION:        InlineBlank,
  SUMMARY_COMPLETION:         BlankedText,
  MULTIPLE_CHOICE_SINGLE:     OptionGrid,
  MULTIPLE_CHOICE_MULTIPLE:   OptionGrid,
  READING_FILL_IN_THE_BLANKS: DragBlanks,
  RW_FILL_IN_THE_BLANKS:      DropdownBlanks,
  READING_REORDER_PARAGRAPH:  ReorderAnswer,
  PARAGRAPH_ORDERING:         OrderedChoice,
};
```

with **no fallback on field shape** — an unknown type renders an explicit
"unsupported question type" panel rather than a generic option grid, matching
how `scoring.Grade` already refuses to guess.

Presentation rules from the brief, made concrete:

- The learner always sees the **real question text**. Matching Information reads
  "Which paragraph contains the following information?" with the actual
  statements and A–J options — never a placeholder like "Find the paragraph".
- `needsParagraphLabels(typeId)` already forces `PassageReader` to print `[A]`…
  `[J]`; that stays and extends to the whole matching family.
- Gap-fills keep the passage hidden. Their gapped text is a genuine rewrite
  (`q-time-001` reorders and compresses `rp-time-01`), which is the "specific
  technical reason" §6 allows for a question carrying its own copy — showing the
  clean original would hand over every gap.
- Word banks stay on the **set**, not the question: one pool drawn from once per
  blank, which `g-time-2` already models.

---

## 10. Backward-compatibility concerns

1. **`questions.exam` has seven readers outside reading** — `progress.go` ×3,
   `mistakes.go` ×2, `billing.go` ×2. Each must move to the attempt's own exam
   or to `= ANY(supported_exams)`, or per-exam progress silently double-counts
   shared questions. Highest-risk item in the plan.

2. **Live mock sessions.** `000009` abandoned every in-flight paper when
   composition changed, and phase 5 changes composition again. Same treatment,
   same reason: there is no honest way to re-compose a paper someone is halfway
   through. Run it at a low-traffic hour.

3. **The `000009` guard.** Any migration that adds a passage or moves a question
   between slots must keep IELTS at 13/13/14 or the migration fails. Phase 5
   should replace it with a compose-time check that skips ineligible passages
   rather than a schema-time check that blocks authoring.

4. **`type_id` is a wire contract** — client, grader and `correct_answers` all
   depend on it, which is why `000019` and `000022` renamed *labels* and left
   ids alone. Canonical ids are therefore introduced **alongside** legacy ids
   via `question_types.legacy_type_id`, not by rewriting rows.

5. **Billing sub-test metering** keys on `group_id`
   (`billing.SubTestKeyForQuestion`). Groups must keep stable ids through the
   rename to question sets, or every learner's daily quota resets mid-day.

6. **Answer-key shape.** `correct_answers JSONB` means different things per type
   (option ids, ordered labels, literal words). Moving to `question_options` /
   `question_answers` tables as §10 of the brief suggests would touch
   `scoring.go`, `mocks.GradeAnswers` and every seed. Recommendation: **keep the
   JSONB answer key** and normalise only if the authoring UI needs per-option
   rows — the brief's own instruction is to adjust the schema to the project
   rather than create duplicate tables, and this is where that applies.

7. **Exposure history.** `user_passage_exposures` gains `exam` with a default of
   `'IELTS'`, correct for every existing row (only `rp-time-01` is PTE and it has
   no generated mock). Worth asserting in the migration rather than assuming.

8. **Deploy order.** Phase 3 changes response filtering while phase 4 changes
   rendering. Ship backend first — the current renderer tolerates the new payload
   because it reads `typeId`, but the new renderer will not tolerate the old
   payload once fallbacks are removed.

---

## Open questions

1. **`passage_paragraphs` table, or keep labelled JSONB?** Recommendation: keep
   JSONB (§4.2), diverging from the brief here.
2. **`question_options` / `question_answers` tables, or keep JSONB?**
   Recommendation: keep JSONB until an authoring UI needs the rows (§10.6).
3. **Retire `reading_reorder_items`, or leave it standalone?** Recommendation:
   fold it into the passage model as a hidden-passage type.
4. **Authoring path** — admin CRUD, or reviewed JSON import? The schema work does
   not reach the §13 goal without one.
5. **PTE reading mock shape** — how many passages, how many questions, what mix?
   Needed before phase 5 can seed a PTE blueprint.
