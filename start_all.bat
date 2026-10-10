@echo off
title AstroPulse Systems - Unified Launcher
echo ==========================================================
echo  AstroPulse Systems - Unified Launcher
echo  NASA Space Apps Challenge 2026
echo ==========================================================
cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "AstroPulse Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Next.js Frontend Cockpit on http://localhost:3000 ...
start "AstroPulse Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================================
echo  AstroPulse Systems is launched!
echo  Frontend UI:       http://localhost:3000
echo  Backend API Docs:  http://localhost:8000/docs
echo  WebSocket Stream:  ws://localhost:8000/ws/telemetry
echo ==========================================================
echo.
pause
