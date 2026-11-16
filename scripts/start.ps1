#!/usr/bin/env pwsh
<#
.SYNOPSIS
    One-click startup script for the Real-Time Ride Dispatch System.
    Builds and launches: Backend API + Frontend UI + Jenkins CI/CD
    via Docker Compose, then opens the browser.

.USAGE
    .\scripts\start.ps1
    .\scripts\start.ps1 -WithKubernetes   # also deploy to k8s
    .\scripts\start.ps1 -Rebuild          # force Docker rebuild
#>

param(
    [switch]$WithKubernetes,
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Real-Time Ride Dispatch System — Auto Start    ║" -ForegroundColor Cyan
Write-Host "║   Docker  •  FastAPI  •  React  •  Jenkins       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location $Root

# ── 1. Check Docker ──────────────────────────────────────────────────────────
Write-Host "[ 1/5 ] Checking Docker..." -ForegroundColor Yellow
try {
    $null = docker info 2>&1
    Write-Host "        Docker is running ✓" -ForegroundColor Green
} catch {
    Write-Host "        ERROR: Docker Desktop is not running. Please start it and retry." -ForegroundColor Red
    exit 1
}

# ── 2. Stop old containers ───────────────────────────────────────────────────
Write-Host "[ 2/5 ] Stopping old containers..." -ForegroundColor Yellow
docker compose down --remove-orphans 2>&1 | Out-Null
Write-Host "        Done ✓" -ForegroundColor Green

# ── 3. Build & Start ─────────────────────────────────────────────────────────
$buildFlag = if ($Rebuild) { "--build" } else { "" }
Write-Host "[ 3/5 ] Building & starting services (this may take 2-3 minutes first time)..." -ForegroundColor Yellow
if ($Rebuild) {
    docker compose up -d --build
} else {
    docker compose up -d
}
Write-Host "        Services started ✓" -ForegroundColor Green

# ── 4. Wait for backend health check ────────────────────────────────────────
Write-Host "[ 4/5 ] Waiting for backend API to be ready..." -ForegroundColor Yellow
$retries = 0
do {
    Start-Sleep -Seconds 2
    $retries++
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        $ready = $true
    } catch {
        $ready = $false
        Write-Host "        Still waiting... ($retries/15)" -ForegroundColor DarkGray
    }
} while (-not $ready -and $retries -lt 15)

if ($ready) {
    Write-Host "        Backend API ready ✓" -ForegroundColor Green
} else {
    Write-Host "        Backend still starting — check: docker compose logs backend" -ForegroundColor Yellow
}

# ── 5. Optional Kubernetes deploy ───────────────────────────────────────────
if ($WithKubernetes) {
    Write-Host "[ 5/5 ] Deploying to Kubernetes..." -ForegroundColor Yellow
    kubectl apply -f k8s/
    kubectl rollout status deployment/ride-dispatch-backend  --timeout=120s
    kubectl rollout status deployment/ride-dispatch-frontend --timeout=120s
    Write-Host "        Kubernetes deploy complete ✓" -ForegroundColor Green
} else {
    Write-Host "[ 5/5 ] Kubernetes: skipped (use -WithKubernetes to enable)" -ForegroundColor DarkGray
}

# ── Status Summary ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅  ALL SERVICES UP                 ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  🌐 Frontend  → http://localhost:8080            ║" -ForegroundColor White
Write-Host "║  ⚙️  Backend   → http://localhost:8000            ║" -ForegroundColor White
Write-Host "║  🔧 Jenkins   → http://localhost:9090            ║" -ForegroundColor White
Write-Host "║  📊 API Docs  → http://localhost:8000/docs       ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

docker compose ps

# ── Open browser ─────────────────────────────────────────────────────────────
Start-Sleep -Seconds 3
Write-Host "Opening frontend in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:8080"
