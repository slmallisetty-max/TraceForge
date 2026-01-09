# TraceForge

> **If your AI output changes, your build will fail.**

That's it. That's the product.

---

## The Problem

You changed a prompt.  
Or swapped to a new model.  
Or updated context length.

Tests still passed.  
CI went green.  
You deployed.

**Then:**
- Customer support got flooded
- The model started refusing valid requests
- JSON parsing broke in production
- You spent 6 hours rolling back

**TraceForge makes this impossible.**

---

## How It Works

```bash
# 1. Run your AI code
npm test
✓ All tests pass

# 2. Change your prompt
# (edit src/prompts.py)

# 3. Run tests again
npm test
✗ BLOCKED: AI behavior changed without approval

# 4. Review and approve
traceforge diff
traceforge snapshot approve
git commit -m "Approved: switched to gpt-4o"
```

Your CI fails **before** production breaks.

---

## Installation

```bash
npm install traceforge
export OPENAI_BASE_URL=http://localhost:8787/v1
```

Add to CI:
```yaml
- name: Check AI behavior
  run: traceforge check  # ← Fails if behavior changed
```

Done.

---

## This is for you if:

You've ever:
- ✓ Rolled back because AI output changed
- ✓ Hotfixed a prompt at 2am
- ✓ Watched tests pass but production fail
- ✓ Wished you caught AI changes earlier

This is **not** for you if:
- ✗ You don't deploy AI to production
- ✗ You're fine with non-deterministic behavior
- ✗ You don't have CI

---

## Philosophy

Most AI tools optimize for **building faster**.  
TraceForge optimizes for **breaking less**.

We make AI behavior changes:
1. Visible
2. Blockable
3. Unignorable

Everything else is a side effect.

---

## Quick Start

### 1. Install and Start Proxy

```bash
# Clone and install
git clone <repository-url>
cd traceforge
pnpm install
pnpm build

# Start proxy server
pnpm --filter @traceforge/proxy start
# Proxy running at http://localhost:8787
```

### 2. Point Your App to TraceForge

```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=sk-your-actual-key
```

### 3. Record AI Behavior

```bash
# Run your app with recording enabled
TRACEFORGE_VCR_MODE=record node your-app.js

# Responses saved to .ai-tests/cassettes/
```

### 4. Commit Snapshots

```bash
git add .ai-tests/cassettes/
git commit -m "Initial AI snapshots"
```

### 5. Add CI Check

```yaml
# .github/workflows/ci.yml
name: AI Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      
      - name: Check AI behavior (STRICT)
        run: pnpm traceforge check
        env:
          TRACEFORGE_VCR_MODE: strict
        # ☝️ Fails if AI behavior changed
```

---

## What Happens When AI Changes

```bash
❌ BUILD FAILED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 AI BEHAVIOR CHANGED WITHOUT APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT CHANGED:
  Prompt:     src/agents/summarizer.py:12
  Function:   generate_summary()
  Model:      gpt-4-turbo → gpt-4o
  
BEHAVIORAL DIFF:
  ┌─────────────────────────────────────────────────┐
  │ Before: "Error: Invalid input format"          │
  │ After:  "I apologize, but I cannot process..." │
  └─────────────────────────────────────────────────┘

WHY THIS MATTERS:
  • Changed from error code to apology text
  • Breaks downstream JSON parsing
  • Would cause silent failures in production

TO FIX: 
   $ traceforge snapshot approve
   $ git add .ai-snapshots/
   $ git commit -m "Update AI behavior: switched to gpt-4o"

❌ Build blocked. Approve snapshot changes to proceed.
```

**This is the product.** Everything else serves this failure message.

---

## VCR Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `record` | Call API and save responses | Creating snapshots |
| `replay` | Use saved responses | Local testing |
| `strict` | Replay only, hard fail if missing | **CI/CD** ✨ |
| `auto` | Replay if exists, record if missing | Development |
| `off` | Direct API calls, no recording | Live debugging |

In **strict mode**, TraceForge becomes a deploy gate:
- ✅ Zero live API calls
- ✅ Missing snapshot → build fails
- ✅ Changed response → build fails
- ✅ **Every AI change requires explicit approval**

---

## Commands

```bash
# Core command for CI
traceforge check              # Verify snapshots, exit 1 on changes

# VCR management
traceforge vcr status         # Show VCR configuration
traceforge vcr list           # List all cassettes
traceforge vcr clean          # Delete all cassettes

# Development
traceforge init               # Initialize project
traceforge start              # Start proxy server
```

