#!/bin/bash
# TraceForge Development Starter (Unix/Linux/macOS)

set -e

echo "🚀 Starting TraceForge Development Environment"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing..."
    npm install -g pnpm
fi

# Check for API keys
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set. Set it in .env or environment."
    echo "   Example: export OPENAI_API_KEY='sk-...'"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Check if packages are built
NEEDS_BUILD=false
if [ ! -d "packages/shared/dist" ]; then
    NEEDS_BUILD=true
fi
if [ ! -d "packages/proxy/dist" ]; then
    NEEDS_BUILD=true
fi

if [ "$NEEDS_BUILD" = true ]; then
    echo "🔨 Building packages..."
    pnpm build
fi

echo ""
echo "✅ Prerequisites checked"
echo ""
echo "Starting services..."
echo "  🔵 Proxy: http://localhost:8787"
echo "  🟣 API:   http://localhost:3001/api"
echo "  🟢 UI:    http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start services with concurrently
pnpm dev
