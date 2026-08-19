# Prepyo — PTE & IELTS Product Specification

## 1. Current scope
Prepyo currently supports only:
- PTE
- IELTS

The exam engine is shared. Scoring, terminology, task rules, content, and evaluation configuration remain exam-specific.

## 2. Shared learning loop
```text
Diagnostic
↓
Practice
↓
Feedback
↓
Mistake Review
↓
Mock
↓
Progress
↓
Target Gap
↓
Recommended Practice
```

Shared platform capabilities:
- users
- sessions
- attempts
- question delivery
- analytics
- AI Gateway
- gamification
- subscriptions

Exam-specific configuration:
- sections
- question/task types
- timing
- scoring
- rubrics
- content

---

# PTE

## Skills
- Speaking
- Writing
- Reading
- Listening

## Task model
Each task must define:
```text
task type
section
prompt/content
response format
preparation time
response time
evaluation mode
scoring configuration
```

Do not hardcode task behavior into one screen.

## Speaking
```text
Task
↓
Preparation
↓
Recording
↓
Upload
↓
AI Evaluation
↓
Feedback
↓
Estimated Result
```

The result is not an official Pearson score.

## Writing
Support:
- prompt
- timer
- draft
- final submission
- evaluation
- feedback
- estimated result where justified

AI feedback may cover relevant dimensions such as task response, coherence, vocabulary, and grammar. Do not invent official scoring weights without verified references.

## Reading
The shared question engine must support the task types required by the configured PTE version. Examples may include multiple choice, multiple-answer, ordering, and text completion. Exact production taxonomy must be verified against the applicable exam specification.

## Listening
Support audio, playback rules, question answering, applicable timing, results, and review. Audio assets belong in object storage/CDN infrastructure.

## PTE score tracking
```text
Target: 79
Current Estimate: 74
Gap: 5
```

Never imply official Pearson certification.

## PTE analytics
Track:
- overall estimated performance
- skill performance
- task-type performance
- accuracy
- trend
- recurring mistakes
- valid timing/fluency signals where measurable

---

# IELTS

## Skills
- Listening
- Reading
- Writing
- Speaking

## Terminology
Use:
- band score
- estimated band
- target band
- current estimate

Never present an AI-generated band as an official IELTS result.

## Listening
Support audio, question sequence, answer submission, review, and results. Timing/task taxonomy must follow the configured IELTS version.

## Reading
Use the shared question engine for the configured IELTS reading types. Evaluation should be deterministic wherever possible.

## Writing
Support:
- task prompt
- timer
- draft
- final response
- rubric-aware AI feedback
- estimated band where validated

Potential feedback dimensions:
- task achievement/response
- coherence/cohesion
- lexical resource
- grammatical range and accuracy

Do not invent official score weights.

## Speaking
Support:
- speaking parts/sections
- recording
- submission
- feedback
- estimated band where the product has a validated mapping

AI output is an estimate, not an official IELTS result.

---

# Exam versioning
PTE and IELTS content must be versioned.

```text
Exam
 └── Exam Version
      ├── Section
      ├── Task Type
      └── Scoring Configuration
```

Historical attempts must continue using the configuration under which they were taken.

Do not silently change old results when the exam definition changes.

# Diagnostic
The diagnostic should produce:
```text
Current Estimate
Weak Skills
Strong Skills
Priority Areas
Recommended First Practice
```

AI may interpret results, but raw answers and deterministic results remain authoritative.

# AI evaluation
Use:
```text
Raw Response
↓
Validation / Feature Extraction
↓
AI Qualitative Analysis
↓
Validated Product Scoring / Mapping
↓
Estimated Result
```

The LLM must never directly modify XP, subscription, rank, permissions, or other trusted state.

# Estimated-score language
Use:
- Estimated Score
- Current Estimate
- Practice Estimate
- Estimated Band

Avoid:
- Official Score
- Guaranteed Score
- Pearson Score
- Official IELTS Result

unless referring to a real external result entered by the learner.

# Mock tests
Mocks should provide an exam-like experience with configured sections, timing, submission, results, and analysis.

Always distinguish:
```text
Practice
Mock
Official Exam
```

Prepyo provides practice and simulated/mock assessments, not official certification.

# Content integrity
Before production, verify:
- task types
- section structure
- timing
- scoring terminology
- rubric terminology
- score mapping

Do not invent official exam details to fill gaps.

# Current vs later
## Current
- PTE
- IELTS
- practice
- mocks
- AI tutor
- writing feedback
- speaking feedback
- analytics
- mistake review
- XP
- streak
- leaderboard
- subscriptions

## Later
- Japanese/JLPT
- JFT
- SSW
- broader study-abroad preparation
