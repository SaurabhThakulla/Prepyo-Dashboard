# Prepyo — MVP Implementation Plan

## Scope
The first production version supports only PTE and IELTS.

```text
Sign up
↓
Choose exam
↓
Set target score
↓
Diagnostic
↓
Practice
↓
AI Feedback
↓
Mock Test
↓
Progress
↓
Daily Return
```

Do not implement Japanese/JLPT, JFT, SSW, community, B2B, or the broader study-abroad ecosystem in this phase.

## Build order

### 0. Foundation
- repository structure
- environment configuration
- CI
- frontend shell
- backend bootstrap
- database connection
- validation
- API error format
- logging
- shared TypeScript contracts

**Acceptance:** local development boots and CI runs typecheck/lint/tests.

### 1. Authentication & profile
- signup/login
- logout
- sessions
- profile
- selected exam
- target score
- exam date

**Acceptance:** a user can register and finish onboarding; ownership is enforced server-side.

### 2. Exam content model
Create reusable structures:
```text
Exam
Exam Version
Section
Question Type
Question
Question Option
Skill
```

PTE and IELTS should share the same engine. Exam-specific behavior belongs in configuration/content.

**Acceptance:** the same question API can serve both exams.

### 3. Practice engine
- practice sessions
- question delivery
- answer submission
- timers
- deterministic scoring where applicable
- results
- review

**Acceptance:** complete practice end-to-end; client cannot forge correctness/score.

### 4. Dashboard
Show:
- target exam
- target score
- current estimated performance
- readiness
- today's mission
- streak
- XP
- weak skill
- recent activity

The dashboard must remain useful if optional AI is delayed.

### 5. Mock engine
- mock templates
- sections
- sequencing
- timers
- submission
- results
- score summary
- analysis

Historical attempts must preserve the relevant exam configuration.

### 6. AI Gateway
Build the abstraction before product AI features.

Capabilities:
```text
generate
evaluate
explain
recommend
```

Required:
- OpenRouter adapter
- configurable model routing
- structured JSON output
- prompt versioning
- timeout/retry
- usage tracking
- cost tracking
- rate limiting

No product module may call OpenRouter directly.

### 7. AI tutor
- contextual tutoring
- task-aware explanations
- learner-context retrieval
- usage/credit enforcement

Pass only the context required for the request.

### 8. Writing evaluation
- writing task
- timer
- draft persistence
- submission
- async evaluation
- feedback
- estimated score where justified

```text
Response
↓
Validation
↓
AI Evaluation
↓
Structured Output Validation
↓
Estimated Feedback/Score
↓
Persist
```

Duplicate submissions must not create duplicate billable evaluations.

### 9. Speaking evaluation
- recording
- secure upload
- object storage
- signed access
- async evaluation
- feedback
- estimated result

```text
Recording
↓
Upload
↓
Validation
↓
Queue
↓
AI Gateway
↓
Evaluation
↓
Result
```

### 10. Progress analytics
Track:
- skill performance
- score trend
- task-type performance
- weak-skill detection
- target gap
- recent performance

Every chart must have a defined learner meaning.

### 11. Mistake bank
- mistake creation
- grouping
- review
- replay

Persist meaningful recurring mistakes; do not create noise from every trivial wrong click.

### 12. XP
- XP transaction ledger
- server-side awards
- idempotency
- anti-farming

Client cannot create XP transactions.

### 13. Streaks
- qualifying daily activity
- timezone-aware day boundaries

Login alone must not increment streak.

### 14. Leaderboard
Start with:
- Nepal
- weekly
- monthly
- all-time
- exam-specific

Ranking is server-calculated and must not reward low-value click farming.

### 15. Subscription
- plans
- subscription state
- entitlements
- AI usage limits
- webhook processing
- failed-payment state
- cancellation

Pricing/provider configuration must be changeable without rewriting business logic.

### 16. Notifications
Start with in-app notifications:
- daily mission
- result ready
- streak reminder
- study recommendation

### 17. Admin/content management
Build after the learner loop is stable:
- question management
- exam versions
- publishing controls
- evaluation configuration
- basic admin audit

## Dependency rules
Do not build:
- leaderboard before trusted performance/XP data;
- paid AI before entitlements and usage enforcement;
- AI evaluation before task/content models;
- analytics before reliable source events;
- community before moderation/reporting.

## Definition of done
Every feature requires:
- implementation matching docs;
- server-side authorization;
- loading/error/empty states where relevant;
- relevant automated tests;
- migration if schema changes;
- logging/metrics for important dependencies.

Run:
```text
typecheck
lint
unit tests
integration tests
relevant E2E tests
```

## MVP release gate
Verify:
- authentication;
- versioned exam content;
- stable practice;
- working mocks;
- measurable AI usage/cost;
- writing evaluation;
- speaking evaluation;
- clear estimated-score labels;
- server-controlled XP/leaderboard;
- correct subscription entitlements;
- backups;
- account deletion;
- rate limiting;
- secret protection.

## Explicitly later
- Japanese/JLPT
- JFT/SSW
- community feed
- teacher/institute dashboard
- B2B subscriptions
- study-abroad services
- large social graph
- complex microservices
- advanced recommendation infrastructure

Validate PTE + IELTS first.
