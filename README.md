# TraceForge

> **If your AI output changes, your build will fail.**

That's it. That's the product.

---

## The Problem

You changed a prompt. Or swapped to a new model. Or updated context length.

Tests still passed. CI went green. You deployed.

**Then production broke.**

TraceForge makes this impossible.

---

## How It Works

```bash
# 1. Record baseline (local)
traceforge record
# Calls real model, saves snapshot, commits artifact

# 2. Run tests (CI)
traceforge test
# No model calls, uses snapshots, tests pass

# 3. Change prompt/model/context
# (any change)

# 4. Run tests again
traceforge test
# ❌ BUILD FAILS - Output changed without approval

# 5. Explicit approval
traceforge approve
# Regenerates snapshot, requires human intent, produces git diff
```

---

## Installation

```bash
npm install traceforge
```

---

## CLI Commands

Only these three commands exist:

```bash
traceforge record    # Record AI responses as snapshots
traceforge test      # Replay snapshots, fail on any difference
traceforge approve   # Approve changes and update snapshots
```

No flags explosion. No configuration DSL.

---

## File Structure

```
traceforge/
  snapshots/
    provider-name/
      snapshot-abc123.json
      snapshot-def456.json
```

That's it. JSON files in git. No database. No cloud service.

---

## Snapshot Format

```json
{
  "signature": "sha256-hash-of-request",
  "provider": "openai",
  "model": "gpt-4",
  "request": {
    "messages": [...],
    "temperature": 0
  },
  "response": {
    "choices": [...]
  },
  "recorded_at": "2026-01-13T..."
}
```

---

## CI Integration

```yaml
# .github/workflows/ci.yml
- name: Test AI behavior
  run: traceforge test
  # ☝️ Fails if snapshots missing or changed
```

---

## What This Prevents

- ❌ Prompt changes reaching production untested
- ❌ Model upgrades breaking your app silently
- ❌ Temperature/parameter tweaks causing regressions
- ❌ Non-deterministic AI outputs in CI

---

## What This Requires

1. **Deterministic AI calls**
   - temperature: 0
   - seed: fixed
   - No sampling

2. **Git-committed snapshots**
   - Must be in version control
   - Changes visible in PRs

3. **Explicit approval workflow**
   - Can't bypass the check
   - No --force flag

---

## This Is For You If

You've ever:
- ✓ Rolled back because AI output changed
- ✓ Hotfixed a prompt at 2am
- ✓ Watched tests pass but production fail
- ✓ Wished you caught AI changes earlier

---

## This Is NOT For You If

You:
- ❌ Don't use AI in production
- ❌ Want semantic similarity (coming post-MVP)
- ❌ Need a dashboard (coming post-MVP)
- ❌ Want cloud hosting (coming post-MVP)

---

## Status

**Current:** Strict MVP. Works. Opinionated. No extras.

**Roadmap:**
- v1.0: Exact matching only (current)
- v1.1: Semantic similarity option
- v2.0: Web UI for reviewing changes

---

## Philosophy

**Pain is the product.**

The CI failure message is not a bug—it's the feature. Everything else exists to produce that moment of pain where you **cannot ignore** that AI behavior changed.

If it doesn't hurt, it doesn't work.

---

## License

MIT

---

**Remember:** If your AI output changes, your build will fail.

That's not a bug. That's the feature.
