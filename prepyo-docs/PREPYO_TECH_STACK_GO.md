# Prepyo — Technology Stack & Lightweight Architecture

## 1. Product

**Prepyo** is a Nepal-focused exam-preparation platform for **PTE and IELTS**.

The MVP focuses on:

- realistic practice;
- mock exams;
- AI tutoring;
- writing evaluation;
- speaking evaluation;
- personalized recommendations;
- progress analytics;
- XP and streaks;
- competitive leaderboards;
- Nepal-first UX and pricing.

The current MVP supports **PTE + IELTS only**.

Japanese/JLPT, JFT, SSW, community, B2B/institute features, and the broader study-abroad ecosystem are intentionally deferred.

---

# 2. Technology Stack

## Frontend

### Web

- Next.js
- React
- TypeScript
- Tailwind CSS
- Reusable component system

The frontend owns:
- UI;
- client-side interaction;
- form handling;
- local UI state;
- API consumption.

The frontend does **not** own trusted business state.

---

## Backend

### Language

**Go**

### Architecture

**Modular monolith**

The backend should start as one deployable Go application with clearly separated internal modules.

Do **not** begin with microservices.

Recommended structure:

```text
backend/
├── cmd/
│   └── api/
├── internal/
│   ├── auth/
│   ├── users/
│   ├── exams/
│   ├── questions/
│   ├── practice/
│   ├── mocks/
│   ├── evaluations/
│   ├── ai/
│   ├── progress/
│   ├── gamification/
│   ├── leaderboards/
│   ├── billing/
│   ├── notifications/
│   └── admin/
├── migrations/
├── pkg/
└── go.mod
```

The exact package organization can change after inspecting the actual repository, but domain boundaries should remain.

---

# 3. Go Backend Libraries

Use a **small dependency footprint**.

### HTTP

**RECOMMENDED DEFAULT:** `chi`

Reasons:
- lightweight;
- idiomatic Go;
- middleware support;
- no unnecessary framework abstraction.

The standard library should remain the foundation.

### Database Driver

**RECOMMENDED DEFAULT:** `pgx`

Use PostgreSQL directly through a mature Go PostgreSQL driver.

### SQL / Query Layer

**RECOMMENDED DEFAULT:** `sqlc`

Reason:
- SQL remains explicit;
- generated Go types reduce mapping errors;
- less ORM magic;
- good fit for a relational, query-heavy application.

Do not introduce a large ORM unless a concrete requirement justifies it.

### Validation

**RECOMMENDED DEFAULT:** a schema validation library compatible with Go structs, or explicit validation functions for domain-critical rules.

Validation must happen at the API boundary and again where domain invariants require it.

### Configuration

Environment-based configuration with startup validation.

Never allow the application to boot with required secrets/configuration silently missing.

### Logging

**RECOMMENDED DEFAULT:** Go's structured logging support (`log/slog`) or an equivalent structured logger.

Logs should include:
- request ID;
- user ID where appropriate;
- operation;
- duration;
- error category.

Never log secrets or raw sensitive learner content by default.

---

# 4. API

Use a REST API between the frontend and Go backend.

Example:

```text
/api/v1/auth
/api/v1/profile
/api/v1/exams
/api/v1/questions
/api/v1/practice
/api/v1/mocks
/api/v1/evaluations
/api/v1/progress
/api/v1/leaderboards
/api/v1/subscriptions
```

### API rules

- request validation at the boundary;
- explicit response contracts;
- stable machine-readable error codes;
- pagination for collections;
- server-side authorization;
- idempotency for retry-sensitive operations;
- no provider-specific errors exposed directly to clients.

---

# 5. Database

## PostgreSQL

PostgreSQL is the primary system of record.

It stores:

```text
Users
Profiles
Exams
Questions
Attempts
Mocks
Scores
Progress
Mistakes
AI Evaluations
XP
Streaks
Leaderboards
Subscriptions
Notifications
```

### Database access

```text
Go
 ↓
pgx / sqlc
 ↓
PostgreSQL
```

