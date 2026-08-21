# 🇳🇵 Prepyo — Local Setup & Running Guide

Prepyo is an AI-powered exam preparation platform for **PTE Academic** and **IELTS**, tailored for Nepali and global study-abroad candidates.

---

## Architecture in one paragraph

There are two processes. The **Go API** (`backend/`) owns everything: accounts, sessions, the question bank, grading, XP, referrals and billing, all persisted in **PostgreSQL**. The **Next.js app** (`src/`) is the interface — it holds no data of its own and every `/api/v1/*` request it makes is proxied straight to the Go API by a rewrite in `next.config.js`. Proxying rather than calling `:8080` from the browser keeps the session cookie same-origin, so it works without CORS credentials.

Both processes must be running for the app to work. There is no offline or mock mode: if the API is down, the UI says so rather than showing placeholder data.

---

## 🚀 Quick Start

You need **Node 18+**, **Go 1.22+** and a running **PostgreSQL**.

### 1. Configure the database

`backend/.env` holds the API's configuration. The important line is:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/prepyo?sslmode=disable
```

Create the database once:

```bash
createdb -U postgres prepyo
```

Schema migrations and the seed content (exam versions, questions, mocks, plans, daily missions) run **automatically** the first time the API starts.

### 2. Start the API

```bash
npm run dev:api
```

Serves on **http://localhost:8080**. Check it with `curl http://localhost:8080/health`.

### 3. Start the web app

```bash
npm run dev
```

Open **http://localhost:3000** and create an account.

---

## ⚙️ Environment Configuration

| File | Purpose |
| :--- | :--- |
| `backend/.env` | Go API: database URL, session settings, AI keys. **Required.** |
| `.env.local` | Next.js: `BACKEND_URL` if the API is not on `localhost:8080`. |

### AI features

Writing evaluation (`/evaluations`) and the AI coach need an OpenRouter key in `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-...
```

Without it those two endpoints return **503** and the UI says the evaluator is unavailable. They never fall back to a canned score — a made-up band would be worse than no band.

---

## Authentication

Registration and login are real: passwords are hashed with **bcrypt** (cost 12) and sessions are **opaque random tokens** stored in the `sessions` table, sent as an `HttpOnly`, `SameSite=Lax` cookie. Because sessions are rows rather than JWTs, revoking one is a `DELETE`.

- Passwords must be at least **10 characters** (enforced server-side).
- `src/middleware.ts` bounces signed-out visitors off app routes before they render.
- `RequireAuth` then catches the case middleware cannot see: a cookie whose session has expired or been revoked.
- Google / Apple / Facebook buttons are present but **not connected to any provider**. They say so when clicked rather than signing you into a placeholder account.

---

## What is not built yet

Stated plainly so nothing on screen is mistaken for a working feature:

- **Speaking practice** has no audio capture or pronunciation model, so it is not scored. The practice page says this instead of showing a recorder that goes nowhere.
- **Speaking and writing inside mock exams** are recorded with the attempt but excluded from the overall estimate. The score report reports how many questions it actually covers.
- **Checkout** records a subscription against your account but takes no payment — no gateway is connected. The dialog labels it a test checkout.
- **Question authoring** has no write API; the bank is managed through `backend/migrations`.

---

## 🧪 Verification

```bash
npm run typecheck          # TypeScript
npm run build              # Production build
cd backend && go test ./...  # Backend tests
```

---

## 📦 Project Layout

```text
prepyo/
├── src/
│   ├── app/                 # Next.js App Router pages (no API routes — see backend/)
│   ├── components/          # UI components
│   ├── context/             # AppContext: session, notifications, theme
│   ├── lib/
│   │   ├── api.ts           # The only place the frontend talks to the API
│   │   └── types/           # Mirrors backend/internal/models
│   └── middleware.ts        # Route protection
├── backend/
│   ├── cmd/api/             # Server entrypoint and wiring
│   ├── internal/            # One package per domain (auth, practice, mocks, …)
│   └── migrations/          # Schema + seed content, applied at startup
├── docker-compose.yml       # Postgres, Redis and the Go backend
└── next.config.js           # /api/v1/* → Go API proxy
```
