@echo off
title AstroPulse Systems - Backend Telemetry Server
echo ==========================================================
echo  AstroPulse Systems - NASA Space Apps Challenge 2026
echo  Astronaut Telemetry ^& Anomaly Detection Backend
echo ==========================================================
cd /d "%~dp0"

echo [+] Launching FastAPI Telemetry Server on http://localhost:8000
echo [+] WebSocket Stream URL: ws://localhost:8000/ws/telemetry
echo [+] OpenAPI Swagger Docs: http://localhost:8000/docs
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