The client never connects directly to PostgreSQL.

---

# 6. Redis

Use Redis for infrastructure concerns, not as the primary database.

Initial uses:

- rate limiting;
- caching;
- background job queue;
- temporary job state where appropriate;
- short-lived distributed locks where genuinely necessary.

Do not store authoritative learner state in Redis.

---

# 7. Background Jobs

Expensive or asynchronous work should run outside the HTTP request.

```text
Client
  ↓
Go API
  ↓
Create Job
  ↓
Redis Queue
  ↓
Go Worker
  ↓
AI / External Service
  ↓
PostgreSQL
```

Initial background jobs:

- speaking evaluation;
- writing evaluation;
- mock analysis;
- report generation;
- notifications.

Every important job should have:
- unique job ID;
- idempotency key;
- retry policy;
- timeout;
- attempt count;
- failure state.

---

# 8. AI Architecture

Prepyo must not couple business logic directly to OpenRouter.

Use:

```text
Application Module
        ↓
     AI Gateway
        ↓
   OpenRouter API
        ↓
 Selected Model
```

## AI Gateway responsibilities

The AI Gateway handles:

- provider communication;
- model routing;
- prompt versioning;
- structured output validation;
- timeout;
- retry policy;
- fallback policy;
- token/usage tracking;
- estimated cost tracking;
- AI rate limits;
- model benchmarking metadata.

Application modules should request capabilities such as:

```text
EvaluateWriting()
EvaluateSpeaking()
ExplainQuestion()
GeneratePracticeQuestion()
GenerateStudyRecommendation()
AnalyzeMock()
```

They should **not** request:

```text
CallOpenRouterModel("some-model")
```

---

# 9. AI Model Strategy

Do not permanently hardcode one model as the "best" model.

Use configurable routing.

### Lower-cost model

For:
- routine tutoring;
- explanations;
- low-risk question generation;
- simple recommendations.

### Higher-quality model

For:
- writing evaluation;
- speaking evaluation;
- difficult mock analysis.

### Multimodal model

Only for:
- audio;
- image;
- document;
- other multimodal tasks

when the selected model's actual capabilities have been verified.

Model names, pricing, limits, and capabilities must be treated as configurable external dependencies.

---

# 10. AI Output Contract

AI outputs must use structured JSON contracts.

Example:

```json
{
  "evaluationVersion": "v1",
  "summary": "string",
  "strengths": [],
  "issues": [],
  "estimatedScore": {
    "value": 0,
    "confidence": "low"
  }
}
```

The Go backend validates the response before persistence.

Never trust arbitrary free-form model output as application state.

---

# 11. AI vs Application Responsibilities

## AI can handle

- qualitative feedback;
- explanations;
- language analysis;
- writing analysis;
- speaking feedback;
- recommendations;
- question generation;
- study-plan suggestions.

## Application must handle

- authentication;
- permissions;
- deterministic scoring rules;
- XP;
- streaks;
- leaderboard ranking;
- subscriptions;
- credits/usage limits;
- user state.

### Critical rule

**Never let an LLM directly determine trusted application state.**

---

# 12. Object Storage

Use S3-compatible object storage for:

- speaking recordings;
- audio assets;
- future user uploads.

Architecture:

```text
Client
   ↓
Signed Upload
   ↓
Object Storage
   ↓
Go API stores metadata
   ↓
PostgreSQL
```

The backend must validate ownership and metadata.

The client must never receive permanent provider credentials.

---

# 13. Authentication

**DECISION REQUIRED:** authentication provider.

The backend must expose provider-neutral concepts:

```text
User
Session
Role
Permission
```

Required capabilities:

- registration;
- login;
- logout;
- session/token validation;
- session revocation;
- account deletion.

Authorization must always be enforced by the Go backend.

---

# 14. Billing

**DECISION REQUIRED:** payment provider.

The Go backend should expose a provider-independent billing layer:

```text
Subscription
Entitlement
Plan
Usage Limit
Credit Balance
Billing Event
```

