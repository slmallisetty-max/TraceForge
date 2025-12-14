# TraceForge Troubleshooting Guide

Common issues and their solutions.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Proxy Server Issues](#proxy-server-issues)
3. [Runtime Issues](#runtime-issues)
4. [Testing Issues](#testing-issues)
5. [Web UI Issues](#web-ui-issues)
6. [VS Code Extension Issues](#vscode-extension-issues)
7. [Provider-Specific Issues](#provider-specific-issues)
8. [Performance Issues](#performance-issues)

---

## Installation Issues

### Node Version Error

**Error:**
```
Error: The engine "node" is incompatible with this module.
Expected version ">=18.0.0". Got "16.14.0"
```

**Solution:**
```bash
# Check your Node version
node --version

# Upgrade Node.js
# Using nvm:
nvm install 18
nvm use 18

# Or download from: https://nodejs.org/
```

---

### pnpm Not Found

**Error:**
```
pnpm: command not found
```

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

---

### Build Failures

**Error:**
```
Error: Cannot find module '@traceforge/shared'
```

**Solution:**
```bash
# Clean everything and rebuild
rm -rf node_modules
rm -rf packages/*/dist
rm -rf packages/*/node_modules
rm pnpm-lock.yaml

# Reinstall and rebuild
pnpm install
pnpm build

# Verify each package built
ls packages/*/dist
```

---

### TypeScript Compilation Errors

**Error:**
```
error TS2307: Cannot find module '@traceforge/shared'
```

**Solution:**
```bash
# Build shared package first
cd packages/shared
pnpm build

# Then build other packages
cd ../proxy && pnpm build
cd ../cli && pnpm build
cd ../web && pnpm build
```

---

## Proxy Server Issues

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::8787
```

**Solution:**

**Option 1: Kill the process**
```bash
# macOS/Linux
lsof -ti:8787 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 8787).OwningProcess | Stop-Process -Force
```

**Option 2: Change the port**
```yaml
# .ai-tests/config.yaml
proxy:
  port: 8788  # Use different port
```

Then update your app:
```javascript
const openai = new OpenAI({
  baseURL: 'http://localhost:8788/v1'  // New port
});
```

---

### Proxy Not Starting

**Error:**
```
(node:12345) UnhandledPromiseRejectionWarning: Error: Cannot read config
```

**Solution:**
```bash
# Initialize TraceForge if not done
cd your-project
npx @traceforge/cli init

# Verify config exists
ls .ai-tests/config.yaml

# Check config is valid YAML
cat .ai-tests/config.yaml
```

---

### API Key Not Found

**Error:**
```
Error: OPENAI_API_KEY environment variable not set
```

**Solution:**
```bash
# Set environment variable
export OPENAI_API_KEY="sk-..."

# Or use .env file
echo "OPENAI_API_KEY=sk-..." > .env

# Verify it's set
echo $OPENAI_API_KEY
```

---

### Proxy Can't Reach Provider

**Error:**
```
Error: getaddrinfo ENOTFOUND api.openai.com
```

**Solution:**

**Check internet connection:**
```bash
# Test connectivity
curl https://api.openai.com/v1/models

# If using proxy, set:
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

**Check DNS:**
```bash
# Test DNS resolution
nslookup api.openai.com

# Try different DNS (e.g., Google DNS)
# Add to /etc/resolv.conf:
nameserver 8.8.8.8
```

---

## Runtime Issues

### Traces Not Being Captured

**Problem**: App runs but no traces appear in `.ai-tests/traces/`

**Checklist:**

1. **Is proxy running?**
   ```bash
   curl http://localhost:8787/health
   # Should return: {"status": "ok"}
   ```

2. **Is app using proxy?**
   ```javascript
   // Check your app has:
   const openai = new OpenAI({
     baseURL: 'http://localhost:8787/v1'  // ← This line
   });
   ```

3. **Check proxy logs**
   ```bash
   # Proxy should log each request
   cd packages/proxy
   pnpm start
   # Watch for: "📝 Captured trace: trace_..."
   ```

4. **Verify directory exists**
   ```bash
   ls -la .ai-tests/traces/
   # Should show directory with write permissions
   ```

---

### Invalid API Key

**Error:**
```
401 Unauthorized: Incorrect API key provided
```

**Solution:**

```bash
# Check API key format
echo $OPENAI_API_KEY
# Should start with "sk-" for OpenAI
# Should start with "sk-ant-" for Anthropic

# Test key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# If invalid, get new key from:
# OpenAI: https://platform.openai.com/api-keys
# Anthropic: https://console.anthropic.com/
```

---

### Request Timeout

**Error:**
```
Error: Request timeout after 30000ms
```

**Solution:**

**Increase timeout:**
```javascript
const openai = new OpenAI({
  baseURL: 'http://localhost:8787/v1',
  timeout: 60000  // 60 seconds
});
```

**Or in test:**
```yaml
# .ai-tests/tests/slow-test.test.yaml
name: slow-test
timeout: 60000  # milliseconds

request:
  model: gpt-4
  # ...
```

---

## Testing Issues

### Test File Not Found

**Error:**
```
Error: No test files found matching pattern "**/*.test.yaml"
```

**Solution:**

```bash
# Check test directory
ls .ai-tests/tests/

# Verify test file naming
# Must end with .test.yaml
mv my-test.yaml my-test.test.yaml

# Check config.yaml pattern
cat .ai-tests/config.yaml
# Should have:
test_pattern: "**/*.test.yaml"
```

---

### Assertion Failed

**Error:**
```
✗ equals assertion failed
  Expected: "Hello!"
  Actual:   "Hello there!"
```

**Solution:**

**Option 1: Use fuzzy matching**
```yaml
assertions:
  - type: fuzzy_match
    expected: "Hello!"
    threshold: 0.8  # 80% similarity
```

**Option 2: Use content_contains**
```yaml
assertions:
  - type: content_contains
    value: "Hello"
```

**Option 3: Update expected value**
```yaml
assertions:
  - type: equals
    expected: "Hello there!"  # Updated
```

---

### Test Hangs Forever

**Problem**: Test runs but never completes

**Solutions:**

1. **Check for infinite loops**
   ```bash
   # Add timeout
   traceforge test run --timeout 10000
   ```

2. **Check proxy is responding**
   ```bash
   curl -X POST http://localhost:8787/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"hi"}]}'
   ```

3. **Check for streaming issues**
   ```yaml
   # If test uses streaming, set:
   request:
     stream: true  # Explicitly set
   ```

---

### Parallel Tests Fail

**Error:**
```
Error: Too many concurrent requests
```

**Solution:**

```bash
# Reduce worker count
traceforge test run --parallel --workers 3

# Or run sequentially
traceforge test run
```

---

## Web UI Issues

### Web UI Not Loading

**Problem**: http://localhost:5173/ shows "Can't connect"

**Checklist:**

1. **Is backend running?**
   ```bash
   # Terminal 1
   cd packages/web
   pnpm server
   # Should see: "Server listening at http://localhost:3001"
   ```

2. **Is frontend running?**
   ```bash
   # Terminal 2
   cd packages/web
   pnpm dev
   # Should see: "Local: http://localhost:5173/"
   ```

3. **Test backend directly**
   ```bash
   curl http://localhost:3001/api/traces
   # Should return JSON array
   ```

4. **Check for port conflicts**
   ```bash
   lsof -i :3001  # Backend
   lsof -i :5173  # Frontend
   ```

---

### Blank Screen in Browser

**Problem**: Page loads but shows nothing

**Solutions:**

1. **Open browser console** (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Check CORS**
   ```javascript
   // packages/web/server/index.ts
   app.use(cors());  // Should be present
   ```

3. **Clear browser cache**
   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   Safari: Cmd+Option+E
   ```

---

### Traces Not Updating

**Problem**: New traces don't appear in UI

**Solutions:**

1. **Manual refresh**
   - Click browser refresh button
   - Or press F5

2. **Check auto-refresh**
   ```javascript
   // Should refresh every 5 seconds
   // Check browser console for errors
   ```

3. **Restart backend**
   ```bash
   # Kill and restart
   pkill -f "tsx server/index.ts"
   cd packages/web
   pnpm server
   ```

---

## VS Code Extension Issues

### Extension Not Loading

**Problem**: TraceForge extension doesn't appear in VS Code

**Solutions:**

1. **Check installation**
   ```bash
   code --list-extensions | grep traceforge
   ```

2. **Reinstall**
   ```bash
   cd packages/vscode-extension
   pnpm package
   code --install-extension traceforge-*.vsix --force
   ```

3. **Check VS Code version**
   - Requires VS Code 1.80+
   - Update VS Code if needed

4. **Check extension logs**
   - VS Code → Output → Select "TraceForge"
   - Look for error messages

---

### Tree View Empty

**Problem**: Test/Trace tree shows no items

**Solutions:**

1. **Initialize workspace**
   ```bash
   npx @traceforge/cli init
   ```

2. **Verify directory structure**
   ```bash
   ls .ai-tests/
   # Should have: traces/, tests/, config.yaml
   ```

3. **Reload window**
   - Command Palette (Ctrl+Shift+P)
   - Type: "Reload Window"

---

## Provider-Specific Issues

### Anthropic Claude Issues

**Error:**
```
400 Bad Request: Invalid request format
```

**Solution:**

```yaml
# Claude requires specific format
request:
  model: claude-3-opus-20240229  # Full model name
  messages:
    - role: user
      content: "Hello"  # No system role in Claude API
  max_tokens: 1024  # Required for Claude
```

---

### Google Gemini Issues

**Error:**
```
400 Bad Request: API key not valid
```

**Solution:**

```bash
# Gemini uses different key format
export GEMINI_API_KEY="AIza..."  # Starts with AIza

# Test key
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

---

### Ollama Issues

**Error:**
```
ECONNREFUSED connect ECONNREFUSED 127.0.0.1:11434
```

**Solution:**

```bash
# Start Ollama server
ollama serve

# Check it's running
curl http://localhost:11434/api/tags

# Pull model if needed
ollama pull llama2
```

---

## Performance Issues

### Slow Trace Loading

**Problem**: UI takes long to load traces

**Solutions:**

1. **Reduce trace count**
   ```bash
   # Delete old traces
   find .ai-tests/traces -mtime +30 -delete
   ```

2. **Filter traces**
   ```bash
   # View only recent
   traceforge trace list --limit 50
   ```

3. **Use pagination** (future feature)

---

### High Memory Usage

**Problem**: Node process using too much RAM

**Solutions:**

1. **Limit concurrent tests**
   ```bash
   traceforge test run --parallel --workers 3
   ```

2. **Increase Node memory**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **Clean up traces**
   ```bash
   # Keep only recent traces
   find .ai-tests/traces -mtime +7 -delete
   ```

---

### Slow Tests

**Problem**: Tests take too long

**Solutions:**

1. **Use faster model**
   ```yaml
   request:
     model: gpt-3.5-turbo  # Instead of gpt-4
   ```

2. **Reduce max_tokens**
   ```yaml
   request:
     max_tokens: 100  # Instead of 1000
   ```

3. **Run in parallel**
   ```bash
   traceforge test run --parallel
   ```

---

## Getting More Help

### Enable Debug Logging

```bash
# Set log level
export TRACEFORGE_LOG_LEVEL=debug

# Run with verbose flag
traceforge test run --verbose
```

### Collect Diagnostic Info

```bash
# System info
node --version
pnpm --version
cat .ai-tests/config.yaml

# Check processes
ps aux | grep node

# Check ports
lsof -i :8787
lsof -i :3001
lsof -i :5173
```

### Report a Bug

Include this information when reporting bugs:

1. **TraceForge version**
   ```bash
   traceforge --version
   ```

2. **Error message** (full stack trace)

3. **Steps to reproduce**

4. **Environment**
   - OS (macOS, Linux, Windows)
   - Node version
   - pnpm version

5. **Relevant files**
   - config.yaml
   - test file (if applicable)
   - trace file (if applicable)

---

## Common Error Messages

### EACCES: permission denied

```bash
# Fix permissions
chmod -R 755 .ai-tests/
```

### ENOENT: no such file or directory

```bash
# Create missing directory
mkdir -p .ai-tests/traces
mkdir -p .ai-tests/tests
```

### Invalid JSON

```bash
# Check trace file
cat .ai-tests/traces/trace_abc123.json | jq .
# If error, file is corrupted - delete it
```

### Module not found

```bash
# Rebuild packages
pnpm build
```

---

## Still Having Issues?

1. **Check documentation**: [Getting Started Guide](DEV-GETTING-STARTED.md)
2. **Search existing issues**: [GitHub Issues](https://github.com/your-org/traceforge/issues)
3. **Ask in discussions**: [GitHub Discussions](https://github.com/your-org/traceforge/discussions)
4. **Report new bug**: [New Issue](https://github.com/your-org/traceforge/issues/new)

---

**Pro Tip**: When in doubt, try the "turn it off and on again" approach:

```bash
# Kill all TraceForge processes
pkill -f traceforge

# Clean build
rm -rf node_modules packages/*/dist
pnpm install
pnpm build

# Start fresh
cd packages/proxy && pnpm start
```

This solves 80% of issues! 🎯
