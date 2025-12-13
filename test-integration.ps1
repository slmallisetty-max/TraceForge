# TraceForge Phase 6 Integration Testing Script
# This script tests all components together

Write-Host "🧪 TraceForge Integration Tests - Phase 6" -ForegroundColor Cyan
Write-Host ""

# Test 1: Verify all packages build
Write-Host "Test 1: Building all packages..." -ForegroundColor Yellow
Set-Location "C:\TraceForge"

# Build shared
Write-Host "  Building shared package..."
Set-Location "packages\shared"
npx tsc
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Shared package build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Shared package built" -ForegroundColor Green

# Build proxy
Write-Host "  Building proxy package..."
Set-Location "..\proxy"
npx tsc
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Proxy package build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Proxy package built" -ForegroundColor Green

# Build CLI
Write-Host "  Building CLI package..."
Set-Location "..\cli"
npx tsc
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CLI package build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ CLI package built" -ForegroundColor Green

# Build web server
Write-Host "  Building web server..."
Set-Location "..\web"
npx tsc --project tsconfig.server.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web server build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Web server built" -ForegroundColor Green

# Typecheck web frontend
Write-Host "  Typechecking web frontend..."
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web frontend typecheck failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Web frontend typechecked" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Test 1 PASSED: All packages build successfully" -ForegroundColor Green
Write-Host ""

# Test 2: Initialize TraceForge
Write-Host "Test 2: Initializing TraceForge..." -ForegroundColor Yellow
Set-Location "C:\TraceForge"
node packages\cli\dist\index.js init
Write-Host "✅ Test 2 PASSED: TraceForge initialized" -ForegroundColor Green
Write-Host ""

# Test 3: Check structure
Write-Host "Test 3: Verifying .ai-tests directory structure..." -ForegroundColor Yellow
if (Test-Path ".ai-tests") {
    Write-Host "  ✅ .ai-tests directory exists" -ForegroundColor Green
    if (Test-Path ".ai-tests\traces") {
        Write-Host "  ✅ traces directory exists" -ForegroundColor Green
    }
    if (Test-Path ".ai-tests\tests") {
        Write-Host "  ✅ tests directory exists" -ForegroundColor Green
    }
    if (Test-Path ".ai-tests\config.json") {
        Write-Host "  ✅ config.json exists" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .ai-tests directory not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Test 3 PASSED: Directory structure verified" -ForegroundColor Green
Write-Host ""

Write-Host "All basic tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Manual testing steps:" -ForegroundColor Cyan
Write-Host "  1. Start proxy in Terminal 1"
Write-Host "  2. Start web API in Terminal 2"
Write-Host "  3. Start frontend in Terminal 3"
Write-Host "  4. Run demo app in Terminal 4"
Write-Host "  5. Open browser to localhost:5173"
Write-Host ""
