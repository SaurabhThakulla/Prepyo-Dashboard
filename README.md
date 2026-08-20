# 🇳🇵 Prepyo — Local Host Setup & Running Guide

Prepyo is an AI-powered exam preparation platform for **PTE Academic** and **IELTS**, tailored for Nepali and global study-abroad candidates.

---

## 🚀 Quick Start (Running on Localhost)

### Option 1: Using npm (Standard)
```bash
# 1. Install dependencies (already installed)
npm install

# 2. Run the Next.js local server
npm run dev
```

Your app will be accessible at: **[http://localhost:3000](http://localhost:3000)**

### Option 2: Using the Helper Script (Windows PowerShell)
```powershell
.\run_local.ps1
```

### Option 3: Using the Windows Batch Launcher
Double-click `start.bat` or run:
```cmd
start.bat
```

---

## ⚙️ Environment Configuration

Configuration files have been initialized for you:

| File | Purpose | Location |
| :--- | :--- | :--- |
| `.env.local` | Next.js Frontend & In-App API routes | Root (`./.env.local`) |
| `.env.example` | Template for Frontend configuration | Root (`./.env.example`) |
| `backend/.env` | Go API Backend configuration (optional) | `backend/.env` |

### Environment Variables (`.env.local`)
```env
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Add live AI keys if you want to use OpenRouter/Gemini LLMs.
# If left blank, Prepyo uses its built-in intelligent simulated evaluation engine.
OPENROUTER_API_KEY=
GEMINI_API_KEY=
```

---

## 🧪 Verification & Testing

To verify all 19 frontend pages and API endpoints:

```powershell
powershell -ExecutionPolicy Bypass -File .\test_routes.ps1
```

**Tested Endpoints Include:**
- 🏠 **Pages:** `/`, `/dashboard`, `/practice`, `/mocks`, `/evaluations`, `/mistakes`, `/leaderboard`, `/subscription`, `/profile`, `/admin`
- 📡 **REST APIs:** `/api/v1/auth`, `/api/v1/exams`, `/api/v1/questions`, `/api/v1/mocks`, `/api/v1/leaderboards`, `/api/v1/subscriptions`, `/api/v1/notifications`, `/api/v1/practice`, `/api/v1/ai/tutor`

---

## 📦 Project Architecture

```text
prepyo/
├── src/
│   ├── app/                 # Next.js App Router (Pages & /api/v1 endpoints)
│   ├── components/          # Reusable UI components (AI Drawer, Audio, etc.)
│   ├── context/             # Global App State (User, active exam, notifications)
│   └── lib/                 # Core logic
│       ├── ai-gateway/      # OpenRouter & simulated AI evaluation engine
│       ├── db/              # In-memory database & question bank
│       └── exam-engine/     # PTE/IELTS deterministic scoring rules
├── backend/                 # Standalone Go backend service (optional)
├── docker-compose.yml       # Containerized Postgres, Redis & Go backend
├── run_local.ps1            # Local startup PowerShell script
├── start.bat                # 1-click Windows starter
└── test_routes.ps1          # Automated API test suite
```