---

## Examples

### Basic Usage

```javascript
// Your existing code (no changes needed)
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:8787/v1',
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0,  // ← Must be 0 for determinism
  seed: 42         // ← Recommended for reproducibility
});
```

### Workflow

```bash
# Day 1: Record initial snapshots
TRACEFORGE_VCR_MODE=record npm test
git add .ai-tests/cassettes/
git commit -m "Initial AI snapshots"

# Day 2: Change a prompt
# (edit src/prompts.js)

# Day 3: Run tests - BLOCKED
npm test
# ❌ BUILD FAILED: AI behavior changed

# Day 4: Review and approve
git diff .ai-tests/cassettes/
TRACEFORGE_VCR_MODE=record npm test
git add .ai-tests/cassettes/
git commit -m "Approved: updated prompt for clarity"

# CI passes ✅
```

---

## Architecture

```
┌─────────────────┐
│  Your App       │
└────────┬────────┘
         │ OPENAI_BASE_URL=localhost:8787
         ↓
┌─────────────────┐
│ TraceForge      │
│ Proxy           │  → Records requests/responses
└────────┬────────┘  → Enforces VCR mode
         │            → Blocks on changes
         ↓
┌─────────────────┐
│ LLM Provider    │
│ (OpenAI, etc)   │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│ .ai-tests/      │
│  cassettes/     │  ← Git-committed snapshots
└─────────────────┘
```

**Key insight:** Proxy is transparent. Your code doesn't change. Only the base URL changes.

---

## Determinism Requirements

For snapshots to work, AI calls **must** be deterministic:

### ✅ Deterministic (Required)

```javascript
{
  temperature: 0,    // ← Must be zero
  seed: 42,          // ← Use fixed seed
  model: 'gpt-4'     // ← Pin model version
}
```

### ❌ Non-Deterministic (Fails CI)

```javascript
{
  temperature: 0.7,  // ← Non-zero temperature
  // Missing seed      ← No seed
}
```

TraceForge detects non-determinism by running checks multiple times. If outputs vary, CI fails with clear instructions.

---

## Supported Providers

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 (via OpenAI-compatible proxy)
- **Local Models**: Ollama, LocalAI

All providers use the OpenAI API format. Just change `baseURL`.

---

## Status

**Current:** Early MVP, opinionated, works.

**Supports:**
- ✅ Record/replay for OpenAI-compatible APIs
- ✅ Strict mode for CI enforcement
- ✅ Hash-based integrity verification
- ✅ CLI for snapshot management

**Not coming yet:**
- ❌ Web dashboards
- ❌ Analytics
- ❌ Cloud hosting
- ❌ Multi-tenant deployments

TraceForge is a **local-first tool**. It runs on your machine, commits to Git, and blocks in CI. No cloud service required.

---

## Documentation

- [CI Failure Specification](docs/MVP_CI_FAILURE.md) - Exact terminal output
- [Snapshot Format](docs/SNAPSHOT_FORMAT.md) - Canonical format definition
- [Deletion Candidates](docs/DELETION_CANDIDATES.md) - Features to remove

---

## FAQ

**Q: Does TraceForge work with my language/framework?**  
A: Yes! Any language that makes HTTP requests to OpenAI-compatible APIs works (Python, JavaScript, Ruby, Go, etc.).

**Q: Do I need to change my code?**  
A: No. Only set `OPENAI_BASE_URL=http://localhost:8787/v1`. No SDK changes required.

**Q: What about API costs?**  
A: In strict mode (CI), zero API calls are made. You only pay during local recording.

**Q: How do I handle non-deterministic outputs?**  
A: Set `temperature: 0` and use a `seed`. TraceForge will fail if outputs still vary.

**Q: What if I want to change AI behavior?**  
A: Change the code, record new snapshots, review the diff, commit. That's the workflow.

**Q: Can I skip the check with --force?**  
A: No. By design. If you need to skip it, you're using it wrong.

---

## License

MIT — use it before your AI breaks production again.

---

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/slmallisetty/TraceForge.baseline/issues)
- 💬 [Discussions](https://github.com/slmallisetty/TraceForge.baseline/discussions)

---

**Remember:** If your AI output changes, your build will fail.

That's not a bug. That's the feature.
