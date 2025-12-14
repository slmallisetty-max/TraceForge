# TraceForge - Getting Started Guide

Take your first steps with TraceForge and capture your first LLM trace in 10 minutes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [First Trace Capture](#first-trace-capture)
5. [View Your Traces](#view-your-traces)
6. [Create Your First Test](#create-your-first-test)
7. [Run Tests](#run-tests)
8. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have:

### Required
- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
  ```bash
  node --version  # Should be 18.0.0 or higher
  ```

- ✅ **pnpm 8+** - Fast, disk-efficient package manager
  ```bash
  npm install -g pnpm
  pnpm --version  # Should be 8.0.0 or higher
  ```

### Optional (for specific providers)
- 🔑 **OpenAI API Key** - For GPT models
- 🔑 **Anthropic API Key** - For Claude models
- 🔑 **Google API Key** - For Gemini models
- 🏠 **Ollama** - For local models (no API key needed)

### System Requirements
- **Ports**: 8787, 3001, 5173 must be available
- **Storage**: ~10MB per 1000 traces
- **OS**: macOS, Linux, or Windows

---

## Installation

### Step 1: Clone the Repository

```bash
# Clone TraceForge
git clone https://github.com/your-org/traceforge.git
cd traceforge
```

### Step 2: Install Dependencies

```bash
# Install all dependencies for all packages
pnpm install
```

This installs dependencies for:
- `@traceforge/shared` - Common types and utilities
- `@traceforge/proxy` - LLM traffic interceptor
- `@traceforge/cli` - Command-line tool
- `@traceforge/web` - Web dashboard
- `@traceforge/vscode-extension` - VS Code integration

### Step 3: Build All Packages

```bash
# Build TypeScript to JavaScript
pnpm build
```

This compiles:
- TypeScript → JavaScript
- Type definitions
- All package outputs

**Expected output:**
```
@traceforge/shared: Build complete
@traceforge/proxy: Build complete
@traceforge/cli: Build complete
@traceforge/web: Build complete
@traceforge/vscode-extension: Build complete
```

### Verify Installation

```bash
# Check CLI is working
cd packages/cli
node dist/index.js --version

# Should output: @traceforge/cli v2.0.0
```

---

## Configuration

### Step 1: Initialize TraceForge

Initialize TraceForge in a test project:

```bash
# Create a test project (or use existing)
mkdir my-ai-app
cd my-ai-app

# Initialize TraceForge
npx @traceforge/cli init
```

This creates:
```
my-ai-app/
├── .ai-tests/
│   ├── traces/          # Captured LLM calls stored here
│   ├── tests/           # Test files stored here
│   └── config.yaml      # Configuration file
```

### Step 2: Configure API Keys

Set up environment variables for the AI providers you want to use:

#### Option A: Environment Variables

```bash
# OpenAI (required for GPT models)
export OPENAI_API_KEY="sk-..."

# Anthropic (optional, for Claude)
export ANTHROPIC_API_KEY="sk-ant-..."

# Google Gemini (optional)
export GEMINI_API_KEY="AIza..."

# Ollama runs locally, no key needed
```

#### Option B: .env File

Create a `.env` file in your project:

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

Then load it:
```bash
# Install dotenv
npm install dotenv

# In your app
require('dotenv').config();
```

### Step 3: Configure Providers (Optional)

Edit `.ai-tests/config.yaml` to customize provider settings:

```yaml
# Basic configuration
test_dir: .ai-tests
trace_dir: .ai-tests/traces
test_pattern: "**/*.test.yaml"

# Provider configuration
providers:
  - type: openai
    name: OpenAI
    base_url: https://api.openai.com
    api_key_env_var: OPENAI_API_KEY
    enabled: true
    default: true

  - type: anthropic
    name: Anthropic Claude
    base_url: https://api.anthropic.com
    api_key_env_var: ANTHROPIC_API_KEY
    enabled: true

  - type: gemini
    name: Google Gemini
    base_url: https://generativelanguage.googleapis.com
    api_key_env_var: GEMINI_API_KEY
    enabled: false  # Enable when ready

  - type: ollama
    name: Ollama Local
    base_url: http://localhost:11434
    enabled: false  # Enable if using Ollama
```

---

## First Trace Capture

Let's capture your first LLM interaction!

### Step 1: Start the Proxy Server

Open **Terminal 1** and start the TraceForge proxy:

```bash
cd traceforge/packages/proxy

# Set your API key
export OPENAI_API_KEY="sk-..."

# Start the proxy
pnpm start
```

**Expected output:**
```
🚀 TraceForge Proxy running on http://localhost:8787
📊 Saving traces to: .ai-tests/traces/
✨ Multi-provider support enabled
```

The proxy is now listening on port **8787** and will intercept all LLM calls.

### Step 2: Create a Test Application

Create a simple Node.js app that calls OpenAI:

```bash
# In a new directory
mkdir test-app && cd test-app
npm init -y
npm install openai
```

Create `index.js`:

```javascript
// index.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // 👇 Point to TraceForge proxy instead of OpenAI directly
  baseURL: 'http://localhost:8787/v1'
});

async function main() {
  console.log('Sending request to OpenAI via TraceForge proxy...');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is 2+2?' }
    ]
  });

  console.log('Response:', response.choices[0].message.content);
}

main();
```

### Step 3: Run Your Application

```bash
# Make sure proxy is running in Terminal 1
# Run your app in Terminal 2
node index.js
```

**Expected output:**
```
Sending request to OpenAI via TraceForge proxy...
Response: 2+2 equals 4.
```

### Step 4: Verify Trace Was Captured

Check the proxy terminal - you should see:
```
📝 Captured trace: trace_abc123xyz
   Model: gpt-3.5-turbo
   Tokens: 45
   Duration: 1234ms
```

And a new file appears:
```
.ai-tests/traces/trace_abc123xyz.json
```

**🎉 Congratulations!** You captured your first trace!

---

## View Your Traces

Now let's view the trace data in different ways.

### Option 1: Web UI (Recommended)

The web UI provides the best experience for browsing traces.

#### Start the Web Server

Open **Terminal 3**:

```bash
cd traceforge/packages/web

# Start the backend API
pnpm server
```

Expected output:
```
Server listening at http://localhost:3001
```

#### Start the Frontend

Open **Terminal 4**:

```bash
cd traceforge/packages/web

# Start the Vite dev server
pnpm dev
```

Expected output:
```
VITE v5.x.x ready in 500ms
Local: http://localhost:5173/
```

#### View in Browser

Open http://localhost:5173/ in your browser.

You should see:
- **Timeline View** - All captured traces in chronological order
- **Trace Details** - Click any trace to see full request/response
- **Auto-refresh** - Timeline updates every 5 seconds

**What you can do:**
- 🔍 Click a trace to see full details
- 📊 View request/response, timing, tokens
- 💾 Click "Save as Test" to create a test
- 🔄 Click "Compare" to diff two traces

### Option 2: CLI

View traces from the command line:

```bash
cd traceforge/packages/cli

# List all traces
node dist/index.js trace list

# Output:
# ID              Model            Status  Time     Tokens
# trace_abc123    gpt-3.5-turbo   200     1234ms   45

# View specific trace
node dist/index.js trace view trace_abc123

# Output:
# Trace: trace_abc123
# Provider: openai
# Model: gpt-3.5-turbo
# Status: 200
# Duration: 1234ms
# Tokens: 45
#
# Request:
# {
#   "model": "gpt-3.5-turbo",
#   "messages": [...]
# }
#
# Response:
# {
#   "choices": [...]
# }
```

---

## Create Your First Test

Convert your captured trace into a reproducible test.

### Option 1: Web UI

1. Open http://localhost:5173/
2. Click on the trace you want to test
3. Click **"Save as Test"** button
4. Enter test name: `test-math-question`
5. Click **"Create Test"**

A test file is created at:
```
.ai-tests/tests/test-math-question.test.yaml
```

### Option 2: CLI

```bash
cd traceforge/packages/cli

# Create test from trace
node dist/index.js test create-from-trace trace_abc123 \
  --name "test-math-question"
```

### Option 3: Manual Creation

Create a test file manually:

```yaml
# .ai-tests/tests/math.test.yaml
name: Test math question
description: Verify AI can do basic math

request:
  model: gpt-3.5-turbo
  messages:
    - role: system
      content: You are a helpful assistant.
    - role: user
      content: What is 2+2?

assertions:
  - type: equals
    path: choices[0].message.content
    expected: "4"
  
  - type: content_contains
    value: "4"
  
  - type: response_time
    max_ms: 2000
```

**Test assertions explained:**
- `equals` - Response must exactly match "4"
- `content_contains` - Response must contain "4"
- `response_time` - Must complete within 2 seconds

---

## Run Tests

Execute your tests to verify AI behavior.

### Run All Tests

```bash
cd traceforge/packages/cli

# Run all tests
node dist/index.js test run
```

**Expected output:**
```
Running tests...

✓ test-math-question (1.2s)
  ✓ equals assertion passed
  ✓ content_contains assertion passed
  ✓ response_time assertion passed

Tests: 1 passed, 1 total
Time: 1.234s
```

### Run Specific Test

```bash
# Run tests matching a pattern
node dist/index.js test run --filter "math"

# Only runs tests with "math" in the name
```

### Run Tests in Parallel

For faster execution with multiple tests:

```bash
node dist/index.js test run --parallel

# Runs tests concurrently
# Up to 5 tests at once by default
```

### Watch Mode

Auto-run tests when files change:

```bash
node dist/index.js test run --watch

# Watches for changes to:
# - Test files (*.test.yaml)
# - Config file (config.yaml)
```

### Generate JUnit XML Report

For CI/CD integration:

```bash
node dist/index.js test run --junit

# Creates: .ai-tests/junit.xml
```

---

## Next Steps

### Level 1: Basic Usage

Now that you have the basics, try:

1. **Capture More Traces**
   - Try different prompts
   - Use different models (gpt-4, gpt-3.5-turbo)
   - Test with streaming: `stream: true`

2. **Create More Tests**
   - Test edge cases
   - Add multiple assertions per test
   - Use different assertion types

3. **Explore the Web UI**
   - View trace timeline
   - Compare two traces with diff view
   - Check the analytics dashboard

### Level 2: Multi-Provider

4. **Try Different Providers**
   ```bash
   # Claude
   export ANTHROPIC_API_KEY="sk-ant-..."
   # In your app, use model: "claude-3-opus-20240229"
   
   # Gemini
   export GEMINI_API_KEY="AIza..."
   # In your app, use model: "gemini-pro"
   
   # Ollama (local)
   # Install Ollama first: https://ollama.ai
   ollama serve
   # In your app, use model: "llama2"
   ```

5. **Compare Providers**
   - Send same prompt to GPT-4, Claude, Gemini
   - Use diff view to compare responses
   - Analyze token usage and cost

### Level 3: Advanced Testing

6. **Advanced Assertions**
   ```yaml
   assertions:
     # Fuzzy matching (85% similarity)
     - type: fuzzy_match
       expected: "The answer is four"
       threshold: 0.85
     
     # JSON path queries
     - type: json_path
       path: "$.choices[0].message.tool_calls[0].function.name"
       expected: "calculate"
     
     # Schema validation
     - type: schema_validation
       schema:
         type: object
         required: [choices]
   ```

7. **Test Fixtures**
   - Set up common test data
   - Share fixtures across tests
   - Clean up after tests

8. **CI/CD Integration**
   - Add to GitHub Actions
   - Run tests on every PR
   - Fail build on regression

### Level 4: Team Collaboration

9. **VS Code Extension**
   ```bash
   cd traceforge/packages/vscode-extension
   pnpm package
   code --install-extension traceforge-*.vsix
   ```
   - View tests in sidebar
   - Run tests with one click
   - Create tests from editor

10. **Share Tests**
    - Commit `.ai-tests/tests/` to git
    - Share reproducible AI behaviors
    - Collaborate on test coverage

---

## Troubleshooting

### Proxy Not Starting

**Error**: `Port 8787 already in use`

**Solution**:
```bash
# Find process using port 8787
lsof -i :8787  # macOS/Linux
netstat -ano | findstr :8787  # Windows

# Kill the process or change port in config
```

### Traces Not Captured

**Error**: Traces not appearing in `.ai-tests/traces/`

**Checklist**:
- ✅ Is proxy running? Check http://localhost:8787/health
- ✅ Is your app using `baseURL: 'http://localhost:8787/v1'`?
- ✅ Is `.ai-tests/` directory created? Run `traceforge init`
- ✅ Check proxy logs for errors

### API Key Errors

**Error**: `Invalid API key`

**Solution**:
```bash
# Verify key is set
echo $OPENAI_API_KEY

# If empty, set it
export OPENAI_API_KEY="sk-..."

# Test with curl
curl http://localhost:8787/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Build Failures

**Error**: TypeScript compilation errors

**Solution**:
```bash
# Clean and rebuild
rm -rf node_modules
rm -rf packages/*/dist
pnpm install
pnpm build

# If still failing, check Node version
node --version  # Must be 18+
```

### Web UI Not Loading

**Error**: Cannot connect to http://localhost:5173/

**Checklist**:
- ✅ Is web server running? (Terminal 3: `pnpm server`)
- ✅ Is Vite running? (Terminal 4: `pnpm dev`)
- ✅ Check console for errors
- ✅ Try http://localhost:3001/api/traces directly

---

## Common Workflows

### Workflow: Debug Production Issue

```bash
# 1. Production app is using proxy
export OPENAI_BASE_URL=http://localhost:8787/v1

# 2. Issue happens - trace is captured
# 3. Find the trace
traceforge trace list --filter "error"

# 4. View full details
traceforge trace view <trace-id>

# 5. Create regression test
traceforge test create-from-trace <trace-id>

# 6. Fix code, run test
traceforge test run
```

### Workflow: Compare Models

```javascript
// Send same prompt to multiple models
const models = ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus-20240229'];

for (const model of models) {
  await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Explain quantum computing' }]
  });
}

// View traces in UI
// Click "Compare" to see differences
// Analyze: quality, speed, cost
```

### Workflow: Streaming Response

```javascript
// Test streaming responses
const stream = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Count to 10' }],
  stream: true  // Enable streaming
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// View in UI - see chunk-by-chunk timing
// Create test with streaming assertions
```

---

## Resources

### Documentation
- [API Reference](API-REFERENCE.md) - Complete CLI and REST API
- [Architecture](ARCHITECTURE.md) - How TraceForge works
- [Advanced Topics](ADVANCED.md) - Multi-provider, performance
- [Tutorials](TUTORIALS.md) - Step-by-step examples

### Support
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [GitHub Issues](https://github.com/your-org/traceforge/issues) - Bug reports
- [Discussions](https://github.com/your-org/traceforge/discussions) - Q&A

### Community
- [Contributing Guide](CONTRIBUTING.md) - Help improve TraceForge
- [Changelog](CHANGELOG.md) - What's new

---

## Quick Reference Card

```bash
# Initialize
traceforge init

# Start proxy
cd packages/proxy && pnpm start

# Start web UI
cd packages/web && pnpm dev

# List traces
traceforge trace list

# View trace
traceforge trace view <id>

# Create test
traceforge test create-from-trace <id>

# Run tests
traceforge test run
traceforge test run --parallel
traceforge test run --watch

# Configure app
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=sk-...
```

---

**🎉 You're all set!**

You now know how to:
- ✅ Install and configure TraceForge
- ✅ Capture LLM traces
- ✅ View traces in UI and CLI
- ✅ Create and run tests
- ✅ Debug common issues

**Next**: [Explore Advanced Topics →](ADVANCED.md)
