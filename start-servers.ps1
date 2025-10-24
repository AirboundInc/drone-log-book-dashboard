# Start both proxy server and Vite dev server
Write-Host "Starting Dronelogbook Dashboard..." -ForegroundColor Green

# Start proxy server in background
Write-Host "`nStarting proxy server on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; node server/proxy.js"

# Wait a moment for proxy to start
Start-Sleep -Seconds 2

# Start Vite dev server
Write-Host "Starting Vite dev server on port 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"

Write-Host "`n✅ Both servers starting!" -ForegroundColor Green
Write-Host "Proxy API: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Yellow
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
