#!/bin/sh
set -e

echo "🚀 Starting TraceForge in Docker..."

# Initialize .ai-tests if not exists
if [ ! -f ".ai-tests/config.yaml" ]; then
    echo "Initializing TraceForge configuration..."
    node packages/cli/dist/index.js init
fi

# Clean up function
cleanup() {
    echo "Shutting down services..."
    kill $PROXY_PID 2>/dev/null || true
}

# Set up trap before starting processes
trap cleanup EXIT INT TERM

# Start proxy in background
echo "Starting proxy on port 8787..."
node packages/proxy/dist/index.js &
PROXY_PID=$!

# Give proxy time to start
sleep 3

# Start web server in foreground (this keeps the container running)
echo "Starting web UI on port 3001..."
exec node packages/web/dist/server/index.js
