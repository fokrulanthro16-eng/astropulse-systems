# AstroPulse Systems - Unified Launcher (PowerShell)
# NASA Space Apps Challenge 2026

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AstroPulse Systems - Unified Launcher" -ForegroundColor Yellow
Write-Host " NASA Space Apps Challenge 2026" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Launch Backend in new window
Write-Host "[1/2] Launching AstroPulse FastAPI Backend on port 8000..." -ForegroundColor Cyan
$BackendCommand = "cd '$ScriptDir\backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand

Start-Sleep -Seconds 2

# 2. Launch Frontend in new window
Write-Host "[2/2] Launching AstroPulse Next.js Cockpit on port 3000..." -ForegroundColor Cyan
$FrontendCommand = "cd '$ScriptDir\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " AstroPulse Systems is running!" -ForegroundColor Green
Write-Host " - Frontend UI:      http://localhost:3000" -ForegroundColor Yellow
Write-Host " - Backend API:     http://localhost:8000" -ForegroundColor Yellow
Write-Host " - API Docs (Swagger): http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host " - Telemetry Stream: ws://localhost:8000/ws/telemetry" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
