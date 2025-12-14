# TraceForge

> **Local-First AI Debugging Platform** - Capture, inspect, and test LLM interactions without the cloud

[![Status](https://img.shields.io/badge/status-V2%20Complete-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## What is TraceForge?

TraceForge helps developers debug AI applications the same way they debug regular code. When your app talks to AI models (GPT-4, Claude, Gemini), TraceForge captures every interaction, lets you replay them as tests, and keeps all data on your machine.

### Why TraceForge?

❌ **Problems it solves:**
- Can't see what's happening between your app and the AI
- Responses change randomly, can't reproduce bugs
- No way to know if model updates broke your app
- Cloud tools require sending sensitive data to external servers

✅ **What you get:**
- 🔍 **Full visibility** - See every request and response
- 🧪 **Deterministic testing** - Turn traces into reproducible tests
- 📊 **Multi-provider comparison** - Compare OpenAI vs Claude vs Gemini
- 🔒 **100% local** - Zero cloud dependencies, all data stays on your machine
- ⚡ **Production-ready** - Streaming support, parallel tests, VS Code integration

---

## Quick Start

Get running in **5 minutes**:

```bash
# 1. Install dependencies
pnpm install && pnpm build

# 2. Start the proxy (captures LLM calls)
cd packages/proxy
export OPENAI_API_KEY=your-key
pnpm start

# 3. Point your app to the proxy
export OPENAI_BASE_URL=http://localhost:8787/v1

# 4. View traces in the web UI
cd packages/web
pnpm dev
# Open http://localhost:3001
```

**That's it!** Every LLM call is now captured and visible.

👉 [Detailed Getting Started Guide →](DEV-GETTING-STARTED.md)

---

## Key Features

### 🔍 For Debugging

**Trace Every LLM Call**
- Captures request, response, timing, tokens
- Works with streaming (SSE) responses
- Real-time timeline with auto-refresh
- Deep inspection of every parameter

**Visual Diff View**
- Side-by-side comparison of any two traces
- Highlights additions, deletions, changes
- JSON path navigation for complex objects
- Perfect for regression detection

**Multi-Provider Support**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic Claude (Opus, Sonnet)
- Google Gemini (Pro, Vision)
- Ollama (local models)
- Auto-detects provider from model name

### 🧪 For Testing

**Create Tests from Traces**
- Click "Save as Test" in UI
- Or use CLI: `traceforge test create-from-trace <id>`
- Tests are human-readable YAML files

**Advanced Assertions**
- `equals` - Exact match
- `content_contains` - Substring check
- `content_matches` - Regex patterns
- `fuzzy_match` - Similarity matching (85% threshold)
- `response_time` - Performance checks
- `token_range` - Token usage validation
- `schema_validation` - JSON schema checks
- `json_path` - Complex queries

**Parallel Execution**
- Run tests in parallel: `--parallel`
- Watch mode: `--watch`
- Fixtures for setup/teardown
- JUnit XML reports for CI/CD

### 📊 For Teams

**Analytics Dashboard**
- Response time trends
- Token usage tracking
- Test pass/fail rates
- Provider distribution
- Error rate monitoring

**VS Code Extension**
- Test tree view with status indicators
- Traces explorer
- Run tests with one click
- Code snippets for test creation
- Proxy management from sidebar

**Web-Based Config Editor**
- Edit `.ai-tests/config.yaml` visually
- Provider configuration
- Test patterns
- Validation and syntax highlighting

### 🔒 For Security

**Local-First Architecture**
- All data stored in `.ai-tests/` directory
- No external servers required
- Works offline (except actual LLM calls)
- Sensitive prompts never leave your network

---

## Architecture

```
┌─────────────────┐
│   Your App      │
│  (any language) │
└────────┬────────┘
         │ http://localhost:8787/v1
         ↓
┌─────────────────┐
│  TraceForge     │◄─── Captures traffic
│  Proxy Server   │◄─── Detects provider
│  (port 8787)    │◄─── Stores traces
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  AI Provider    │
│  OpenAI/Claude  │
│  Gemini/Ollama  │
└─────────────────┘

Stored in: .ai-tests/traces/
Viewed via: Web UI (port 3001) or CLI
```

**Components:**
- **Proxy Server** - Fastify-based multi-provider interceptor
- **Storage** - JSON traces and YAML tests on disk
- **Web UI** - React + TailwindCSS dashboard
- **CLI** - Command-line trace viewer and test runner
- **VS Code Extension** - Editor integration

👉 [Detailed Architecture Guide →](ARCHITECTURE.md)

---

## Documentation Hub

### I want to...

**🚀 Use TraceForge**
- [Getting Started Guide](DEV-GETTING-STARTED.md) - Installation to first test
- [Quick Start](QUICKSTART.md) - 5-minute setup
- [API Reference](API-REFERENCE.md) - Complete CLI and REST API docs

**🔧 Understand How It Works**
- [Architecture Guide](ARCHITECTURE.md) - System design deep dive
- [Advanced Topics](ADVANCED.md) - Multi-provider, performance, patterns
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

**📚 Learn by Example**
- [Tutorials](TUTORIALS.md) - Step-by-step walkthroughs
- [Testing Guide](TESTING-GUIDE.md) - Comprehensive testing workflows

**🤝 Contribute**
- [Contributing Guide](CONTRIBUTING.md) - Development setup and workflow
- [Implementation Docs](v2-complete-summary.md) - What's built and how

---

## Current Status

### ✅ V2 Complete (December 2024)

All 8 phases implemented:

1. ✅ **Streaming Support** - SSE capture, chunk timing, replay
2. ✅ **Trace Diff View** - Side-by-side comparison with highlights
3. ✅ **Advanced Assertions** - 8 assertion types, fuzzy matching
4. ✅ **Analytics Dashboard** - Performance metrics, token tracking
5. ✅ **Config Editor** - Web-based YAML editor
6. ✅ **Test Runner** - Parallel execution, fixtures, watch mode
7. ✅ **VS Code Extension** - Tree views, commands, snippets
8. ✅ **Multi-Provider** - OpenAI, Claude, Gemini, Ollama

### 📦 Packages

- `@traceforge/shared` - Types and schemas
- `@traceforge/proxy` - Multi-provider interceptor
- `@traceforge/cli` - Command-line tool
- `@traceforge/web` - Dashboard and API
- `@traceforge/vscode-extension` - Editor integration

### 🔮 Future Roadmap

- **Team Features** - Shared trace libraries, collaborative testing
- **Advanced Analytics** - Cost tracking, model comparison reports
- **More Providers** - Azure OpenAI, Cohere, Hugging Face
- **Export/Import** - Share test suites, trace collections
- **Performance** - Trace compression, incremental storage

---

## Example Workflows

### Workflow 1: Debug a Production Issue

```bash
# 1. Your app is using the proxy in production
export OPENAI_BASE_URL=http://localhost:8787/v1

# 2. Issue reported: AI gives wrong answer
# 3. Find the trace in UI or CLI
traceforge trace list --filter "error"

# 4. View the full request/response
traceforge trace view abc123

# 5. See that prompt was missing context
# 6. Fix the prompt in your app
# 7. Create a test to prevent regression
traceforge test create-from-trace abc123

# 8. Run test suite
traceforge test run
```

### Workflow 2: Compare Models

```bash
# 1. Send same prompt to different models
# Your app calls with model: "gpt-4"
# Then calls with model: "claude-3-opus-20240229"
# Then calls with model: "gemini-pro"

# 2. View traces in dashboard
# 3. Click "Compare" to see side-by-side diff
# 4. See differences in:
#    - Response content
#    - Response time
#    - Token usage
#    - Cost implications

# 5. Make informed decision on model choice
```

### Workflow 3: Test Streaming Responses

```yaml
# .ai-tests/tests/streaming.test.yaml
name: Test streaming chat
request:
  model: gpt-4
  messages:
    - role: user
      content: "Write a haiku"
  stream: true

assertions:
  - type: response_time
    max_ms: 5000
  - type: content_contains
    value: "haiku"
  - type: fuzzy_match
    expected: "nature poem about seasons"
    threshold: 0.7
```

```bash
# Run the test
traceforge test run --filter streaming

# See streaming replay in UI with chunk timing
```

---

## Use Cases

### For Developers
- Debug why AI responses are inconsistent
- Test prompt engineering changes
- Validate model upgrades don't break functionality
- Performance test LLM latency

### For Teams
- Share reproducible AI bugs via test files
- Standardize LLM testing practices
- Monitor AI performance over time
- Compare costs across providers

### For Companies
- Keep sensitive data on-premises
- Audit all AI interactions
- Regression test critical AI features
- Meet compliance requirements

---

## System Requirements

- **Node.js** 18 or higher
- **pnpm** 8 or higher
- **Ports**: 8787 (proxy), 3001 (web API), 5173 (web UI)
- **Storage**: ~10MB per 1000 traces

**Supported Platforms:**
- macOS, Linux, Windows
- Docker (optional)

**API Keys Needed:**
- OpenAI: `OPENAI_API_KEY` (required for GPT models)
- Anthropic: `ANTHROPIC_API_KEY` (optional, for Claude)
- Google: `GEMINI_API_KEY` (optional, for Gemini)
- Ollama: None (local models)

---

## Philosophy

### Why Local-First?

**Security**: Your prompts and responses never leave your infrastructure. No third-party services can see your data.

**Privacy**: No analytics, no telemetry, no tracking. You own your data.

**Reliability**: Works offline. No SaaS downtime affects your debugging.

**Cost**: No subscription fees, no per-trace pricing, no surprise bills.

### Why Multi-Provider?

**Flexibility**: Switch between OpenAI, Claude, Gemini based on use case.

**Comparison**: Side-by-side testing to find the best model for your needs.

**Vendor Independence**: Not locked into one provider's ecosystem.

**Future-Proof**: Easy to add new providers as they emerge.

---

## Community & Support

### Getting Help

- **Documentation**: You're reading it! Start with [Getting Started](DEV-GETTING-STARTED.md)
- **Troubleshooting**: [Common issues and solutions](TROUBLESHOOTING.md)
- **GitHub Issues**: Report bugs or request features

### Contributing

TraceForge is open source and welcomes contributions!

- **Code**: [Contributing Guide](CONTRIBUTING.md)
- **Docs**: Improve these docs via PR
- **Issues**: Report bugs, suggest features
- **Discussions**: Share use cases and ideas

---

## License

MIT License - See [LICENSE](../LICENSE) for details

---

## Quick Links

**Essential Docs:**
- [Getting Started](DEV-GETTING-STARTED.md)
- [API Reference](API-REFERENCE.md)
- [Architecture](ARCHITECTURE.md)

**Learn More:**
- [Tutorials](TUTORIALS.md)
- [Advanced Topics](ADVANCED.md)
- [Testing Guide](TESTING-GUIDE.md)

**Contribute:**
- [Contributing Guide](CONTRIBUTING.md)
- [GitHub Repository](#)
- [Report Issue](#)

---

**Ready to start?** → [Getting Started Guide](DEV-GETTING-STARTED.md)

**Have questions?** → [Troubleshooting](TROUBLESHOOTING.md)

**Want to contribute?** → [Contributing Guide](CONTRIBUTING.md)
