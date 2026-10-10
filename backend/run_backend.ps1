# AstroPulse Systems - Backend Startup Script (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AstroPulse Systems - NASA Space Apps Challenge 2026" -ForegroundColor Yellow
Write-Host " Astronaut Telemetry & Anomaly Detection Backend" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $CurrentDir

# Check if uvicorn is available
try {
    python -m uvicorn --version | Out-Null
} catch {
    Write-Host "[!] Installing required packages from requirements.txt..." -ForegroundColor Yellow
    python -m pip install -r requirements.txt
}

Write-Host "[+] Launching FastAPI Telemetry Server on http://localhost:8000" -ForegroundColor Green
Write-Host "[+] WebSocket Stream URL: ws://localhost:8000/ws/telemetry" -ForegroundColor Cyan
Write-Host "[+] OpenAPI Swagger Docs: http://localhost:8000/docs" -ForegroundColor White

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
