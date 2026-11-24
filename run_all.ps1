# ======================================================
#       🌟 CLEARFLOW UNIFIED SYSTEM LAUNCHER 🌟
# ======================================================
$env:PATH = "C:\Program Files\nodejs;$env:PATH"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "       CLEARFLOW UNIFIED FULL-STACK LAUNCHER          " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Start AI Microservice (Background Process)
Write-Host "`n[1/3] Starting Python AI Microservice (Port 5001)..." -ForegroundColor Yellow
$pyCmd = "cd '$PSScriptRoot\ai-service'; if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python.exe app.py } else { python app.py }"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $pyCmd

# 2. Seed Database & Verify Cache
Write-Host "[2/3] Seeding Database (High-Availability Store)..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\server"
try {
    npm run seed
} catch {
    Write-Host "[Notice] Running in resilient offline mode." -ForegroundColor Gray
}

# 3. Ensure frontend bundle is built
Set-Location -Path $PSScriptRoot
if (-not (Test-Path "$PSScriptRoot\client\dist\index.html")) {
    Write-Host "`n[Building Client] Compiling frontend assets..." -ForegroundColor Cyan
    npm --prefix "$PSScriptRoot\client" run build
}

# 4. Launch Unified Server in dedicated window
Write-Host "`n[3/3] Launching Unified Web Application (Port 3000)..." -ForegroundColor Green
$serverCmd = "cd '$PSScriptRoot\server'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCmd

Write-Host "Waiting for server to become ready on http://localhost:3000..." -ForegroundColor Cyan
$ready = $false
$attempts = 0
while (-not $ready -and $attempts -lt 25) {
    Start-Sleep -Seconds 1
    $attempts++
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($resp.status -eq 'healthy') {
            $ready = $true
        }
    } catch {}
}

Write-Host "`n------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " 🚀 UNIFIED APP LINK:   http://localhost:3000" -ForegroundColor Cyan
Write-Host " 🔌 REST APIs:          http://localhost:3000/api" -ForegroundColor White
Write-Host " 📖 Swagger API Docs:   http://localhost:3000/api-docs" -ForegroundColor White
Write-Host " 💓 Health Check:       http://localhost:3000/api/health" -ForegroundColor White
Write-Host "------------------------------------------------------`n" -ForegroundColor DarkGray

if ($ready) {
    Write-Host "🌟 Server is live! Opening browser..." -ForegroundColor Green
} else {
    Write-Host "Opening browser..." -ForegroundColor Yellow
}
Start-Process "http://localhost:3000"
