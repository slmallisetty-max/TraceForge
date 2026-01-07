# TraceForge

**System of record for AI behavior with enforcement, policy, and auditability**

[![Status](https://img.shields.io/badge/status-v2.0-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## What is TraceForge?

TraceForge is the **system of record for AI behavior changes**. It establishes authoritative control over when and how AI outputs can change in your applications by enforcing determinism, policy compliance, and auditability across the entire development lifecycle.

When TraceForge is installed, it becomes the **authoritative gate** for AI behavior changes—no AI output modification reaches production without an explicit, recorded, and reviewable snapshot.

## What Changes When TraceForge Is Enabled

Installing TraceForge fundamentally changes how AI behavior evolves in your system:

- ✅ **AI behavior cannot change without a recorded snapshot** — Every response is captured and versioned
- ✅ **CI pipelines become authoritative gates** — No AI output changes bypass review
- ✅ **Every response has a historical lineage** — Full audit trail from first deployment
- ✅ **Rollbacks are possible without re-running models** — Instant reversion to any previous state
- ✅ **Auditors can inspect AI decisions post-hoc** — Complete forensic capability
- ✅ **Policy violations are non-bypassable** — Automated enforcement at the infrastructure level

These aren't features you can opt into—they're infrastructure-level guarantees once TraceForge is deployed in strict mode.

### The Problem

Traditional software governance breaks down with LLMs:

- ❌ Non-deterministic outputs make assertions impossible
- ❌ API costs explode in CI with repeated calls
- ❌ No way to prevent untested AI changes from reaching production
- ❌ AI behavior changes bypass code review and audit trails

### The Solution

TraceForge establishes a **control plane for AI behavior** with VCR-style record/replay and strict enforcement:

```bash
# Development: Record AI responses as versioned snapshots
TRACEFORGE_VCR_MODE=record npm start

# CI: Enforce determinism (no API calls, hard fail on changes)
TRACEFORGE_VCR_MODE=strict npm test  # ← Fails if AI output changed
```

**Result:** TraceForge becomes the authoritative source of truth—every AI behavior change requires an explicit snapshot update and code review.

---

## Core Features

### 🎬 VCR Record/Replay

- **Record** LLM interactions as versioned snapshots of record
- **Replay** deterministically in tests (zero API costs)
- **Strict mode** for CI: establishes TraceForge as the final authority on AI changes
- **Multi-provider**: OpenAI, Anthropic, Google Gemini, Ollama

### ✅ Smart Assertions (11 Types)

- **Semantic validation**: Enforce meaning, not exact text match
- **Structural checks**: JSON schema, regex patterns, field presence
- **Content safety**: Detect contradictions, toxicity, PII leaks
- **Performance**: Latency, token usage, cost thresholds

### 🔒 CI/CD Enforcement

- **Hard fail** on unrecorded AI interactions in CI
- **Git-based workflow**: Commit snapshots, review diffs
- **Non-bypassable**: Cannot disable checks or skip validation
- **Zero cloud dependencies**: Runs entirely locally

### 🔍 Developer Experience

- **Web UI**: Browse traces, compare diffs, debug failures
- **CLI**: Test runner, trace management, risk analysis
- **VS Code extension**: Run tests in editor, view traces inline
- **Risk scoring**: Auto-classify changes as decision signals for deployment gates

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
        # ☝️ TraceForge establishes the gate: fail if snapshots missing or changed
```

---

## Strict Mode: The Authority on AI Behavior

In `strict` mode, TraceForge establishes itself as **the final authority** on AI behavior changes—removing human judgment from whether changes are acceptable.

```bash
TRACEFORGE_VCR_MODE=strict npm test
```

**This is version control for AI behavior:** Just as Git requires explicit commits for code changes, strict mode requires explicit snapshot approval for AI output changes.

**Guarantees:**

- ✅ Zero live API calls (tests fail fast if attempted)
- ✅ Missing snapshot → immediate test failure
- ✅ Changed AI response → test failure with diff
- ✅ **Every AI behavior change requires explicit approval**
- ✅ Non-bypassable enforcement at the infrastructure level

**What this prevents:**

- ❌ Untested AI changes reaching production
- ❌ Silent AI behavior drift
- ❌ Unclear "what changed?" in PRs
- ❌ Individual developers shipping unapproved AI modifications

Strict mode transforms TraceForge from an optional tool into **required infrastructure**—the authoritative gate through which all AI behavior changes must pass.

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

---

## Assertions: Enforcing AI Outputs

TraceForge supports **11 assertion types** for comprehensive validation and policy enforcement:

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

Enforce AI outputs by **meaning**, not exact wording:

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

TraceForge operates as a control plane between your application and LLM providers, establishing authoritative governance over all AI interactions:

```
┌─────────────────┐
│  Your App       │
└────────┬────────┘
         │ OPENAI_BASE_URL=localhost:8787
         ↓
┌─────────────────┐
│ TraceForge      │
│ Control Plane   │  → Records requests/responses as system of record
└────────┬────────┘  → Enforces VCR mode and policies
         │            → Applies non-bypassable governance
         ↓
┌─────────────────┐
│ LLM Provider    │
│ (OpenAI, etc)   │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│ .ai-tests/      │
│ ├─ cassettes/   │  (VCR recordings - system of record)
│ ├─ traces/      │  (Full execution logs - audit trail)
│ └─ tests/       │  (Test definitions - policy enforcement)
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

## Risk Scoring: The Decision Engine

TraceForge doesn't just measure changes—it **decides whether AI changes are approved for deployment**. Risk scoring is the decision engine that determines if deployments proceed or halt.

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

**Automated Enforcement in CI**:

```yaml
# Block deployments on high-risk changes
- name: Check AI Changes
  run: traceforge ci gate --max-risk 7
  # ☝️ TraceForge decides: deploy or halt
```

Risk scoring connects directly to **policy enforcement**—it's not a metric to review, it's a gate that blocks or allows changes automatically.

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

## Policy Enforcement

TraceForge enforces policies as code—defining what AI is **allowed** to say and automatically blocking violations in CI.

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
    "block_patterns": ["password", "api_key", "ssn"],
    "risk_threshold": "medium"
  }
}
```

**Policy Characteristics:**

- ✅ **Policies define what AI is allowed to say** — Not suggestions, but rules
- ✅ **Violations are non-bypassable** — Enforced automatically in CI
- ✅ **Applied consistently** — No human judgment required
- ✅ **Version controlled** — Policy changes go through code review

Policies are a **first-class governance concept**, not configuration options. They establish boundaries that AI behavior cannot cross.

📖 **Full reference**: [guides/ENVIRONMENT_VARIABLES.md](guides/ENVIRONMENT_VARIABLES.md)

---

## FAQ

**Q: Does TraceForge work with my language/framework?**  
A: Yes! TraceForge is infrastructure. Any language that can make HTTP requests to OpenAI-compatible APIs works (Python, JavaScript, Ruby, Go, etc.).

**Q: Do I need to change my code?**  
A: Only one line: set `OPENAI_BASE_URL=http://localhost:8787/v1`. No SDK changes required.

**Q: What about API costs?**  
A: In `strict` mode (CI), zero API calls are made. In development, use `replay` or `auto` mode to reuse recordings.

**Q: How do I handle non-deterministic tests?**  
A: Use semantic assertions instead of exact matching. TraceForge enforces by meaning, not exact text.

**Q: Can I use this in production?**  
A: TraceForge is designed for development and CI environments to control AI behavior changes. For production monitoring, it works alongside dedicated LLM monitoring tools, with production features being developed.

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
