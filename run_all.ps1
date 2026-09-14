# ======================================================
#       🌟 CLEARFLOW UNIFIED SYSTEM LAUNCHER 🌟
# ======================================================
$env:PATH = "C:\Program Files\nodejs;$env:PATH"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "       CLEARFLOW UNIFIED FULL-STACK LAUNCHER          " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Start AI Microservice (Background Process)
Write-Host "`n[1/3] Starting Python AI Microservice (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ai-service'; python app.py"

# 2. Seed Database
Write-Host "[2/3] Seeding MongoDB Database..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\server"
& "C:\Program Files\nodejs\npm.cmd" run seed

# 3. Launch Unified Server (Frontend + Backend + WebSockets on Port 3000)
Write-Host "[3/3] Launching Unified Web Application (Port 3000)..." -ForegroundColor Green
Write-Host "`n------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " 🚀 UNIFIED APP LINK:   http://localhost:3000" -ForegroundColor Cyan
Write-Host " 🔌 REST APIs:          http://localhost:3000/api" -ForegroundColor White
Write-Host " 📖 Swagger API Docs:   http://localhost:3000/api-docs" -ForegroundColor White
Write-Host " 💓 Health Check:       http://localhost:3000/api/health" -ForegroundColor White
Write-Host "------------------------------------------------------`n" -ForegroundColor DarkGray

# Open browser to the unified link
Start-Process "http://localhost:3000"

# Start the unified dev server
& "C:\Program Files\nodejs\npm.cmd" run dev