Do not place provider-specific billing logic in frontend code.

The billing backend handles:
- checkout state;
- subscriptions;
- renewals;
- cancellation;
- failed payments;
- refunds;
- webhooks;
- entitlement reconciliation.

---

# 15. Trusted State

The client must never directly modify:

- XP;
- rank;
- score;
- subscription status;
- AI usage;
- credits;
- streak state.

Example:

```text
Client submits answer
        ↓
Go API validates request
        ↓
Go calculates trusted result
        ↓
PostgreSQL stores attempt
        ↓
Go awards eligible XP
        ↓
Progress is updated
```

---

# 16. Performance

Prepyo does not need a distributed architecture at MVP scale.

Initial goals:

- p95 normal API reads: <= 500 ms;
- p95 normal API writes: <= 800 ms;
- expensive AI operations handled asynchronously;
- dashboard should not wait for optional AI recommendations;
- large collections must be paginated;
- database queries must be indexed based on real access patterns.

Optimize based on measurement.

Do not prematurely introduce:
- sharding;
- multiple databases;
- Kubernetes;
- service meshes;
- microservices.

---

# 17. Security

Minimum production requirements:

- HTTPS;
- server-side authorization;
- request validation;
- rate limiting;
- secure secret handling;
- private object storage;
- signed media URLs;
- upload limits;
- payment webhook verification;
- audit logging for sensitive operations;
- protected database credentials.

Never expose:

```text
OpenRouter API keys
Payment secrets
Database credentials
Signing secrets
```

to the client.

---

# 18. Observability

Start simple.

### Logs

Track:
- request ID;
- endpoint;
- status;
- duration;
- error category;
- background job state.

### Metrics

Track:
- API latency;
- API error rate;
- queue depth;
- job failures;
- AI request count;
- AI latency;
- AI cost/user;
- subscription events.

### Errors

Use an error-tracking system once the production application is deployed.

Do not build a large observability platform before it is necessary.

---

# 19. Deployment

**RECOMMENDED DEFAULT**

```text
Docker
   ↓
Go API
   ↓
PostgreSQL
   +
Redis
   +
Object Storage
```

The exact cloud provider is:

`DECISION REQUIRED`

The deployment should support at minimum:

```text
Development
Staging
Production
```

Each environment must use separate credentials and data.

---

# 20. Development Tools

Required on the developer machine:

```text
Go
Docker Desktop
Git
VS Code
Go VS Code extension
```

Docker should provide local infrastructure such as:

```text
PostgreSQL
Redis
```

Do not install unnecessary infrastructure globally when Docker can provide an isolated development environment.

---

# 21. Testing

Backend testing should include:

### Unit tests

For:
- scoring;
- XP rules;
- streak calculations;
- entitlement rules;
- validation;
- leaderboard calculations.

### Integration tests

For:
- PostgreSQL repositories;
- API authorization;
- practice sessions;
- subscriptions;
- AI evaluation persistence.

### End-to-end tests

Critical journeys:

```text
Sign up
↓
Onboarding
↓
Practice
↓
Mock
↓
AI evaluation
↓
Progress
↓
Subscription
```

---

# 22. Why Go

Go is being chosen for the backend because Prepyo needs:

- simple deployment;
- strong concurrency;
- efficient background workers;
- predictable performance;
- low runtime overhead;
- strong typing;
- straightforward code organization.

The choice is **not** based on needing extreme scale.

The biggest product challenges are:
- exam content correctness;
- AI evaluation quality;
- learner retention;
- UX;
- unit economics.

Go should make the backend reliable without becoming an infrastructure project.

---

# 23. Architecture Principle

Prefer:

```text
Go
+
Modular Monolith
+
PostgreSQL
+
Redis
+
AI Gateway
+
Simple Workers
```

over:

```text
Microservices
+
Multiple Databases
+
Complex Infrastructure
+
Premature Scaling
```

The MVP should optimize for **shipping a reliable learning product**, not for demonstrating architectural complexity.
