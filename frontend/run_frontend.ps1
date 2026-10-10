# AstroPulse Systems - Frontend Startup Script (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AstroPulse Systems - Next.js Cockpit Dashboard" -ForegroundColor Yellow
Write-Host " NASA Space Apps Challenge 2026" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $CurrentDir

if (-not (Test-Path "node_modules")) {
    Write-Host "[!] Installing frontend dependencies via npm..." -ForegroundColor Yellow
    npm install
}

Write-Host "[+] Launching AstroPulse Next.js Dashboard on http://localhost:3000" -ForegroundColor Green
npm run dev
