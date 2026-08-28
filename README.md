# 🇳🇵 Prepyo Frontend (Next.js)

Prepyo is an AI-powered exam preparation platform for **PTE Academic** and **IELTS**, tailored for Nepali and global study-abroad candidates.

This repository hosts the **Next.js web application**. The Go API backend is maintained separately at [Prepyo-Backend](https://github.com/SaurabhThakulla/Prepyo-Backend).

---

## 🏗️ Architecture

The Next.js app (`src/`) is the frontend interface — it holds no database of its own. Every `/api/v1/*` request it makes is proxied straight to the Go API by a rewrite in `next.config.js`.

Proxying rather than calling the API directly from the browser keeps session cookies same-origin (`HttpOnly`, `SameSite=Lax`), preventing CORS issues.

- **Frontend Repository**: [Prepyo](https://github.com/SaurabhThakulla/prepyo) (Deployable to **Vercel**)
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
# URL of your Go backend API (defaults to http://localhost:8080)
BACKEND_URL=http://localhost:8080
```

### 3. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Note: Ensure your [Go API backend](https://github.com/SaurabhThakulla/Prepyo-Backend) is running on `http://localhost:8080` for login, evaluations, and practice questions.

---

## ☁️ Deployment on Vercel

1. Import this repository into **Vercel**.
2. Under **Project Settings → Environment Variables**, add:
   * `BACKEND_URL`: `https://your-deployed-backend-api.up.railway.app`
3. Click **Deploy**.

---

## 🧪 Verification

```bash
npm run typecheck    # TypeScript verification
npm run build        # Production Next.js build
npm run lint         # ESLint checks
```

---

## 📦 Project Layout

```text
prepyo/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # UI components & Design system
│   ├── context/             # AppContext: session, notifications, theme
│   ├── lib/
│   │   ├── api.ts           # API client for /api/v1 proxy
│   │   └── types/           # Data models & TypeScript interfaces
│   └── middleware.ts        # Route authentication guard
├── public/                  # Static assets
└── next.config.js           # /api/v1/* → Go API proxy
```
