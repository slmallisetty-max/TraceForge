# TraceForge Strict CI - Quick Reference Card

**For backend engineers shipping production LLMs**

---

## The Guarantee

> "No AI behavior reaches production without recorded execution and verified replay."

---

## Installation (One Time)

```bash
npm install -g @traceforge/proxy
```

---

## Local Development

### Start Proxy (Terminal 1)
```bash
traceforge-proxy
# Listening on http://localhost:8787
```

### Point Your App to Proxy (Terminal 2)
```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=<your-key>
```

---

## VCR Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| `off` | Direct API calls | Never use in production apps |
| `record` | Capture API responses | Creating/updating snapshots |
| `replay` | Use snapshots only | Local testing without API costs |
| `auto` | Replay if exists, record if missing | Convenience mode (dev) |
| **`strict`** | **Replay or hard fail** | **CI enforcement** |

---

## Common Commands

### Record Snapshots
```bash
TRACEFORGE_VCR_MODE=record npm test
```

### Test from Snapshots
```bash
TRACEFORGE_VCR_MODE=replay npm test
```

### Check VCR Status
```bash
traceforge-cli vcr status
```

### List Snapshots
```bash
ls -R .ai-tests/cassettes/
```

---

## CI Configuration

### GitHub Actions (Most Common)
```yaml
env:
  TRACEFORGE_VCR_MODE: strict  # Hard fail enforcement
  OPENAI_BASE_URL: http://localhost:8787/v1

steps:
  - name: Start TraceForge
    run: |
      npm install -g @traceforge/proxy
      traceforge-proxy &
      
  - name: Run Tests
    run: npm test  # Replays from committed snapshots
```

### GitLab CI
```yaml
variables:
  TRACEFORGE_VCR_MODE: strict
  OPENAI_BASE_URL: http://localhost:8787/v1

before_script:
  - npm install -g @traceforge/proxy
  - traceforge-proxy &

test:
  script:
    - npm test
```

---

## Workflow: Making AI Changes

### 1. Develop Locally
```bash
# Make code changes
vim src/app.js

# Test with live API
npm test
```

### 2. Record Snapshots
```bash
TRACEFORGE_VCR_MODE=record npm test
# Creates .ai-tests/cassettes/openai/*.json
```

### 3. Commit Snapshots
```bash
git add .ai-tests/cassettes/
git commit -m "Add snapshots for new summarization feature"
git push
```

### 4. CI Enforces
- ✅ **With snapshot:** Build passes, replays deterministically
- ❌ **Without snapshot:** Build fails, cannot merge

### 5. Review PR
- Reviewer sees: `.ai-tests/cassettes/openai/abc123.json` changed
- Reviewer asks: "What's the behavior change?"
- Team decides: Approve or request changes

---

## Troubleshooting

### "Missing snapshot" in CI
```
❌ STRICT CI MODE: Missing execution snapshot

Fix:
  TRACEFORGE_VCR_MODE=record npm test
  git add .ai-tests/cassettes/
  git push
```

### "Test failed: AI output changed"
```
❌ Expected: "Old response"
   Actual:   "New response"

If INTENTIONAL:
  TRACEFORGE_VCR_MODE=record npm test
  git add .ai-tests/cassettes/
  git commit -m "Update snapshot: behavior change reason"

If UNINTENTIONAL:
  Fix your code/prompt
  Test again
```

### "Snapshot signature mismatch"
```
❌ Cassette signature invalid

Fix:
  rm .ai-tests/cassettes/openai/<signature>.json
  TRACEFORGE_VCR_MODE=record npm test
  git add .ai-tests/cassettes/
```

### "Proxy not responding"
```
Check if running:
  curl http://localhost:8787/health

Restart:
  pkill traceforge-proxy
  traceforge-proxy
```

---

## What Gets Committed

### ✅ Always Commit
- `.ai-tests/cassettes/**/*.json` - Execution snapshots
- `.github/workflows/*.yml` - CI configuration
- Test files that use snapshots

