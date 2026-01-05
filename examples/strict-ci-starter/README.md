# TraceForge Strict CI Starter

**The fastest way to make AI behavior changes require explicit approval.**

This example shows how to enforce the TraceForge guarantee:

> **"No AI behavior change reaches production without a recorded execution and verified replay."**

---

## What This Example Demonstrates

✅ **Local development** - Record AI executions  
✅ **Version control** - Commit execution snapshots  
✅ **CI enforcement** - Hard fail on missing/changed executions  
✅ **Zero API costs** - Replay from snapshots in CI  

---

## Quick Start (5 Minutes)

### 1. Clone and Install

```bash
git clone <your-repo>
cd strict-ci-starter
npm install
```

### 2. Start TraceForge (Terminal 1)

```bash
# Install TraceForge globally
npm install -g @traceforge/cli @traceforge/proxy

# Start the replay engine
traceforge-proxy
```

### 3. Record Execution Snapshots (Terminal 2)

```bash
# Point your app to TraceForge
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=<your-real-api-key>

# Enable recording mode
export TRACEFORGE_VCR_MODE=record

# Run your tests (creates snapshots)
npm test
```

**Result:** Execution snapshots saved to `.ai-tests/cassettes/`

### 4. Commit Snapshots

```bash
git add .ai-tests/cassettes/
git commit -m "Add execution snapshots for text summarization"
git push
```

### 5. CI Enforces Reproducibility

GitHub Actions runs with `TRACEFORGE_VCR_MODE=strict`:

```yaml
env:
  TRACEFORGE_VCR_MODE: strict  # ← Hard fail enforcement
```

**What happens:**
- ✅ **With snapshots:** Tests replay, build passes
- ❌ **Missing snapshots:** Build fails immediately
- ❌ **Changed output:** Build fails with diff

---

## The Golden Path

This is the **one path** every serious AI team should follow:

```
1. Install     → npm install -g @traceforge/proxy
2. Intercept   → export OPENAI_BASE_URL=http://localhost:8787/v1
3. Record      → TRACEFORGE_VCR_MODE=record npm test
4. Commit      → git add .ai-tests/ && git commit
5. CI Replay   → TRACEFORGE_VCR_MODE=strict (in .github/workflows/ci.yml)
6. Diff        → Review behavior changes in PR
7. Approve     → Merge = snapshot becomes truth
```

---

## Project Structure

```
strict-ci-starter/
├── .github/workflows/
│   └── ci.yml                    # ⭐ Strict mode enforced here
├── .ai-tests/
│   └── cassettes/                # ⭐ Committed execution snapshots
│       └── openai/
│           └── abc123.json
├── src/
│   └── app.js                    # Your AI application
├── test.js                       # Your test
└── package.json
```

---

## Local Development Commands

```bash
# Develop with live API calls (default)
npm run dev

# Record execution snapshots
TRACEFORGE_VCR_MODE=record npm test

# Verify locally (replay from snapshots)
TRACEFORGE_VCR_MODE=replay npm test

# Check VCR status
traceforge-cli vcr status
```

---

## CI Behavior

### ✅ Build Passes (Happy Path)

```
✓ Execution snapshot found
✓ Replaying from cassette
✓ No API key needed
✓ Test passed
✓ Build succeeded
```

### ❌ Build Fails (Missing Snapshot)

```
✗ STRICT CI MODE: Missing execution snapshot for openai request.
✗ Build failed. Signature: abc123def456.
✗ Record snapshots locally with TRACEFORGE_VCR_MODE=record before committing.

Process exited with code 1
```

### ❌ Build Fails (Changed Output)

```
✗ Test failed: AI output changed

Expected (snapshot):
  "TraceForge ensures reproducible AI behavior through execution replay."

Actual (current):
  "TraceForge guarantees AI reproducibility via execution snapshots."

Action required: Review behavior change and update snapshot if intentional.

Process exited with code 1
```

---

## Updating Snapshots

When AI output **intentionally** changes:

```bash
# 1. Delete old snapshot
rm .ai-tests/cassettes/openai/abc123.json

# 2. Record new snapshot
TRACEFORGE_VCR_MODE=record npm test

# 3. Commit with clear message
git add .ai-tests/cassettes/
git commit -m "Update snapshot: Changed summarization prompt for clarity"

# 4. PR description explains behavior change
```

**Reviewers see:**
- The snapshot diff in PR
- What changed in AI behavior
- Why the change was made

---

## What Makes This Unavoidable

### 1. Build Gates

Missing snapshot = **cannot merge**.  
No warnings. No bypass. Hard fail.

### 2. Version Control

Snapshots in git = **institutional memory**.  
Removing TraceForge = losing AI behavior history.

### 3. Review Process

PR reviews become **behavior reviews**, not code reviews.  
"Does this AI change make sense?" not "Does this code compile?"

### 4. Zero Friction in CI

No API keys in CI secrets.  
No rate limits.  
No flakiness.  
Just replay and verify.

---

## For Backend Engineers Shipping Production LLMs

**This is for you if:**
- ✅ You ship AI features to production
- ✅ You already respect CI failures
- ✅ You fear silent AI regressions
- ✅ You think in invariants and contracts

**This is NOT for you if:**
- ❌ You're prototyping
- ❌ You don't have CI/CD
- ❌ You want a prompt playground
- ❌ You need observability dashboards

---

## What TraceForge Is NOT

- ❌ Not a prompt playground
- ❌ Not an AI observability SaaS
- ❌ Not a model evaluation framework
- ❌ Not a debugging tool

**TraceForge is an execution control layer.**

It makes one guarantee, and makes it unavoidable:

> "No AI behavior reaches production without recorded execution and verified replay."

---

## Troubleshooting

### "Build passes locally but fails in CI"

**Cause:** Snapshot exists locally but not committed.

**Fix:**
```bash
git add .ai-tests/cassettes/
git push
```

### "Too many snapshot updates"

**Cause:** Non-deterministic responses (temperature > 0).

**Fix:** Set `temperature: 0` in your API calls.

### "Snapshot signature mismatch"

**Cause:** Cassette file modified or corrupted.

**Fix:**
```bash
rm .ai-tests/cassettes/openai/<signature>.json
TRACEFORGE_VCR_MODE=record npm test
```

---

## Next Steps

1. ✅ Clone this example
2. ✅ Record your first snapshot
3. ✅ Push to GitHub
4. ✅ Watch CI enforce it

Then:
- Wire into your real application
- Add to team workflow
- Make it mandatory in branch protection

---

## The Guarantee

**After 30 days with TraceForge:**

Your team will say:

> "We don't allow live AI calls in CI"

Not:

> "We use TraceForge"

**That's when it becomes unavoidable.**

---

## Learn More

- [Full Documentation](../../README.md)
- [CI Enforcement Guide](../../guides/CI_ENFORCEMENT.md)
- [Quick Reference](../../docs/QUICK_REFERENCE.md)

---

## License

MIT
