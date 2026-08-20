# =============================================================================
# Prepyo Local Host Runner
# =============================================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   PREPYO - LOCAL ENVIRONMENT LAUNCHER   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    Exit 1
}

# 2. Check and Create .env.local if not present
if (-not (Test-Path ".env.local")) {
    Write-Host "[INFO] Creating .env.local from defaults..." -ForegroundColor Yellow
    @"
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENROUTER_API_KEY=
GEMINI_API_KEY=
"@ | Out-File -FilePath ".env.local" -Encoding utf8
}

# 3. Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
}

Write-Host "`n[STARTING] Launching Prepyo Next.js Local Server on http://localhost:3000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server.`n" -ForegroundColor DarkGray

npm run dev
