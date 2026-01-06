# TraceForge

> **Deterministic record, replay, and verification for AI systems**

[![Status](https://img.shields.io/badge/status-V2%20Complete-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()

## Overview

TraceForge is an execution recording and replay layer that makes AI behavior changes **explicit and unavoidable** in your development workflow. It guarantees that no AI behavior reaches production without recorded execution snapshots and verified replay.

### Core Guarantee

> "No AI behavior change reaches production without a recorded execution and verified replay."

**How it works:**

1. **Record** - Capture every AI execution with full request/response context
2. **Replay** - Run tests deterministically using recorded snapshots (no live API calls)
3. **Verify** - Assert on AI outputs with 11 assertion types including semantic validation
4. **Enforce** - CI/CD fails on missing or changed executions until explicitly approved

### Key Features

- 🎬 **VCR Mode** - Record/replay execution snapshots with strict CI enforcement
- ✅ **Smart Assertions** - 11 assertion types including semantic similarity and contradiction detection
- 🔍 **Execution Inspector** - Web UI for browsing, comparing, and debugging executions
- 🚫 **CI Enforcement** - Hard fail on unverified behavior changes (no bypass)
- 🤖 **Multi-Provider** - OpenAI, Anthropic, Google Gemini, Ollama
- 🔒 **Local-First** - Zero cloud dependencies, file-based storage
- 📊 **Risk Scoring** - Automatic risk classification for AI response changes

### Why TraceForge?

AI systems are inherently non-deterministic. TraceForge makes them:

- ✅ **Reproducible** - Replay any execution offline without API calls
- ✅ **Verifiable** - Assert on AI outputs using semantic and structural validation
- ✅ **Auditable** - Full execution history with side-by-side diffs
- ✅ **Cost-Effective** - No API costs in CI, fast test execution

## Architecture

TraceForge operates as a transparent proxy layer between your application and AI providers:

```
Your Application
      ↓
TraceForge Proxy (port 8787)
      ↓
AI Provider (OpenAI/Anthropic/Google/Ollama)
      ↓
Execution Record (.ai-tests/cassettes/)
      ↓
Replay Engine (CI/CD)
      ↓
Verification Rules
```

### Components

| Component | Port | Purpose |
|-----------|------|---------|
| **Proxy Server** | 8787 | Intercepts AI calls, records/replays executions |
| **Web UI** | 5173 | Browse execution history, compare diffs |
| **API Server** | 3001 | REST API for trace management |
| **CLI** | - | Test runner, validation, VCR management |
| **VS Code Extension** | - | Editor integration for tests and traces |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
npx pnpm install

# Start all services (proxy + API + UI)
npx pnpm dev
```

**Services running:**
- 🔵 Proxy: http://localhost:8787
- 🟣 API: http://localhost:3001  
- 🟢 UI: http://localhost:5173

**Alternative: Docker**

```bash
docker-compose up
```

### Basic Usage

**1. Configure your application to use the proxy:**

```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=your-actual-api-key
```

**2. Record execution snapshots:**

```bash
TRACEFORGE_VCR_MODE=record npm start
# Snapshots saved to .ai-tests/cassettes/
```

**3. Replay from snapshots (no API calls):**

```bash
TRACEFORGE_VCR_MODE=replay npm test
```

**4. Commit snapshots to version control:**

```bash
git add .ai-tests/cassettes/
git commit -m "Add execution snapshots for feature X"
```

### VCR Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `off` | Direct API calls, no recording | Live development |
| `record` | Record all executions | Creating/updating snapshots |
| `replay` | Replay from snapshots, error on miss | Local testing |
| `auto` | Replay if exists, record if missing | Flexible development |
| **`strict`** | **Replay only, hard fail on miss** | **CI/CD enforcement** |

## CI/CD Enforcement

**This is what makes TraceForge unavoidable:**

```yaml
# .github/workflows/ci.yml
env:
  TRACEFORGE_VCR_MODE: strict  # ← Hard fail on missing snapshots

steps:
  - name: Verify AI Executions
    run: npx pnpm --filter @traceforge/cli start test run
```

**Strict mode guarantees:**

- ✅ Live AI calls are **forbidden** in CI
- ✅ Missing execution snapshot = **build failure**
- ✅ Changed AI output = **explicit diff** (requires approval)
- ✅ No bypass, no warnings, no "best effort"

**This enforces:**

1. Every AI behavior change requires a recorded snapshot
2. Reviewers see exact diffs of AI output changes
3. No untested AI behavior reaches production

## Complete Example

Check out [`examples/strict-ci-starter/`](examples/strict-ci-starter/) for a production-ready example with:

- ✅ Real AI application (OpenAI summarization)
- ✅ Test files with behavior validation
- ✅ GitHub Actions workflow with strict mode
- ✅ Complete failure scenario documentation

**Quick start:**

```bash
cd examples/strict-ci-starter
npm install
npm run setup  # Validates environment
npm test       # Runs with committed snapshots
```

📖 **Full Guide**: [examples/strict-ci-starter/README.md](examples/strict-ci-starter/README.md)

## Advanced Features

### Semantic Assertions

Test AI behavior by **meaning**, not just exact text matching. Uses OpenAI embeddings to validate semantic similarity.

```yaml
assertions:
  # Validate semantic similarity
  - type: semantic
    expected: "Paris is the capital of France"
    threshold: 0.85
    description: "Response should convey Paris as France's capital"

  # Detect contradictions
  - type: semantic-contradiction
    forbidden:
      - "Paris is not in France"
      - "France has no capital"
    threshold: 0.70
    description: "Should not contradict basic facts"
```

**Requirements:**
- Set `OPENAI_API_KEY` environment variable
- Embeddings are cached for deterministic CI runs

📖 **Guide**: [guides/SEMANTIC_ASSERTIONS_QUICK_START.md](guides/SEMANTIC_ASSERTIONS_QUICK_START.md)

### Risk Scoring

Automatic risk classification for AI response changes with actionable recommendations:

```bash
# Compare two traces with risk analysis
npx pnpm --filter @traceforge/cli start trace compare <trace-id-1> <trace-id-2> --with-risk
```

**Risk Categories:**
- **Cosmetic** (1-3): Minor formatting/style changes
- **Semantic** (4-7): Meaning or tone changes requiring review
- **Safety** (8-10): Security, compliance, or critical changes requiring approval

**Analysis factors:**
- Semantic similarity (embeddings)
- Word overlap (Jaccard similarity)
- Length changes
- Tone shifts
- Format changes (JSON, code blocks, lists)
- Performance deltas (latency, tokens)

📖 **Guide**: [guides/RISK_SCORING_GUIDE.md](guides/RISK_SCORING_GUIDE.md)

### CLI Test Runner

Advanced test execution with flexible options:

```bash
# Run all tests
npx pnpm --filter @traceforge/cli start test run

# Parallel execution
npx pnpm --filter @traceforge/cli start test run --parallel --concurrency 10

# Watch mode for development
npx pnpm --filter @traceforge/cli start test run --watch

# Generate JUnit XML for CI
npx pnpm --filter @traceforge/cli start test run --junit results.xml

# Filter by tags
npx pnpm --filter @traceforge/cli start test run --tag smoke integration
```

### Multi-Provider Support

TraceForge supports multiple AI providers with automatic routing:

```python
# OpenAI
response = openai.ChatCompletion.create(
    model="gpt-4-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Claude (Anthropic)
response = openai.ChatCompletion.create(
    model="claude-3-opus-20240229",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Gemini (Google)
response = openai.ChatCompletion.create(
    model="gemini-pro",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Ollama (local, no API key needed)
response = openai.ChatCompletion.create(
    model="llama2",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Supported Providers:**
- **OpenAI**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 2.1
- **Google**: Gemini Pro, Gemini Pro Vision
- **Ollama**: Llama 2, Mistral, CodeLlama, Phi (local)

### VS Code Extension

Integrated development experience:

- 📂 TreeView panels for traces and tests
- ▶️ Run tests directly from editor
- 🔄 Auto-refresh on file changes
- 💡 YAML snippets for test authoring (type `tf-test`)
- 📝 Test templates for quick setup
- 🚀 Proxy management from status bar
- 📊 Open dashboard with one click

## Development

### Setup

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

# Run all tests
npx pnpm test
```

### Project Structure

```
traceforge/
├── packages/
│   ├── shared/              # Shared TypeScript types & Zod schemas
│   ├── proxy/               # LLM proxy server (Fastify)
│   ├── cli/                 # Command-line tool (Commander.js)
│   ├── web/                 # Web UI (Fastify API + React)
│   └── vscode-extension/    # VS Code extension
├── examples/
│   ├── strict-ci-starter/   # ⭐ Production CI enforcement example
│   ├── demo-app/            # Demo application
│   └── python-demo/         # Python integration example
├── docs/                    # Technical documentation
├── guides/                  # User guides
└── package.json             # Workspace root
```

### Performance Benchmarks

```bash
# Run embedding performance benchmarks
node packages/proxy/benchmarks/embeddings.js
```

## Storage Considerations

### Current Limitations

**File-based storage is optimized for:**
- ✅ Development and testing environments
- ✅ Single-server deployments
- ✅ Up to 10,000 traces (~500MB)
- ✅ Teams of 1-10 developers

**Known limits:**
- No automatic rotation (directory grows indefinitely)
- No indexing (listing slows with >1000 files)
- No concurrency control (race conditions with multiple proxies)
- No built-in disk exhaustion monitoring

### Recommended Actions for Scale

1. **Monitor disk usage**: Alert when `.ai-tests/traces/` exceeds 1GB
2. **Implement cleanup**: Remove old traces periodically
   ```bash
   find .ai-tests/traces/ -name "*.json" -mtime +7 -delete
   ```
3. **Configure retention**: Set `MAX_TRACES=10000` (coming soon)
4. **Watch metrics**: Monitor `/metrics` endpoint

### Safeguards

- ✅ Circuit breaker (disables after 10 consecutive failures)
- ✅ `/metrics` endpoint for storage health
- ✅ `/health` endpoint monitors disk writability

### Future Storage Backends (Roadmap)

- **SQLite** (planned): Better indexing, ACID guarantees
- **PostgreSQL** (future): Multi-tenant, horizontal scaling
- **S3/Cloud** (future): Unlimited retention, archival

See [docs/architecture-review.md](docs/architecture-review.md) for detailed analysis.

## Documentation

### Getting Started
- [Quick Start Guide](guides/getting-started.md) - Installation and first steps
- [VCR Quick Reference](guides/VCR_QUICK_REFERENCE.md) - VCR mode cheat sheet
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - One-page reference card

### User Guides
- [CLI Reference](guides/cli.md) - Complete command-line documentation
- [Assertions Guide](guides/assertions.md) - All 11 assertion types explained
- [VCR Usage Guide](guides/VCR_USAGE.md) - Record/replay in-depth
- [Semantic Assertions](guides/SEMANTIC_ASSERTIONS_QUICK_START.md) - Meaning-based validation
- [Risk Scoring](guides/RISK_SCORING_GUIDE.md) - Automated risk classification
- [CI/CD Enforcement](guides/CI_GATING_GUIDE.md) - CI integration patterns
- [Environment Variables](guides/ENVIRONMENT_VARIABLES.md) - Configuration reference

### Technical Reference
- [Architecture Overview](guides/architecture-visual.md) - System diagrams and data flow
- [VCR Implementation](guides/VCR_IMPLEMENTATION.md) - VCR internals
- [VCR Mode Design](guides/design/VCR_MODE_DESIGN.md) - Design decisions
- [Trace Format](guides/trace-format.md) - Trace file structure
- [Baseline Format](guides/baseline-format.md) - Test file format
- [API Reference](guides/API.md) - REST API endpoints
- [Migrations](guides/migrations.md) - Schema versioning

### Examples
- [Strict CI Starter](examples/strict-ci-starter/) - ⭐ Production-ready CI enforcement
- [Demo App](examples/demo-app/) - Basic usage example
- [Python Demo](examples/python-demo/) - Python integration

## Project Status

✅ **V2 Complete**

- ✅ V1 MVP: Core functionality
- ✅ V2 Phase 1-8: Advanced features
- ✅ Multi-provider support (OpenAI, Anthropic, Google, Ollama)
- ✅ VS Code extension
- ✅ Semantic assertions & risk scoring
- ✅ Security hardening
- ✅ OSS governance

