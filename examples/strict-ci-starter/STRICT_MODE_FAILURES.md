# Strict CI Mode - Failure Examples

## Scenario 1: Missing Snapshot

When someone makes an AI code change but forgets to record snapshots:

```
npm test

Running tests...

❌ Error: STRICT CI MODE: Missing execution snapshot for OpenAI request.

Build details:
  Signature: e7a9f8d2c1b6e3a4
  Provider: openai
  Model: gpt-4o-mini
  
STRICT MODE ENFORCEMENT:
  ❌ Live API calls are FORBIDDEN in CI
  ❌ Recording is FORBIDDEN in CI
  ❌ Missing cassette = hard failure

What happened:
  Your code tried to call OpenAI API with a new request pattern.
  No execution snapshot was found for this request.
  In strict mode, this is a build failure.

How to fix:
  1. Run locally: TRACEFORGE_VCR_MODE=record npm test
  2. Commit snapshot: git add .ai-tests/cassettes/
  3. Push: git push

Build failed at 2025-01-01T12:34:56Z
Exit code: 1
```

**Why this matters:**
- You cannot merge without snapshots
- Forcing you to run tests locally first
- Preventing surprise API calls in CI

---

## Scenario 2: Changed AI Output

When AI response changes (intentionally or not):

```
npm test

Running tests...

Test: should summarize text in one sentence
  Status: FAILED

Expected output (from snapshot):
  "TraceForge is an execution record and replay layer for AI systems that 
   captures executions as deterministic snapshots, enables replay without 
   live API calls, and enforces reproducibility in CI to require explicit 
   review of AI behavior changes."

Actual output (current test):
  "TraceForge records AI executions, replays them deterministically, and 
   enforces CI validation without live API usage."

Difference:
  - The output is shorter
  - Removed details about "explicit review requirement"
  - Changed phrasing from "record and replay layer" to "records AI executions"

Snapshot location:
  .ai-tests/cassettes/openai/e7a9f8d2c1b6e3a4.json

What to do:
  ✅ If change is INTENTIONAL:
     1. Review the new output
     2. Update snapshot: TRACEFORGE_VCR_MODE=record npm test
     3. Commit with explanation: git commit -m "Update AI output: simplified language"
  
  ❌ If change is UNINTENTIONAL:
     1. Fix your code/prompt
     2. Revert changes
     3. Run tests again

Build failed at 2025-01-01T12:35:22Z
Exit code: 1
```

**Why this matters:**
- Every AI behavior change becomes visible
- Forces explicit decision: keep old or approve new
- PR reviewers see exactly what changed in AI output

---

## Scenario 3: Corrupted Snapshot

When cassette file is manually edited or corrupted:

```
npm test

Running tests...

❌ Error: Cassette signature mismatch

Expected signature: e7a9f8d2c1b6e3a4
Actual signature:   f8b0e9d3c2a7d4b5

The cassette file may have been modified or corrupted.

File: .ai-tests/cassettes/openai/e7a9f8d2c1b6e3a4.json

Security details:
  - Cassettes are integrity-checked with SHA-256 signatures
  - Any modification invalidates the signature
  - This prevents snapshot tampering

How to fix:
  1. Delete corrupted snapshot: rm .ai-tests/cassettes/openai/e7a9f8d2c1b6e3a4.json
  2. Record fresh snapshot: TRACEFORGE_VCR_MODE=record npm test
  3. Commit new snapshot: git add .ai-tests/cassettes/ && git commit

Build failed at 2025-01-01T12:36:10Z
Exit code: 1
```

**Why this matters:**
- Prevents snapshot tampering
- Ensures cassettes accurately represent real API responses
- Forces re-recording if file is corrupted

---

## What Strict Mode Prevents

### ❌ Prevented: Silent AI Regressions

**Without TraceForge:**
```
✅ Build passed
   (but AI output changed and nobody noticed)
   
💥 Production incident:
   AI started giving different responses
   No record of when it changed
   No way to reproduce the issue
```

**With TraceForge Strict Mode:**
```
❌ Build failed: AI output changed

Reviewer sees exact diff:
  - Old: "Send confirmation email"
  - New: "Skip confirmation email"
  
PR comment: "Why is this changing?"
Engineer: "Oh! That's a bug, reverting."

Crisis averted.
```

### ❌ Prevented: Unreviewed Behavior Changes

**Without TraceForge:**
```
PR Review:
  Reviewer: "Code looks good, LGTM"
  (Doesn't realize prompt change affects 1000s of users)
  
Merge → Deploy → Surprise
```

**With TraceForge Strict Mode:**
```
PR Review:
  GitHub shows: .ai-tests/cassettes/openai/abc123.json changed
  Reviewer: "What's the behavior change here?"
  Engineer: "Changed prompt to be more concise"
  Reviewer: "Let's test this with real users first"
  
Decision made explicitly.
```

### ❌ Prevented: CI API Cost Explosion

**Without TraceForge:**
```
500 test runs/day × $0.002/test = $1000/month
Plus: Rate limits, flakiness, timeouts
```

**With TraceForge Strict Mode:**
```
CI replays from snapshots = $0/month
No rate limits
No flakiness
Instant results
```

---

## The Enforcement Contract

When you enable strict mode in CI:

```yaml
env:
  TRACEFORGE_VCR_MODE: strict
```

You are making this commitment:

> "Every AI execution in this repository has been recorded,  
> reviewed, and explicitly approved through version control."

**This is not optional.**  
**This is not a warning.**  
**This is a build gate.**

If the snapshot doesn't exist → **Build fails.**  
If the output changes → **Build fails.**  
If the signature is wrong → **Build fails.**

No bypass. No escape hatch. No "merge anyway."

---

## For Reviewers

When you see `.ai-tests/cassettes/` changes in a PR:

### ✅ Good Questions to Ask:

1. **"What behavior is changing?"**
   - Look at the response content in the cassette
   - Compare to previous version if updated

2. **"Why is this change necessary?"**
   - Is it a bug fix?
   - Is it a feature improvement?
   - Is it unintentional?

3. **"What's the blast radius?"**
   - How many users will see this?
   - What's the risk of getting it wrong?

4. **"Should we test this first?"**
   - Can we validate with real users before merging?
   - Do we need A/B testing?

### ❌ Bad Review Behavior:

1. **"Cassette changes, auto-approve"**
   - Don't rubber-stamp AI changes
   - These are behavior changes, not code style

2. **"I don't understand cassettes, LGTM"**
   - Learn to read cassette diffs
   - They're just JSON request/response pairs

3. **"Tests pass, ship it"**
   - Tests pass = snapshot matches
   - Doesn't mean the change is good

---

## Success Looks Like

**After 30 days:**

Your team naturally says:

> "Did you record the snapshot?"  
> "Show me the cassette diff"  
> "This AI change needs review"

Not:

> "Did you run the linter?"  
> "Does it compile?"  
> "Did you write tests?"

**When AI behavior changes become as visible as code changes,  
you've reached unavoidability.**

---

## Related Documents

- [CI Enforcement Guide](../../guides/CI_ENFORCEMENT.md)
- [VCR Quick Reference](../../guides/VCR_QUICK_REFERENCE.md)
- [Strict Mode Implementation](../../packages/proxy/src/vcr.ts)
