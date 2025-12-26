# TraceForge Documentation

Welcome to the TraceForge documentation! This guide will help you find what you need.

---

## 🚀 Getting Started

New to TraceForge? Start here:

1. **[Getting Started](./getting-started.md)** - Installation and first steps
2. **[CLI Reference](./cli.md)** - Complete command-line guide
3. **[Environment Variables](./ENVIRONMENT_VARIABLES.md)** - Configuration options

---

## 📚 User Guides

### Core Concepts

- **[Assertions](./assertions.md)** - Deep dive on all 8 assertion types
  - Exact match, contains, regex, semantic, JSON schema, JSON subset, latency, no-refusal
  - Weights and scoring
  - Best practices

- **[Baseline Format](./baseline-format.md)** - Test file structure
  - YAML test definitions
  - Assertion syntax
  - Fixtures and variables

- **[Trace Format](./trace-format.md)** - Trace file structure
  - JSON schema
  - Provider-specific fields
  - Streaming traces

### Advanced Features

- **[VCR Usage](./VCR_USAGE.md)** - Record/replay for deterministic testing
  - Recording cassettes
  - Replay mode
  - Auto mode (smart fallback)
  - Match strategies (exact, fuzzy)

- **[VCR Quick Reference](./VCR_QUICK_REFERENCE.md)** - VCR mode cheat sheet
  - Environment variables
  - Common workflows
  - Troubleshooting

- **[Migrations](./migrations.md)** - Schema versioning
  - Version format (MAJOR.MINOR.PATCH)
  - Automatic migration
  - Writing custom migrations

---

## 🔧 Technical Reference

### Architecture

- **[Architecture Visual](./architecture-visual.md)** - System diagrams
  - Component overview
  - Data flow
  - Multi-provider routing

- **[VCR Implementation](./VCR_IMPLEMENTATION.md)** - VCR internals
  - Signature generation
  - Cassette storage
  - Match algorithms

- **[VCR Mode Design](./design/VCR_MODE_DESIGN.md)** - Design decisions
  - Architecture patterns
  - Tradeoffs
  - Future roadmap

### API Reference

- **[API Reference](./API.md)** - REST APIs
  - **Proxy Server API** (port 8787)
    - `/health` - Health check
    - `/metrics` - Operational metrics
    - `/v1/chat/completions` - OpenAI chat
    - `/v1/completions` - OpenAI completions
    - `/v1/embeddings` - OpenAI embeddings
    - `/v1/messages` - Anthropic messages
    - `/v1beta/models/{model}:generateContent` - Gemini
    - `/api/chat` - Ollama
  - **Web Server API** (port 5173)
    - `/api/traces` - List/get/delete traces
    - `/api/tests` - List/get/run tests
    - `/api/config` - Configuration management

---

## 🎯 Quick Reference

### Common Tasks

#### Running Tests

```bash
# Run all tests
npx pnpm --filter @traceforge/cli start test run

# Run with VCR replay (no API calls)
TRACEFORGE_VCR_MODE=replay npx pnpm --filter @traceforge/cli start test run

# Watch mode
npx pnpm --filter @traceforge/cli start test run --watch

# Generate JUnit XML
npx pnpm --filter @traceforge/cli start test run --junit results.xml
```

#### Managing Traces

```bash
# List all traces
npx pnpm --filter @traceforge/cli start trace list

# View specific trace
npx pnpm --filter @traceforge/cli start trace view <trace-id>

# Create test from trace
npx pnpm --filter @traceforge/cli start test create-from-trace <trace-id>
```

#### VCR Mode

```bash
# Check status
npx pnpm --filter @traceforge/cli start vcr status

# Record cassettes
TRACEFORGE_VCR_MODE=record npx pnpm --filter @traceforge/cli start test run

# Replay from cassettes
TRACEFORGE_VCR_MODE=replay npx pnpm --filter @traceforge/cli start test run

# Clean cassettes
npx pnpm --filter @traceforge/cli start vcr clean --yes
```

