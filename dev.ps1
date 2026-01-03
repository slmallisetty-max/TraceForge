# TraceForge Development Starter
# This script starts all services for development

Write-Host "🚀 Starting TraceForge Development Environment" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if pnpm is installed
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  pnpm is not installed. Installing..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check for API keys
if (-not $env:OPENAI_API_KEY) {
    Write-Host "⚠️  OPENAI_API_KEY not set. Set it in .env or environment." -ForegroundColor Yellow
    Write-Host '   Example: Set OPENAI_API_KEY environment variable' -ForegroundColor Gray
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    pnpm install
}

# Check if packages are built
$needsBuild = $false
if (-not (Test-Path "packages/shared/dist")) {
    $needsBuild = $true
}
if (-not (Test-Path "packages/proxy/dist")) {
    $needsBuild = $true
}

if ($needsBuild) {
    Write-Host "🔨 Building packages..." -ForegroundColor Yellow
    pnpm build
}

Write-Host ""
Write-Host "✅ Prerequisites checked" -ForegroundColor Green
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host "  Proxy: http://localhost:8787" -ForegroundColor Blue
Write-Host "  API:   http://localhost:3001/api" -ForegroundColor Magenta
Write-Host "  UI:    http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray
Write-Host ""

# Start services with concurrently
pnpm dev
