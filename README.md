# 🇳🇵 Prepyo Frontend (React + Vite)

Prepyo is an AI-powered exam preparation platform for **PTE Academic** and **IELTS**, tailored for Nepali and global study-abroad candidates.

This repository hosts the **React single-page application**. The Go API backend is maintained separately at [Prepyo-Backend](https://github.com/SaurabhThakulla/Prepyo-Backend).

---

## 🏗️ Architecture

The app (`src/`) is a static build. It holds no database and, since the move off Next.js, no server of its own — every `/api/v1/*` request goes to the Go API, which is also the only thing that grades an answer.

Keeping the app and the API on **one origin** is what makes the `HttpOnly`, `SameSite=Lax` session cookie work without CORS credentials. That happens two different ways:

| | How one origin happens |
|---|---|
| **Development** | `vite dev` serves the app on `:3000` and proxies `/api/v1/*` to the backend (`vite.config.ts`). |
| **Production** | The Go binary serves this build *and* the API. Set `WEB_DIST_DIR` on the backend to the `dist/` folder. Nothing proxies anything. |

- **Frontend Repository**: [Prepyo](https://github.com/SaurabhThakulla/prepyo)
- **Backend Repository**: [Prepyo-Backend](https://github.com/SaurabhThakulla/Prepyo-Backend) (Deployable to **Railway / Render / Fly.io**)

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local` based on `.env.example`:

```env
# Where the dev proxy sends /api/v1/* (defaults to http://localhost:8080)
BACKEND_URL=http://localhost:8080
```

### 3. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Note: Ensure your [Go API backend](https://github.com/SaurabhThakulla/Prepyo-Backend) is running on `http://localhost:8080` for login, evaluations, and practice questions.
>
> To build UI without a backend or a login at all, set `VITE_USE_FIXTURES=true` and see `src/lib/fixtures.ts`.

---

## ☁️ Deployment

The app and the API deploy together as one service on Railway:

1. Build the frontend: `npm run build` → `dist/`.
2. Point the backend at it with `WEB_DIST_DIR=/path/to/dist`.
3. The Go binary serves the pages and `/api/v1` from the same origin.

Because it is one origin, there is no `BACKEND_URL` to set in production and no CORS to configure — that variable only steers the dev proxy.

---

## 🧪 Verification

```bash
npm run typecheck    # TypeScript verification
npm run build        # Type-checks, then produces dist/
npm run preview      # Serve the production build locally
```

---

## 📦 Project Layout

```text
prepyo/
├── index.html               # The shell: title, fonts, #root
├── src/
│   ├── main.tsx             # Entry point: router + providers
│   ├── App.tsx              # Every URL the app answers to
│   ├── pages/               # One component per route
│   ├── components/          # UI components & design system
│   ├── context/             # AppContext: session, notifications, theme
│   ├── lib/
│   │   ├── api.ts           # The only place that talks to the backend
│   │   └── types/           # Data models & TypeScript interfaces
│   └── globals.css          # Tailwind layers + design tokens
├── public/                  # Static assets
└── vite.config.ts           # Dev proxy: /api/v1/* → Go API
```
