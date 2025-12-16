# TraceForge.baseline

> Local-first AI debugging platform that captures, inspects, and tests LLM interactions

[![Status](https://img.shields.io/badge/status-V2%20Complete-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## Overview

TraceForge.baseline helps developers debug AI applications by:
- 🔍 **Intercepting and logging** all LLM API calls
- 🤖 **Multi-provider support** (OpenAI, Anthropic Claude, Google Gemini, Ollama)
- 📊 **Visualizing traces** in a web interface with streaming support
- 🔄 **Side-by-side comparison** with deep diff view and similarity scoring
- ✅ **Creating deterministic tests** from captured traces
- 🧪 **8 advanced assertion types** (exact, contains, regex, fuzzy, JSON path, latency, tokens)
- 📈 **Analytics dashboard** with 6 metrics, timeline charts, and model distribution
- ⚙️ **Web-based config editor** with real-time validation
- 🏃 **Parallel test execution** with fixtures, watch mode, and JUnit XML reporting
- 🔌 **VS Code extension** with TreeView, commands, and YAML snippets
- 🎯 **Provider auto-detection** from model name (no config changes needed)
- 🔒 **100% local-first** - all data stays on your machine (zero cloud)
- ⚡ **Auto-refreshing timeline** (5 second intervals)
- 🌙 **Dark mode UI** built with React + TailwindCSS

## Architecture

- **Proxy Server** (port 8787) - Fastify-based multi-provider proxy that captures traffic
  - OpenAI, Anthropic Claude, Google Gemini, Ollama support
  - Automatic provider detection from model name
  - Unified trace format across all providers
- **Web API** (port 3001) - Fastify REST API serving trace and test data
- **Web UI** (port 5173) - React + Vite frontend with real-time timeline, diff view, and dashboard
- **CLI Tool** - Command-line interface for traces and tests with parallel execution
- **VS Code Extension** - TreeView, commands, and snippets for test management
- **Shared Package** - TypeScript types and Zod schemas used across all packages

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+

### Installation & Start (ONE Command!)

```bash
# Install dependencies
pnpm install

# Start EVERYTHING (proxy + API + UI)
pnpm dev
```

**That's it!** ✅ All services running:
- 🔵 Proxy: http://localhost:8787
- 🟣 API: http://localhost:3001
- 🟢 UI: http://localhost:5173

**Alternative options:**
```bash
# PowerShell script with checks
.\dev.ps1

# Docker (zero setup)
docker-compose up
```

### Usage

1. **Configure your app to use the proxy:**
   ```bash
   export OPENAI_BASE_URL=http://localhost:8787/v1
   export OPENAI_API_KEY=your-key
   export ANTHROPIC_API_KEY=your-anthropic-key  # Optional
   export GEMINI_API_KEY=your-gemini-key        # Optional
   ```

2. **Run your AI application** - Traces are automatically captured
   - Works with any provider: OpenAI, Claude, Gemini, or Ollama
   - Provider is auto-detected from model name

3. **View traces:**
   - Web UI: http://localhost:3001
   - Dashboard: http://localhost:3001/dashboard
   - CLI: `pnpm --filter @traceforge/cli start trace list`

4. **Compare traces:**
   - Click "Compare" button in web UI to see side-by-side diff

5. **Create tests from traces:**
   - Click "Save as Test" in the web UI
   - Or use CLI: `pnpm --filter @traceforge/cli start test create-from-trace <trace-id>`

6. **Run tests:**
   ```bash
   # Run all tests (parallel by default)
   pnpm --filter @traceforge/cli start test run
   
   # Run with specific options
   pnpm --filter @traceforge/cli start test run --parallel --concurrency 10
   
   # Watch mode for rapid development
   pnpm --filter @traceforge/cli start test run --watch
   
   # Generate JUnit XML for CI/CD
   pnpm --filter @traceforge/cli start test run --junit results.xml
   
   # Filter by tags
   pnpm --filter @traceforge/cli start test run --tag smoke integration
   ```

## Project Structure

```
traceforge/
├── packages/
│   ├── shared/          # Shared TypeScript types & Zod schemas
│   ├── proxy/           # LLM proxy server (Fastify)
│   ├── cli/             # Command-line tool (Commander.js)
│   └── web/             # Web UI (Fastify API + React)
├── examples/
│   └── demo-app/        # Demo application for testing
├── docs/                # Documentation
└── package.json         # Workspace root
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode (with watch)
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Documentation

### V2 Features (All Phases Complete!)
- [Phase 1: Streaming Support](docs/v2-phase1-streaming-complete.md) - SSE streaming with chunk capture & replay
- [Phase 2: Trace Diff View](docs/v2-phase2-diff-view-complete.md) - Side-by-side comparison with deep diff
- [Phase 3: Advanced Assertions](docs/v2-phase3-advanced-assertions-complete.md) - 8 assertion types with fuzzy matching
- [Phase 4: Dashboard](docs/v2-phase4-dashboard-complete.md) - Analytics with 6 metrics and timeline charts
- [Phase 5: Config Editor](docs/v2-phase5-config-editor-complete.md) - Web-based YAML editor with validation
- [Phase 6: Test Runner Improvements](docs/v2-phase6-test-runner-complete.md) - Parallel execution, fixtures, watch mode, JUnit
- [Phase 7: VS Code Extension](docs/v2-phase7-vscode-extension-complete.md) - TreeView, commands, YAML snippets
- [Phase 8: Multi-Provider Support](docs/v2-phase-8-multi-provider.md) - OpenAI, Claude, Gemini, Ollama

### Planning
- [Implementation Guide](docs/v1-implementation-guide.md) - Original development plan
- [MVP Plan](docs/mvp-plan.md) - Product roadmap and features
- [Product Idea](docs/idea.md) - Original concept and vision

## VS Code Extension

Install the TraceForge.baseline extension for an integrated development experience:

- 📂 **TreeView panels** for traces and tests
- ▶️ **Run tests** directly from editor
- ➕ **Create tests** from traces with one click
- 🎨 **YAML snippets** for test authoring (type `tf-test`)
- 🔄 **Auto-refresh** traces and tests every 5 seconds
- 🚀 **Proxy management** - start/stop from status bar
- 📊 **Open dashboard** with one click

See [VS Code Extension Guide](docs/v2-phase7-vscode-extension-complete.md) for installation and usage.

## Multi-Provider Support

TraceForge.baseline supports multiple AI providers with automatic routing:

- **OpenAI**: GPT-4, GPT-3.5-turbo, GPT-4-turbo (default)
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 2.1
- **Google**: Gemini Pro, Gemini Pro Vision
- **Ollama**: Llama 2, Mistral, CodeLlama, Phi (local, no API key needed)

Just change the model name - TraceForge.baseline handles the rest:

```python
# Use Claude
response = openai.ChatCompletion.create(
    model="claude-3-opus-20240229",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Use Gemini
response = openai.ChatCompletion.create(
    model="gemini-pro",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

See [Multi-Provider Documentation](docs/v2-phase-8-multi-provider.md) for details.

## License

MIT

## Status

✅ **V2 Complete** - All 8 phases implemented!

- V1 MVP: Complete
- V2 Phase 1-8: Complete
- Multi-provider support ready
- VS Code extension available
