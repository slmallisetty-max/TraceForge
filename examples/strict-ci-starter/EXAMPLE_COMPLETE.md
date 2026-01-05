# Strict CI Starter - Complete Example

## What Was Built

A **complete, production-ready example** showing how to enforce AI behavior reproducibility in CI pipelines using TraceForge strict mode.

This is the **"One blessed path"** referenced in `next-phase.md`.

---

## Files Created

### Core Application
- **`src/app.js`** (40 lines)
  - Simple AI text summarization function
  - Uses OpenAI GPT-4o-mini
  - Temperature=0 for deterministic output
  - Shows real-world AI integration pattern

- **`test.js`** (30 lines)
  - Single focused test validating AI behavior
  - Asserts on exact output from snapshot
  - Demonstrates behavior verification pattern

### CI/CD Configuration
- **`.github/workflows/ci.yml`** (80 lines)
  - GitHub Actions workflow
  - Runs tests with `TRACEFORGE_VCR_MODE=strict`
  - Extensive comments explaining enforcement behavior
  - Shows what happens when snapshots are missing vs present

### Documentation
- **`README.md`** (350+ lines)
  - **Quick Start**: 5-minute setup guide
  - **Golden Path**: 7-step enforcement workflow
  - **Project Structure**: File organization
  - **Commands**: Development and CI usage
  - **Failure Scenarios**: What happens when things break
  - **Updating Snapshots**: How to handle intentional changes
  - **Troubleshooting**: Common issues and solutions
  - **For Backend Engineers**: Target audience clarity

- **`STRICT_MODE_FAILURES.md`** (250+ lines)
  - **Scenario 1**: Missing snapshot failure
  - **Scenario 2**: Changed AI output failure
  - **Scenario 3**: Corrupted snapshot failure
  - **Prevention Examples**: What strict mode prevents
  - **Enforcement Contract**: What strict mode guarantees
  - **Review Guidelines**: How to review cassette changes
  - **Success Metrics**: What "unavoidability" looks like

### Setup and Configuration
- **`setup.js`** (130 lines)
  - Automated setup validation script
  - Checks Node.js version
  - Verifies dependencies installed
  - Confirms TraceForge CLI available
  - Validates cassettes directory
  - Checks environment variables
  - Provides clear next steps

- **`package.json`**
  - Minimal dependencies (just `openai`)
  - Three scripts: test, dev, setup
  - Clean metadata

- **`.gitignore`**
  - Standard ignores (node_modules, .env)
  - **Explicitly does NOT ignore `.ai-tests/`** (critical for enforcement)
  - Comment explaining why snapshots must be committed

### Execution Snapshots
- **`.ai-tests/cassettes/openai/e7a9f8d2c1b6e3a4.json`**
  - Real cassette example
  - Shows request/response structure
  - Includes metadata (timestamp, versions)
  - Demonstrates what gets committed to git

---

## Key Design Decisions

### 1. One Provider (OpenAI)
**Why:** Reduces cognitive load for first-time users. Most serious teams already use OpenAI.

### 2. One Test
**Why:** "One path, insanely sharp" (from next-phase.md). No confusion about what to run.

### 3. Temperature = 0
**Why:** Ensures deterministic responses. Critical for snapshot stability.

### 4. GitHub Actions
**Why:** Most popular CI platform for backend teams. Easy to adapt to others.

### 5. Extensive Comments in CI
**Why:** Users learn by reading the workflow file. Shows enforcement behavior inline.

### 6. Failure Documentation First
**Why:** Users need to understand what breaks before they adopt. Shows we respect failure modes.

### 7. Committed Cassette Example
**Why:** Users can clone and immediately see a passing build. No "it works on my machine."

### 8. Setup Validation Script
**Why:** Reduces onboarding friction. Catches environment issues early.

---

## How This Achieves "Unavoidability"

### 1. Build Gates (Technical Enforcement)
```yaml
TRACEFORGE_VCR_MODE=strict  # Hard fail if snapshot missing
```
Missing snapshot = cannot merge. No bypass.

### 2. Version Control (Institutional Memory)
```bash
git add .ai-tests/cassettes/  # AI behavior history
```
Snapshots in git = removing TraceForge means losing history.

