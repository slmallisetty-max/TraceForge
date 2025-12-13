# TraceForge Quick Start

Get started with TraceForge in 5 minutes.

## Prerequisites

- Node.js 18+
- pnpm 8+ (or use `npx pnpm`)
- An OpenAI API key

## Installation

```bash
# Clone and install
git clone <repo-url> traceforge
cd traceforge
npx pnpm install

# Build all packages
npx pnpm build
```

## Initialize TraceForge

```bash
# Initialize in your project
npx @traceforge/cli init
```

This creates:
```
.ai-tests/
  ├── traces/       # Captured LLM calls
  ├── tests/        # Test YAML files
  └── config.yaml   # Configuration
```

## Start the Proxy

Terminal 1:
```bash
cd packages/proxy
export OPENAI_API_KEY=your-key-here
node dist/index.js
```

The proxy runs on `http://localhost:8787`

## Configure Your App

Point your application to use the proxy:

```javascript
// Node.js with OpenAI SDK
const openai = new OpenAI({
  baseURL: 'http://localhost:8787/v1',
  apiKey: process.env.OPENAI_API_KEY
});
```

Or via environment variable:
```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
```

## Run Your App

Terminal 2:
```bash
# Run the demo app
cd examples/demo-app
npm install
node index.js
```

## View Traces

### Option A: CLI

```bash
# List all traces
npx @traceforge/cli trace list

# View specific trace
npx @traceforge/cli trace view <trace-id>
```

### Option B: Web UI ⭐

Terminal 2:
```bash
cd packages/web
npx tsx server/index.ts
```

Terminal 3:
```bash
cd packages/web
npx vite
```

Open http://localhost:5173

Features:
- Real-time trace timeline
- Auto-refresh every 5 seconds
- Click traces to view details
- Create tests from web UI
- Dark mode interface

## Create Tests

```bash
# Create test from a trace
npx @traceforge/cli test create-from-trace <trace-id> --name "My Test"

# Edit the test file
# .ai-tests/tests/test-<id>.yaml

# Run tests
npx @traceforge/cli test run
```

## Example Test File

```yaml
id: 550e8400-e29b-41d4-a716-446655440000
name: Test quantum explanation
request:
  model: gpt-3.5-turbo
  messages:
    - role: system
      content: You are a helpful assistant.
    - role: user
      content: Explain quantum computing in one sentence.
assertions:
  - type: contains
    field: choices.0.message.content
    value: quantum
created_at: '2024-01-01T00:00:00.000Z'
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run TraceForge Tests
  run: |
    npx @traceforge/cli test run --json > results.json
```

## What's Next?

- ✅ Phase 0-3: Project setup, proxy, and CLI are done
- 🚧 Phase 4-5: Web UI (coming next)
- 📅 Phase 6: Integration testing

See [v1-implementation-guide.md](v1-implementation-guide.md) for the full roadmap.

## Troubleshooting

### Proxy won't start
- Check that port 8787 is available
- Verify `OPENAI_API_KEY` is set

### No traces appearing
- Verify your app is using `http://localhost:8787/v1`
- Check `.ai-tests/config.yaml` has `save_traces: true`

### Tests fail to run
- Ensure proxy is running
- Check that test YAML files are valid