---

## 📖 By Use Case

### I want to...

**...debug LLM API calls**
1. Start proxy: `npx pnpm dev`
2. Configure app to use proxy: `export OPENAI_BASE_URL=http://localhost:8787/v1`
3. Run your app
4. View traces: http://localhost:5173

**...create tests from production traffic**
1. Capture traces (see above)
2. Create test: Click "Save as Test" in web UI
3. Run test: `npx pnpm --filter @traceforge/cli start test run`

**...run tests without API calls**
1. Record cassettes: `TRACEFORGE_VCR_MODE=record npx pnpm --filter @traceforge/cli start test run`
2. Replay: `TRACEFORGE_VCR_MODE=replay npx pnpm --filter @traceforge/cli start test run`

**...compare two responses**
1. Open web UI: http://localhost:5173
2. Select two traces
3. Click "Compare" button

**...validate JSON responses**
- Use `json-schema` assertion (strict validation)
- Or `json-subset` assertion (flexible validation)
- See [Assertions](./assertions.md) for details

**...check response performance**
- Use `latency` assertion with threshold
- Monitor `/metrics` endpoint for statistics
- See [API Reference](./API.md) for metrics format

**...test paraphrased responses**
- Use `semantic` assertion with threshold
- Adjust threshold for strictness (0.6-0.95)
- See [Assertions](./assertions.md) for guidelines

---

## 🔍 Search by Topic

### Testing
- [Assertions](./assertions.md) - All assertion types
- [Baseline Format](./baseline-format.md) - Test file structure
- [CLI Reference](./cli.md) - Running tests
- [VCR Usage](./VCR_USAGE.md) - Deterministic testing

### Configuration
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - All config options
- [API Reference](./API.md) - Configuration endpoints
- [Getting Started](./getting-started.md) - Initial setup

### Architecture
- [Architecture Visual](./architecture-visual.md) - System design
- [VCR Implementation](./VCR_IMPLEMENTATION.md) - VCR internals
- [VCR Mode Design](./design/VCR_MODE_DESIGN.md) - Design decisions

### File Formats
- [Trace Format](./trace-format.md) - Trace JSON schema
- [Baseline Format](./baseline-format.md) - Test YAML schema
- [Migrations](./migrations.md) - Schema versioning

---

## 🆘 Need Help?

Can't find what you're looking for?

1. Check [Getting Started](./getting-started.md) for basics
2. Search this documentation (Ctrl+F in browser)

---

## 📝 Documentation Standards

All TraceForge documentation follows these guidelines:

- **Clear structure**: Headers, subheaders, and sections
- **Code examples**: Always include working examples
- **Cross-references**: Link to related docs
- **Up-to-date**: Updated with each schema version
- **Beginner-friendly**: Assume minimal knowledge

---

## 🗂️ Document Index

### User-Facing Guides (`guides/`)
- `getting-started.md` - Quick start
- `cli.md` - CLI reference
- `assertions.md` - Assertion types
- `API.md` - REST APIs
- `VCR_USAGE.md` - VCR usage guide
- `VCR_QUICK_REFERENCE.md` - VCR cheat sheet
- `ENVIRONMENT_VARIABLES.md` - Config options
- `architecture-visual.md` - Architecture diagrams
- `VCR_IMPLEMENTATION.md` - VCR internals
- `trace-format.md` - Trace schema
- `baseline-format.md` - Test schema
- `migrations.md` - Schema migrations
- `design/VCR_MODE_DESIGN.md` - VCR design doc

### Internal Documentation (`docs/`)
- `review.md` - Architectural review
- `PRODUCTION_IMPROVEMENTS.md` - Production improvements summary
- `implementation-summary.md` - Implementation history
- `PRODUCT_KT.md` - Product knowledge transfer

---

**Last Updated:** 2025-01-15  
**Schema Version:** 1.0.0
