# TraceForge

> **If your AI output changes, your build will fail.**

That's it. That's the product.

[![Status](https://img.shields.io/badge/status-MVP-orange)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

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
Then:
- Customer support got flooded with complaints
- The model started refusing valid requests
- JSON parsing broke in production
- You spent 6 hours rolling back at 2am

**This happens because AI behavior changes are invisible to traditional testing.**

Your test suite checks if the code runs, not if the AI behaves correctly.

---

## The Solution

**TraceForge makes AI behavior changes unignorable.**

When you modify a prompt, change a model, or alter AI parameters:

1. **CI detects the change** (exact snapshot comparison)
2. **Build fails hard** (exit code 1, no escape hatch)
3. **You must explicitly approve** (or revert)

No warnings. No "ignore this" flags. No bypassing.

**If AI behavior changes without approval, the build fails. Period.**

---

## 60-Second Example

### Before TraceForge

```python
# summarizer.py
def summarize(text):
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",  # You change this to "gpt-4o"
        messages=[{"role": "user", "content": f"Summarize: {text}"}]
    )
    return response.choices[0].message.content
```

**What happens:**
- ✅ Tests pass (they just check if the function returns a string)
- ✅ CI passes
- ✅ Deploy succeeds
- ❌ Output format changed from terse to verbose
- ❌ Downstream parsing breaks
- ❌ Production incident

### With TraceForge

```bash
❌ BUILD FAILED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 AI BEHAVIOR CHANGED WITHOUT APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT CHANGED:
  Model: gpt-4-turbo → gpt-4o
  File:  summarizer.py:3

OUTPUT DIFF:
  Before: "Error: Invalid input format"
  After:  "I apologize, but I cannot process..."

WHY THIS MATTERS:
  • Changed from error code to natural language
  • Breaks downstream JSON parsing
  • Would cause silent failures in production

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO FIX:
  $ traceforge check approve --snapshot-id abc123
  $ git add .ai-snapshots/*.approved.json
  $ git commit -m "Approve AI behavior change"
  $ git push

Build will remain BLOCKED until behavior is approved.
Exit code: 1
```

**Now you can't ignore it.**

---

## Quick Start

### 1. Install

```bash
npm install -g @traceforge/cli
# or
pnpm add -D @traceforge/cli
```

### 3. Record AI Behavior
### 2. Capture AI Snapshots

```bash
# Run your tests with snapshot recording
TRACEFORGE_VCR_MODE=record npm test

# Snapshots saved to .ai-snapshots/
```

### 4. Commit Snapshots

```bash
git add .ai-tests/cassettes/
git commit -m "Initial AI snapshots"
```

### 5. Add CI Check
### 3. Commit Baselines

```bash
git add .ai-snapshots/
git commit -m "Add AI behavior baselines"
git push
```

### 4. Enable CI Check

```yaml
# .github/workflows/ci.yml
jobs:
  check-ai-behavior:
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
        with:
          fetch-depth: 0  # Need git history
      
      - run: npm install
      - run: npm run build
      
      - name: Check AI Behavior
        run: npx traceforge check --baseline origin/main
```

**That's it. Now every PR that changes AI behavior will fail CI until approved.**

---

## This Is For You If...

You get paged when:
- ❌ AI outputs change unexpectedly in production
- ❌ Prompt "improvements" break downstream systems
- ❌ Model upgrades cause silent regressions
- ❌ You have no way to review AI changes before deploy

You are:
- ✅ **Backend engineer** maintaining AI-powered APIs
- ✅ **Platform engineer** responsible for AI infrastructure
- ✅ **Staff engineer** designing AI systems for production
- ✅ **Engineering manager** tired of AI-related incidents

---

## This Is NOT For You If...

You:
- ❌ Don't use LLMs in production
- ❌ Only use AI for internal tools (no customer impact)
- ❌ Have deterministic AI outputs (unlikely with LLMs)
- ❌ Want a dashboard to "monitor" AI (that's observability, not prevention)

TraceForge is for **preventing** AI incidents, not monitoring them.

---

## How It Works

### 1. Capture Snapshots

TraceForge records AI interactions as versioned snapshots:

```json
{
  "id": "sha256-hash",
  "test_name": "summarization_test",
  "timestamp": "2026-01-09T...",
  "git_commit": "abc123",
  "inputs": {
    "model": "gpt-4-turbo",
    "messages": [...],
    "temperature": 0.7
  },
  "output": {
    "content": "...",
    "finish_reason": "stop"
  },
  "metadata": {
    "file": "summarizer.py",
    "line": 12
  }
}
```

Snapshots live in `.ai-snapshots/` and are committed to git.

### 2. Detect Changes

In CI, `traceforge check` compares current snapshots to baseline:

- **Model changed?** → Fail
- **Prompt changed?** → Fail
- **Output changed?** → Fail
- **Temperature changed?** → Fail

**No ML. No semantic analysis. Just exact comparison.**

If anything changed, CI fails with exit code 1.

### 3. Force Approval

To unblock CI, you must:

```bash
# Review the change
traceforge check diff --snapshot-id abc123

# If intentional, approve it
traceforge check approve --snapshot-id abc123

# Commit the approval
git add .ai-snapshots/*.approved.json
git commit -m "Approve AI behavior change"
git push
```

No shortcuts. No `--force`. No ignoring.

**Approved changes are the new baseline.**

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
```bash
# Check for AI behavior changes (CI)
traceforge check --baseline origin/main --candidate HEAD

# Show detailed diff for a change
traceforge check diff --snapshot-id <id>

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
# Approve a change
traceforge check approve --snapshot-id <id> --reason "Why"

# Approve all changes at once
traceforge check approve --all --reason "Batch approval"
```

---

## GitHub Actions Example

```yaml
name: AI Behavior Check

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  check-ai-behavior:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      
      - name: Check AI Behavior Changes
        run: npx traceforge check --baseline origin/main
        env:
          TRACEFORGE_MODE: strict
```

**When AI behavior changes, this workflow fails. Your PR is blocked.**

---

## Philosophy

### We Make AI Behavior Changes Unignorable

Traditional testing doesn't catch AI regressions because:

1. **Tests check code, not outputs** — "Did the function run?" not "Did it do the right thing?"
2. **Non-determinism hides changes** — Different output every run = impossible to detect drift
3. **Warnings get ignored** — If it's not blocking, it's invisible

**TraceForge makes the invisible visible by:**

1. **Snapshotting AI outputs** — Create a record of "correct" behavior
2. **Comparing exactly** — Any change = immediate detection
3. **Blocking hard** — No merge until explicit approval

### Pain Is The Product

The CI failure output is not a bug—it's the entire product.

Everything else (commands, storage, diffs) exists to produce that moment of pain where a developer **cannot ignore** that AI behavior changed.

If it doesn't hurt, it doesn't work.

### Approval Is The Safety Mechanism

Requiring explicit approval means:

1. **Someone reviewed the change** — Not accidental, not silent
2. **Change is documented** — Approval reason in git history
3. **Rollback is possible** — Just revert the approval commit

This is change control for AI systems.

---

## What's NOT In MVP

TraceForge v1.0 (MVP) is **intentionally minimal**:

❌ No semantic similarity (just exact match)  
❌ No ML-based risk scoring  
❌ No dashboard or web UI  
❌ No cloud hosting  
❌ No advanced diff algorithms  
❌ No performance optimization  

**We focus on one thing: making AI changes impossible to ignore.**

Everything else can come later once the core value is proven.

---

## Roadmap

**v1.0 - MVP (Now)**
- ✅ Snapshot capture and storage
- ✅ Exact comparison (no ML)
- ✅ CI blocking with exit code 1
- ✅ Approval workflow
- ✅ GitHub Actions example

**v1.1 - Post-MVP**
- [ ] Semantic similarity (embeddings)
- [ ] Risk scoring (ML-based impact)
- [ ] Web UI for reviewing changes
- [ ] VS Code extension
- [ ] Multi-provider support (Claude, Gemini, etc.)

**v2.0 - Future**
- [ ] Policy engine (auto-approve low-risk)
- [ ] Cloud-hosted version
- [ ] Advanced git workflows
- [ ] Slack/email notifications

---

## FAQ

**Q: Do I need to change my code?**  
A: No. TraceForge works at the infrastructure level (proxy or snapshots).

**Q: What if my AI outputs are non-deterministic?**  
A: Set `temperature=0` for deterministic outputs, or use semantic comparison (coming in v1.1).

**Q: Can I disable the check for a specific PR?**  
A: No. That's the point. If AI changed, you must approve or revert.

**Q: What about false positives?**  
A: MVP uses exact match, so any change triggers. v1.1 will add semantic similarity for smarter detection.

**Q: Does this work with Claude/Gemini/etc?**  
A: MVP supports OpenAI. Other providers coming in v1.1.

**Q: Is there a cloud version?**  
A: Not yet. MVP is local-first and runs in CI. Cloud coming in v2.0.

---

## Support & Contributing

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
- 📖 [Documentation](guides/README.md)
- 🐛 [Issue Tracker](https://github.com/slmallisetty/TraceForge.baseline/issues)
- 💬 [Discussions](https://github.com/slmallisetty/TraceForge.baseline/discussions)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

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
## Remember

**If AI behavior changes without explicit approval, the build must fail.**

That's the entire product. Everything else is infrastructure.

If your AI can silently change and reach production, you need TraceForge.