### ❌ Never Commit
- `node_modules/` - Dependencies
- `.env` - API keys
- Build artifacts

---

## Red Flags

### 🚩 "Snapshot updates too frequent"
**Cause:** Non-deterministic responses (temperature > 0)  
**Fix:** Set `temperature: 0` in API calls

### 🚩 "Tests flaky between runs"
**Cause:** Not using snapshots consistently  
**Fix:** Use `TRACEFORGE_VCR_MODE=replay` for local tests

### 🚩 "PR has 50+ snapshot changes"
**Cause:** Bulk prompt refactoring without review  
**Fix:** Make smaller, incremental changes

### 🚩 "Engineers bypass strict mode"
**Cause:** Too much friction in workflow  
**Fix:** Report friction, improve tooling

---

## File Locations

```
your-app/
├── .ai-tests/
│   └── cassettes/
│       └── openai/           ← Committed snapshots
│           └── abc123.json
├── .github/workflows/
│   └── ci.yml                ← TRACEFORGE_VCR_MODE=strict
├── src/
│   └── app.js                ← Your AI code
└── test.js                   ← Your tests
```

---

## When Things Go Wrong in CI

### Missing Snapshot
```bash
# Locally:
TRACEFORGE_VCR_MODE=record npm test
git add .ai-tests/cassettes/
git push
```

### Changed Output (Intentional)
```bash
# Locally:
rm .ai-tests/cassettes/openai/<old>.json
TRACEFORGE_VCR_MODE=record npm test
git add .ai-tests/cassettes/
git commit -m "Update behavior: <reason>"
git push
```

### Changed Output (Unintentional)
```bash
# Fix code
git checkout -- src/app.js
npm test  # Should pass with old snapshot
```

---

## Environment Variables

| Variable | Values | Purpose |
|----------|--------|---------|
| `TRACEFORGE_VCR_MODE` | `off`, `record`, `replay`, `auto`, `strict` | Control recording/replay |
| `OPENAI_BASE_URL` | `http://localhost:8787/v1` | Route through proxy |
| `OPENAI_API_KEY` | Your API key | Required for recording |
| `TRACEFORGE_STORAGE_PATH` | `.ai-tests/cassettes` | Snapshot directory |

---

## Getting Help

1. **Check logs:** `traceforge-proxy` outputs request/response info
2. **Read failure messages:** They include next steps
3. **Review docs:** 
   - Quick Start: `examples/strict-ci-starter/README.md`
   - Failures: `examples/strict-ci-starter/STRICT_MODE_FAILURES.md`
   - CI Guide: `guides/CI_ENFORCEMENT.md`

---

## What Success Looks Like

**Week 1:**
- You record snapshots without thinking
- CI enforcement feels natural
- You understand failure messages

**Week 2:**
- You review cassette diffs in PRs
- You catch behavior changes early
- You start saying "Did you record the snapshot?"

**Week 4:**
- You can't imagine merging without snapshots
- You say "No live calls in CI"
- You advocate for this pattern

**That's unavoidability.**

---

## One Command Cheat Sheet

```bash
# Start proxy
traceforge-proxy

# Record
TRACEFORGE_VCR_MODE=record npm test

# Test
TRACEFORGE_VCR_MODE=replay npm test

# Commit
git add .ai-tests/cassettes/ && git commit -m "Add snapshots"

# CI enforces
# (automatically with TRACEFORGE_VCR_MODE=strict)
```

---

## For More Information

- **Full Docs:** [README.md](README.md)
- **Example Project:** [examples/strict-ci-starter/](examples/strict-ci-starter/)
- **CI Guide:** [guides/CI_ENFORCEMENT.md](guides/CI_ENFORCEMENT.md)

---

**Remember:** The goal isn't to use TraceForge.  
**The goal is:** No AI behavior reaches production without verified replay.

TraceForge just makes that unavoidable.
