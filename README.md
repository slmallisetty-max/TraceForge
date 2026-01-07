# TraceForge

**Deterministic testing and CI enforcement for AI applications**

[![Status](https://img.shields.io/badge/status-v2.0-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## What is TraceForge?

TraceForge is a **testing and verification platform** for AI applications that makes LLM behavior changes explicit, auditable, and enforceable in CI/CD pipelines.

### The Problem

Traditional software testing breaks down with LLMs:

- ❌ Non-deterministic outputs make assertions impossible
- ❌ API costs explode in CI with repeated calls
- ❌ No way to prevent untested AI changes from reaching production
- ❌ Reviewing AI behavior changes is manual and error-prone

### The Solution

TraceForge introduces a **VCR-style record/replay system** with strict CI enforcement:

```bash
# Development: Record AI responses as test fixtures
TRACEFORGE_VCR_MODE=record npm start

# CI: Replay deterministically (no API calls, hard fail on changes)
TRACEFORGE_VCR_MODE=strict npm test  # ← Fails if AI output changed
```

**Result:** Every AI behavior change requires an explicit snapshot update and code review.

---

## Core Features

### 🎬 VCR Record/Replay

- **Record** LLM interactions as reusable test fixtures
- **Replay** deterministically in tests (zero API costs)
- **Strict mode** for CI: fail fast on missing/changed responses
- **Multi-provider**: OpenAI, Anthropic, Google Gemini, Ollama

### ✅ Smart Assertions (11 Types)

- **Semantic validation**: Test by meaning, not exact text match
- **Structural checks**: JSON schema, regex patterns, field presence
- **Content safety**: Detect contradictions, toxicity, PII leaks
- **Performance**: Latency, token usage, cost thresholds

### 🔒 CI/CD Enforcement

- **Hard fail** on unrecorded AI interactions in CI
- **Git-based workflow**: Commit snapshots, review diffs
- **No bypasses**: Can't disable checks or skip validation
- **Zero cloud dependencies**: Runs entirely locally

### 🔍 Developer Experience

- **Web UI**: Browse traces, compare diffs, debug failures
- **CLI**: Test runner, trace management, risk analysis
- **VS Code extension**: Run tests in editor, view traces inline
- **Risk scoring**: Auto-classify changes (cosmetic/semantic/critical)

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- An OpenAI API key (for semantic assertions - optional)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd traceforge
pnpm install

# Start all services
pnpm dev
```

**Services will be running at:**

- 🔵 Proxy Server: `http://localhost:8787`
- 🟢 Web UI: `http://localhost:5173`
- 🟣 API Server: `http://localhost:3001`

### Your First Test

**1. Point your app to TraceForge proxy:**

```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=sk-your-actual-key
```

**2. Record AI responses:**

```bash
# Run your app with recording enabled
TRACEFORGE_VCR_MODE=record node your-app.js

# Responses saved to .ai-tests/cassettes/
```

**3. Create a test file** (`.ai-tests/tests/example.yaml`):

```yaml
name: Summarization Test
model: gpt-4
messages:
  - role: user
    content: "Summarize: AI is transforming software development"

assertions:
  - type: contains
    expected: "AI"
    description: "Should mention AI"

  - type: max-length
    expected: 100
    description: "Summary should be concise"
```

**4. Run tests with replay:**

```bash
# Uses recorded responses (no API calls)
TRACEFORGE_VCR_MODE=replay pnpm --filter @traceforge/cli test run
```

**5. Enable CI enforcement:**

```yaml
# .github/workflows/ci.yml
name: AI Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build

      - name: Run AI tests (strict mode)
        run: TRACEFORGE_VCR_MODE=strict pnpm --filter @traceforge/cli test run
        # ☝️ Fails if snapshots missing or changed
```

---

## VCR Modes Explained

TraceForge operates in different modes for development vs. CI:

| Mode         | Behavior                              | Best For           |
| ------------ | ------------------------------------- | ------------------ |
| **`off`**    | Direct API calls, no recording        | Live debugging     |
| **`record`** | Call API and save responses           | Creating snapshots |
| **`replay`** | Use saved responses, error if missing | Local testing      |
| **`auto`**   | Replay if exists, record if missing   | Development        |
| **`strict`** | Replay only, hard fail on missing     | **CI/CD** ✨       |

### Strict Mode: The Enforcer

In `strict` mode, TraceForge becomes **unavoidable**:

```bash
TRACEFORGE_VCR_MODE=strict npm test
```

**Guarantees:**

- ✅ Zero live API calls (tests fail fast if attempted)
- ✅ Missing snapshot → immediate test failure
- ✅ Changed AI response → test failure with diff
- ✅ Forces explicit review of all AI behavior changes

**This prevents:**

- ❌ Untested AI changes reaching production
- ❌ Silent AI behavior drift
- ❌ Unclear "what changed?" in PRs

---

## Assertions: Testing AI Outputs

TraceForge supports **11 assertion types** for comprehensive validation:

### Basic Assertions

```yaml
assertions:
  # Exact match
  - type: equals
    expected: "Hello, world!"

  # Substring check
  - type: contains
    expected: "world"

  # Regex pattern
  - type: matches
    expected: "Hello, \\w+!"

  # JSON structure
  - type: json-schema
    expected:
      type: object
      required: [name, age]
      properties:
        name: { type: string }
        age: { type: number }
```

### Semantic Assertions

Test AI outputs by **meaning**, not exact wording:

```yaml
assertions:
  # Semantic similarity (uses embeddings)
  - type: semantic-similarity
    expected: "Paris is the capital of France"
    threshold: 0.85
    description: "Should convey Paris as capital"

  # Contradiction detection
  - type: semantic-contradiction
    forbidden:
      - "Paris is not in France"
      - "London is the capital of France"
    threshold: 0.70
    description: "Should not contradict facts"
```

**Requirements:** Set `OPENAI_API_KEY` environment variable. Embeddings are cached for CI determinism.

### Performance Assertions

```yaml
assertions:
  # Response time
  - type: max-latency-ms
    expected: 2000

  # Token efficiency
  - type: max-tokens
    expected: 500

  # Length constraints
  - type: max-length
    expected: 100
```

📖 **Complete guide**: [guides/assertions.md](guides/assertions.md)

---

## Multi-Provider Support

Use any LLM provider with the same interface:

```typescript
// OpenAI
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
});

// Anthropic Claude
const response = await openai.chat.completions.create({
  model: "claude-3-opus-20240229",
  messages: [{ role: "user", content: "Hello" }],
});

// Google Gemini
const response = await openai.chat.completions.create({
  model: "gemini-pro",
  messages: [{ role: "user", content: "Hello" }],
});

// Ollama (local, no API key)
const response = await openai.chat.completions.create({
  model: "llama2",
  messages: [{ role: "user", content: "Hello" }],
});
```

**Supported Providers:**

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 2.1
- **Google**: Gemini Pro, Gemini Pro Vision
- **Ollama**: Llama 2, Mistral, CodeLlama, Phi, and more

---

## CLI Commands

```bash
# Test management
traceforge test run                    # Run all tests
traceforge test run --watch            # Watch mode
traceforge test run --parallel         # Parallel execution
traceforge test run --junit out.xml    # JUnit report

# Trace management
traceforge trace list                  # List all traces
traceforge trace show <id>             # View trace details
traceforge trace compare <id1> <id2>   # Compare two traces
traceforge trace compare --with-risk   # Include risk analysis

# VCR cassette management
traceforge vcr list                    # List cassettes
traceforge vcr validate                # Validate cassette format
traceforge vcr clean --older-than 30d  # Remove old cassettes

# Risk analysis
traceforge ci check                    # Run CI risk checks
traceforge ci gate --threshold 7       # Fail if risk > 7

# Project setup
traceforge init                        # Initialize project
traceforge start                       # Start all services
```

📖 **Full reference**: [guides/cli.md](guides/cli.md)

---

## Architecture

TraceForge operates as a transparent proxy between your application and LLM providers:

```
┌─────────────────┐
│  Your App       │
└────────┬────────┘
         │ OPENAI_BASE_URL=localhost:8787
         ↓
┌─────────────────┐
│ TraceForge      │
│ Proxy Server    │  → Records requests/responses
└────────┬────────┘  → Enforces VCR mode
         │            → Applies policies
         ↓
┌─────────────────┐
│ LLM Provider    │
│ (OpenAI, etc)   │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│ .ai-tests/      │
│ ├─ cassettes/   │  (VCR recordings)
│ ├─ traces/      │  (Full execution logs)
│ └─ tests/       │  (Test definitions)
└─────────────────┘
```

### Components

| Component             | Purpose                               | Technology        |
| --------------------- | ------------------------------------- | ----------------- |
| **Proxy Server**      | Intercepts LLM calls, records/replays | Fastify (Node.js) |
| **CLI**               | Test runner, trace management         | Commander.js      |
| **Web UI**            | Browse traces, compare diffs          | React + Vite      |
| **API Server**        | REST API for trace operations         | Fastify           |
| **VS Code Extension** | Editor integration                    | VS Code API       |
| **Shared Package**    | Types, schemas, utilities             | TypeScript + Zod  |

--- ## Storage Backends

TraceForge supports two storage backends depending on your scale:

### File Storage (Default)

**Best for**: Small teams, getting started, <10K traces

✅ Zero configuration  
✅ Git-friendly JSON files  
✅ Easy to inspect and debug  
⚠️ Performance degrades beyond 1K traces

**Setup**: Enabled by default, no configuration needed.

### SQLite Storage (Production)

**Best for**: Production deployments, 10K+ traces, teams of 5+

✅ **100x faster** queries with indexing  
✅ Handles millions of traces  
✅ ACID transactions  
✅ Advanced SQL filtering  
✅ Concurrent reads

**Setup**:

```bash
# Enable SQLite backend
export TRACEFORGE_STORAGE_BACKEND=sqlite
export TRACEFORGE_SQLITE_PATH=.ai-tests/traces.db

# Restart proxy
pnpm --filter @traceforge/proxy start
```

### Comparison

| Feature          | File Storage | SQLite                 |
| ---------------- | ------------ | ---------------------- |
| Setup            | None         | Build tools required   |
| Max traces       | ~10,000      | 1,000,000+             |
| Query speed      | O(n)         | O(log n) - 100x faster |
| Filtering        | Client-side  | SQL queries            |
| Git friendly     | ✅ Yes       | ❌ Binary              |
| Production ready | Small scale  | ✅ Yes                 |

**Migration path**: Start with file storage, migrate to SQLite when you exceed 5K traces.

---

## Risk Scoring

TraceForge automatically analyzes AI response changes and assigns risk scores:

```bash
# Compare traces with risk analysis
traceforge trace compare <baseline-id> <current-id> --with-risk
```

**Risk Levels**:

- **Low (1-3)**: Cosmetic changes (formatting, punctuation)
- **Medium (4-7)**: Semantic changes (meaning, tone shifts)
- **High (8-10)**: Critical changes (safety, compliance, factual errors)

**Analysis Factors**:

- Semantic similarity (embedding-based)
- Word overlap (Jaccard index)
- Length deltas
- Format changes (JSON, lists, code blocks)
- Performance impact (latency, tokens)

**Use in CI**:

```yaml
# Fail builds on high-risk changes
- name: Check AI Changes
  run: traceforge ci gate --max-risk 7
```

📖 **Full guide**: [guides/CI_CD_RISK_GUARDRAILS.md](guides/CI_CD_RISK_GUARDRAILS.md)

---

## Examples & Guides

### Examples

- **[Strict CI Starter](examples/strict-ci-starter/)** ⭐ - Production-ready CI enforcement example
- **[Demo App](examples/demo-app/)** - Basic usage walkthrough

### User Guides

- [Getting Started](guides/getting-started.md) - Installation and setup
- [VCR Quick Reference](guides/VCR_QUICK_REFERENCE.md) - Mode cheat sheet
- [Assertions Guide](guides/assertions.md) - All assertion types
- [CLI Reference](guides/cli.md) - Complete command documentation
- [Semantic Assertions](guides/SEMANTIC_ASSERTIONS_QUICK_START.md) - Meaning-based testing
- [CI/CD Integration](guides/CI_ENFORCEMENT.md) - Pipeline setup patterns
- [Environment Variables](guides/ENVIRONMENT_VARIABLES.md) - Configuration options

### Technical Documentation

- [API Reference](guides/API.md) - REST API endpoints
- [Trace Format](guides/trace-format.md) - Trace file structure
- [Baseline Format](guides/baseline-format.md) - Test file format
- [VCR Design](guides/design/VCR_MODE_DESIGN.md) - Implementation details
- [Architecture Review](docs/architecture-review.md) - System design

---

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
traceforge/
├── packages/
│   ├── shared/          # Types, schemas, utilities
│   ├── proxy/           # Proxy server (Fastify)
│   ├── cli/             # CLI tool (Commander)
│   ├── web/             # Web UI (React + Fastify)
│   └── vscode-extension/ # VS Code extension
├── examples/
│   ├── strict-ci-starter/ # Production CI example
│   └── demo-app/         # Basic demo
├── guides/              # User documentation
└── docs/                # Technical specs
```

### Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## VS Code Extension

Install from VS Code marketplace or build from source:

**Features**:

- 📂 Browse traces and tests in sidebar
- ▶️ Run tests from editor
- 🔄 Auto-refresh on changes
- 💡 YAML snippets (type `tf-test`)
- 🚀 Start/stop proxy from status bar

---

## Configuration

Create `.traceforgerc.json` in your project root:

```json
{
  "vcr": {
    "mode": "auto",
    "cassette_dir": ".ai-tests/cassettes",
    "match_on": ["method", "uri", "body"]
  },
  "storage": {
    "backend": "file",
    "traces_dir": ".ai-tests/traces"
  },
  "policies": {
    "max_latency_ms": 5000,
    "max_tokens": 4000,
    "block_patterns": ["password", "api_key"]
  }
}
```

📖 **Full reference**: [guides/ENVIRONMENT_VARIABLES.md](guides/ENVIRONMENT_VARIABLES.md)

---

## FAQ

**Q: Does TraceForge work with my language/framework?**  
A: Yes! TraceForge is a proxy server. Any language that can make HTTP requests to OpenAI-compatible APIs works (Python, JavaScript, Ruby, Go, etc.).

**Q: Do I need to change my code?**  
A: Only one line: set `OPENAI_BASE_URL=http://localhost:8787/v1`. No SDK changes needed.

**Q: What about API costs?**  
A: In `strict` mode (CI), zero API calls are made. In development, use `replay` or `auto` mode to reuse recordings.

**Q: How do I handle non-deterministic tests?**  
A: Use semantic assertions instead of exact matching. TraceForge validates by meaning, not exact text.

**Q: Can I use this in production?**  
A: The proxy is designed for development/testing. For production observability, consider dedicated LLM monitoring tools.

**Q: How do I migrate from file to SQLite storage?**  
A: Export traces to JSON, enable SQLite backend, import traces. See [guides/migrations.md](guides/migrations.md).

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Project Status

**Current Version: v2.0** ✅

- ✅ Core VCR record/replay functionality
- ✅ Multi-provider support (OpenAI, Anthropic, Google, Ollama)
- ✅ 11 assertion types including semantic validation
- ✅ Risk scoring and CI enforcement
- ✅ SQLite storage backend
- ✅ Web UI and VS Code extension
- ✅ Production-ready with circuit breakers and monitoring

**Roadmap**:

- 🔄 PostgreSQL backend for multi-tenant deployments
- 🔄 Cloud storage adapters (S3, GCS)
- 🔄 Advanced diff algorithms for structured outputs
- 🔄 LangChain/LlamaIndex integration examples

---

## Support

- 📖 [Documentation](guides/README.md)
- 🐛 [Issue Tracker](https://github.com/your-org/traceforge/issues)
- 💬 [Discussions](https://github.com/your-org/traceforge/discussions)
