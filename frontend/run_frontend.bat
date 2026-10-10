@echo off
title AstroPulse Systems - Next.js Cockpit Dashboard
echo ==========================================================
echo  AstroPulse Systems - Next.js Cockpit Dashboard
echo  NASA Space Apps Challenge 2026
echo ==========================================================
cd /d "%~dp0"

if not exist node_modules (
    echo [!] Installing frontend dependencies via npm...
    call npm install
)

echo [+] Launching AstroPulse Next.js Dashboard on http://localhost:3000
echo.
call npm run dev
pause
