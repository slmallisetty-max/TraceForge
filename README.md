# TraceForge.baseline

> Local-first AI debugging platform that captures, inspects, and tests LLM interactions

[![Status](https://img.shields.io/badge/status-V2%20Complete-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()

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
- 🎬 **VCR mode** - record/replay for deterministic, offline, cost-free testing

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
npx pnpm install

# Start EVERYTHING (proxy + API + UI)
npx pnpm dev
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
   - CLI: `npx pnpm --filter @traceforge/cli start trace list`

4. **Compare traces:**
   - Click "Compare" button in web UI to see side-by-side diff

5. **Create tests from traces:**
   - Click "Save as Test" in the web UI
   - Or use CLI: `npx pnpm --filter @traceforge/cli start test create-from-trace <trace-id>`

6. **Run tests:**
   ```bash
   # Run all tests (parallel by default)
   npx pnpm --filter @traceforge/cli start test run

   # Run with JUnit XML output
   npx pnpm --filter @traceforge/cli start test run --junit

   # Watch mode
   npx pnpm --filter @traceforge/cli start test run --watch
   ```

7. **VCR Mode for deterministic testing:**
   ```bash
   # Check VCR status
   npx pnpm --filter @traceforge/cli start vcr status

   # Record cassettes (capture live API responses)
   TRACEFORGE_VCR_MODE=record npx pnpm --filter @traceforge/cli start test run

   # Replay from cassettes (no API calls, no API keys needed!)
   TRACEFORGE_VCR_MODE=replay npx pnpm --filter @traceforge/cli start test run

   # Auto mode (replay if exists, otherwise record)
   TRACEFORGE_VCR_MODE=auto npx pnpm --filter @traceforge/cli start test run

   # Clean all cassettes
   npx pnpm --filter @traceforge/cli start vcr clean --yes
   ```

   **VCR Mode Benefits:**
   - ✅ Deterministic tests (same response every time)
   - ✅ No API keys needed in CI
   - ✅ Zero API costs during testing
   - ✅ Fast test execution (no network calls)
   - ✅ Contributor-friendly (works offline)
   
   # Run with specific options
   npx pnpm --filter @traceforge/cli start test run --parallel --concurrency 10
   
   # Watch mode for rapid development
   npx pnpm --filter @traceforge/cli start test run --watch
   
   # Generate JUnit XML for CI/CD
   npx pnpm --filter @traceforge/cli start test run --junit results.xml
   
   # Filter by tags
   npx pnpm --filter @traceforge/cli start test run --tag smoke integration
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
npx pnpm install

# Build all packages
npx pnpm build

# Run in development mode (with watch)
npx pnpm dev

# Type check
npx pnpm typecheck

# Lint
npx pnpm lint
```

## Development Commands

```bash
# Run all tests
npx pnpm test

# Watch mode
npx pnpm test --watch

# Build all packages
npx pnpm build
```

## VS Code Extension

Install the TraceForge.baseline extension for an integrated development experience:

- 📂 **TreeView panels** for traces and tests
- ▶️ **Run tests** directly from editor
- 🔄 **Auto-refresh** on file changes
- 💡 **YAML snippets** for test authoring
- 📝 **Test templates** for quick setup

## ⚠️ Storage Limitations & Production Considerations

**Current file-based storage is optimized for:**
- ✅ Development and testing environments
- ✅ Single-server deployments
- ✅ Up to 10,000 traces (approx 500MB)
- ✅ Teams of 1-10 developers

**For production use at scale, consider:**

### Storage Limits
- **No automatic rotation**: Directory grows indefinitely without manual cleanup
- **No indexing**: Listing traces becomes slow with >1000 files (O(n) complexity)
- **No concurrency control**: Race conditions possible with multiple proxy instances
- **Disk exhaustion risk**: No built-in monitoring or alerts

### Recommended Actions for Scale
1. **Monitor disk usage**: Set up alerts when `.ai-tests/traces/` exceeds 1GB
2. **Implement cleanup**: Use `find` command or cron job to remove old traces:
   ```bash
   # Delete traces older than 7 days
   find .ai-tests/traces/ -name "*.json" -mtime +7 -delete
   ```
3. **Configure retention**: Set `MAX_TRACES=10000` environment variable (coming soon)
4. **Watch metrics**: Monitor `/metrics` endpoint for storage failures

### Future Storage Backends (Roadmap)
- **SQLite** (planned): Better indexing, ACID guarantees, manageable file size
- **PostgreSQL** (future): Multi-tenant, horizontal scaling, full-text search
- **S3/Cloud Storage** (future): Unlimited retention, archival, cost-effective

### Current Safeguards
- ✅ **Circuit breaker**: Disables trace saving after 10 consecutive failures
- ✅ **Metrics endpoint**: `/metrics` exposes storage health statistics
- ✅ **Enhanced health checks**: `/health` monitors disk writability

See [docs/review.md](docs/review.md) for comprehensive architectural analysis.
- ➕ **Create tests** from traces with one click
- 🎨 **YAML snippets** for test authoring (type `tf-test`)
- 🔄 **Auto-refresh** traces and tests every 5 seconds
- 🚀 **Proxy management** - start/stop from status bar
- 📊 **Open dashboard** with one click

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

## Documentation

### User Guides

- [Getting Started](guides/getting-started.md) - Quick start guide
- [CLI Reference](guides/cli.md) - Complete command-line documentation
- [Assertions](guides/assertions.md) - Deep dive on all 8 assertion types
- [API Reference](guides/API.md) - REST API endpoints
- [VCR Usage](guides/VCR_USAGE.md) - Record/replay for deterministic testing
- [VCR Quick Reference](guides/VCR_QUICK_REFERENCE.md) - VCR mode cheat sheet
- [Environment Variables](guides/ENVIRONMENT_VARIABLES.md) - Configuration options

### Technical Reference

- [Architecture (Visual)](guides/architecture-visual.md) - System diagrams and data flow
- [VCR Implementation](guides/VCR_IMPLEMENTATION.md) - VCR internals and architecture
- [VCR Mode Design](guides/design/VCR_MODE_DESIGN.md) - Design decisions and patterns
- [Trace Format](guides/trace-format.md) - Trace file structure and schema
- [Baseline Format](guides/baseline-format.md) - Test and assertion format
- [Migrations](guides/migrations.md) - Schema versioning and migration guide

## Status

✅ **V2 Complete** - All 8 phases implemented!

- V1 MVP: Complete
- V2 Phase 1-8: Complete
- Multi-provider support ready
- VS Code extension available
- Security hardening complete
- OSS governance in place
