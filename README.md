# TraceForge.baseline

> **TraceForge records, replays, and verifies AI executions deterministically.**

[![Status](https://img.shields.io/badge/status-V2%20Complete-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()

## What is TraceForge?

**TraceForge is the execution record & replay layer for AI systems.**

It guarantees that no AI behavior change reaches production without a recorded execution and verified replay.

### Core Guarantee

- **Record** every AI execution with full context
- **Replay** executions deterministically without live API calls
- **Verify** behavior changes explicitly in CI/CD
- **Enforce** reproducibility at build time

### Why This Matters

AI systems are non-deterministic by default. TraceForge makes them:

- ✅ **Reproducible** - Replay any execution offline
- ✅ **Verifiable** - Assert on AI outputs with 11 assertion types
- ✅ **Auditable** - Full execution history with diffs
- ✅ **Enforceable** - CI fails on missing/changed executions

### Key Capabilities

- 🎬 **Execution Snapshots (VCR)** - Record/replay with strict CI mode
- 🔍 **Execution Inspector** - Web UI for browsing and comparing executions
- ✅ **Verification Rules** - 11 assertion types including semantic validation
- 🚫 **CI Enforcement** - Hard fail on unverified behavior changes
- 🤖 **Multi-Provider** - OpenAI, Anthropic, Google, Ollama
- 🔒 **Local-First** - Zero cloud dependencies, all data on disk

## Architecture

**TraceForge operates as an execution layer between your application and AI providers:**

```
Your App → TraceForge Proxy → AI Provider (OpenAI/Anthropic/Google/Ollama)
              ↓
         Execution Record
              ↓
         Replay Engine (CI)
              ↓
         Verification Rules
```

### Components

- **Replay Engine** (port 8787) - Intercepts AI calls, records executions, enforces replay in CI
- **Execution Inspector** (port 5173) - Web UI for browsing execution history and diffs
- **Enforcement CLI** - Validates executions against verification rules, exits non-zero on violations
- **VS Code Extension** - Manage execution snapshots and verification rules from your editor

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

### Local Development Workflow

1. **Intercept AI executions:**

   ```bash
   export OPENAI_BASE_URL=http://localhost:8787/v1
   export OPENAI_API_KEY=your-key
   ```

2. **Record execution snapshots:**

   ```bash
   # Run your application with recording enabled
   TRACEFORGE_VCR_MODE=record npm start
   ```

   All AI executions are saved to `.ai-tests/cassettes/`

3. **Create verification rules:**

   ```bash
   # Create test from recorded execution
   npx pnpm --filter @traceforge/cli start test create-from-trace <trace-id>
   ```

4. **Commit snapshots to version control:**
   ```bash
   git add .ai-tests/
   git commit -m "Add execution snapshots for feature X"
   ```

### CI/CD Enforcement (The Critical Part)

**This is what makes TraceForge unavoidable:**

```yaml
# .github/workflows/ci.yml
env:
  TRACEFORGE_VCR_MODE: strict # ← Hard fail on missing snapshots

steps:
  - name: Verify AI Executions
    run: npx pnpm --filter @traceforge/cli start test run
```

**Strict mode guarantees:**

- ✅ Live AI calls are **forbidden** in CI
- ✅ Missing execution snapshot = **build failure**
- ✅ Changed AI output = **explicit diff** (requires approval)
- ✅ No bypass, no warnings, no "best effort"

This forces:

1. Snapshot commitment before merge
2. Reproducible AI behavior
3. Reviewer approval for behavior changes

### Inspection & Debugging (Optional)

The Web UI is for **inspection**, not the primary workflow:

- Browse execution history: http://localhost:5173
- Compare executions: Side-by-side diffs
- Review failed verifications: See what changed

### VCR Modes

| Mode         | Behavior                                     | Use Case              |
| ------------ | -------------------------------------------- | --------------------- |
| `off`        | No recording/replay                          | Local development     |
| `record`     | Record all executions                        | Creating snapshots    |
| `replay`     | Replay from snapshots, error on miss         | Local verification    |
| `auto`       | Replay if exists, else record                | Flexible development  |
| **`strict`** | **Replay only, forbid recording, hard fail** | **CI/CD enforcement** |

**Strict mode usage:**

```bash
# CI environment
export TRACEFORGE_VCR_MODE=strict
npm test  # Fails if ANY snapshot is missing or changed
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

# Integration testing (requires OPENAI_API_KEY)
node test-semantic-integration.js

# Performance benchmarks
node benchmark-embeddings.js
```

## 🆕 Semantic Assertions (2026 Q1)

Test AI behavior by **meaning**, not just exact text! Uses OpenAI embeddings to understand if responses convey the same idea.

```yaml
assertions:
  # Check if response conveys the same meaning
  - type: semantic
    expected: "Paris is the capital of France"
    threshold: 0.85
    description: "Should indicate Paris is France's capital"

  # Detect contradictions
  - type: semantic-contradiction
    forbidden:
      - "Paris is not in France"
      - "France has no capital"
    threshold: 0.70
    description: "Should not contradict basic facts"
```

**Quick Start:**

- Set `OPENAI_API_KEY` environment variable
- Use `semantic` for meaning-based matching
- Use `semantic-contradiction` to catch forbidden statements
- Embeddings are cached for deterministic CI runs

📖 **Full Guide**: [guides/SEMANTIC_ASSERTIONS_QUICK_START.md](guides/SEMANTIC_ASSERTIONS_QUICK_START.md)

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