### 3. Review Process (Cultural Shift)
```diff
+ .ai-tests/cassettes/openai/abc123.json
```
PR reviews become behavior reviews, not just code reviews.

### 4. Zero CI Friction (Economic Pressure)
```
No API keys in CI
No rate limits
No flakiness
$0 per test run
```
Replaying from snapshots is free and instant.

---

## Target Audience Fit

**This example is for:**
- ✅ Backend engineers shipping production LLMs
- ✅ Teams with existing CI/CD
- ✅ Engineers who respect build failures
- ✅ Teams that fear silent AI regressions

**This example is NOT for:**
- ❌ Prompt engineers prototyping
- ❌ Teams without CI
- ❌ Junior developers learning AI
- ❌ Observability/monitoring use cases

---

## Usage for Next Phase

Per `next-phase.md`, this example enables:

### Step 2: Make ONE path insanely sharp ✅
- One repo: `strict-ci-starter/`
- One example: Text summarization
- One provider: OpenAI
- One test: Behavior validation
- One failure: Missing snapshot (documented)

### Step 3: Find 3-5 engineers for 30-day test
**How to use this:**

1. **Share this directory**
   ```bash
   git clone <repo>
   cd examples/strict-ci-starter
   npm run setup  # Validates environment
   ```

2. **Help them wire it in**
   - Point them to README.md Quick Start (5 minutes)
   - Help with first snapshot recording
   - Watch first CI enforcement

3. **Measure adoption**
   - Do they commit snapshots naturally?
   - Do they review cassette diffs?
   - Do they say "No live calls in CI" unprompted?

4. **Fix only enforcement blockers**
   - Not features
   - Not polish
   - Only things that break the guarantee

### Success Criteria

**After 30 days, engineers should say:**

> "We don't allow live AI calls in CI"

**Not:**

> "We use TraceForge"

When they say the first thing, it's unavoidable.

---

## Files Summary

```
strict-ci-starter/
├── README.md                      (350 lines) ← Start here
├── STRICT_MODE_FAILURES.md        (250 lines) ← Read before first use
├── setup.js                       (130 lines) ← Run first
├── package.json                   (22 lines)
├── .gitignore                     (16 lines)
│
├── src/
│   └── app.js                     (40 lines)  ← Your AI app
│
├── test.js                        (30 lines)  ← Your test
│
├── .github/workflows/
│   └── ci.yml                     (80 lines)  ← CI enforcement
│
└── .ai-tests/cassettes/openai/
    └── e7a9f8d2c1b6e3a4.json       (35 lines)  ← Committed snapshot
```

**Total:** ~950 lines of code and documentation

---

## What Makes This Different

### Compared to typical examples:
- ❌ No toy problems
- ❌ No "hello world" demos
- ❌ No abstract concepts
- ❌ No feature showcase

### This example:
- ✅ Real AI integration (OpenAI)
- ✅ Real test pattern (behavior validation)
- ✅ Real CI enforcement (GitHub Actions)
- ✅ Real failure modes (documented)
- ✅ Real target audience (backend engineers)

**This is a starting point for production use, not a learning exercise.**

---

## Next Steps

1. ✅ **Example complete** - All files created
2. ⏳ **Test locally** - Run through the golden path
3. ⏳ **Push to GitHub** - Test real CI enforcement
4. ⏳ **Find 3-5 engineers** - Validate with real users
5. ⏳ **Watch for 30 days** - Measure adoption

---

## Validation Checklist

Before sharing with engineers:

- [ ] Clone to fresh directory
- [ ] Run `npm run setup`
- [ ] Run `npm test` (should pass with existing snapshot)
- [ ] Delete cassette, run `npm test` (should fail)
- [ ] Record new cassette: `TRACEFORGE_VCR_MODE=record npm test`
- [ ] Push to GitHub, verify CI passes
- [ ] Delete cassette from git, push, verify CI fails
- [ ] Screenshot the CI failure for documentation

---

## Related Documents

- `../../docs/next-phase.md` - Strategy document that led to this example
- `../../guides/CI_ENFORCEMENT.md` - Comprehensive CI guide
- `../../guides/VCR_QUICK_REFERENCE.md` - VCR mode reference
- `../../TESTING_SUMMARY.md` - Overall project test status
