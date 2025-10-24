# PowerShell script to install Node.js and run the dashboard

Write-Host "🚀 Drone Log Book Dashboard Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Node.js is already installed
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js is already installed: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    
    # Check if winget is available
    try {
        winget --version | Out-Null
        Write-Host "📦 Installing Node.js using winget..." -ForegroundColor Yellow
        winget install OpenJS.NodeJS
        Write-Host "✅ Node.js installation completed!" -ForegroundColor Green
        Write-Host "⚠️  Please restart your terminal and run this script again." -ForegroundColor Yellow
        exit
    } catch {
        Write-Host "❌ winget is not available" -ForegroundColor Red
        Write-Host "📖 Please install Node.js manually:" -ForegroundColor Yellow
        Write-Host "   1. Visit https://nodejs.org/" -ForegroundColor White
        Write-Host "   2. Download the LTS version" -ForegroundColor White
        Write-Host "   3. Run the installer" -ForegroundColor White
        Write-Host "   4. Restart your terminal" -ForegroundColor White
        Write-Host "   5. Run this script again" -ForegroundColor White
        exit
    }
}

# Check if npm is available
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm is available: $npmVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    exit
}

# Install dependencies
Write-Host "📦 Installing project dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    
    Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
    Write-Host "   Dashboard will be available at: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
    
    # Start the development server
    npm run dev
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "   Please check the error messages above" -ForegroundColor Yellow
}