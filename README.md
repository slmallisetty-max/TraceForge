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

### 2. Capture AI Snapshots

```bash
# Run your tests with snapshot recording
TRACEFORGE_VCR_MODE=record npm test

# Snapshots saved to .ai-snapshots/
```

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

---

## CLI Commands

```bash
# Check for AI behavior changes (CI)
traceforge check --baseline origin/main --candidate HEAD

# Show detailed diff for a change
traceforge check diff --snapshot-id <id>

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

- 📖 [Documentation](guides/README.md)
- 🐛 [Issue Tracker](https://github.com/slmallisetty/TraceForge.baseline/issues)
- 💬 [Discussions](https://github.com/slmallisetty/TraceForge.baseline/discussions)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Remember

**If AI behavior changes without explicit approval, the build must fail.**

That's the entire product. Everything else is infrastructure.

If your AI can silently change and reach production, you need TraceForge.
