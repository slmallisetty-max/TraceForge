# CI Enforcement Guide

## The Guarantee

**"No AI behavior change reaches production without a recorded execution and verified replay."**

This document explains how to make TraceForge **unavoidable** in your development workflow.

---

## Why Strict Mode Exists

### The Problem with Optional Tools

Most testing tools are **optional confidence** providers:

- ✅ Run tests → Feel confident
- ❌ Skip tests → Move fast

This makes them easy to bypass.

### The Solution: Mandatory Correctness

TraceForge's **strict CI mode** provides a **non-negotiable guarantee**:

- ✅ Missing execution snapshot → **Build fails**
- ✅ Changed AI output → **Explicit diff required**
- ✅ Unverified execution → **Cannot merge**

This is how:

- Jest snapshots
- Database migrations
- TypeScript strict mode

became unavoidable.

---

## How Strict Mode Works

### Local Development

**Developer workflow (flexible):**

```bash
# 1. Develop with live AI calls
export TRACEFORGE_VCR_MODE=off
npm run dev

# 2. Record execution snapshots
export TRACEFORGE_VCR_MODE=record
npm test

# 3. Verify locally (optional)
export TRACEFORGE_VCR_MODE=replay
npm test

# 4. Commit snapshots
git add .ai-tests/cassettes/
git commit -m "Add execution snapshots for feature X"
```

### CI Environment

**CI workflow (enforced):**

```bash
# Hard fail mode - no live calls allowed
export TRACEFORGE_VCR_MODE=strict
npm test  # ← Exits 1 if ANY snapshot missing/changed
```

### What Happens in Strict Mode

#### 1. Live API Calls Are Forbidden

```typescript
// In strict mode, this throws:
await openai.chat.completions.create({...})

// Error message:
// STRICT CI MODE: Missing execution snapshot for openai request.
// Build failed. Signature: abc123def456.
// Record snapshots locally with TRACEFORGE_VCR_MODE=record before committing.
```

#### 2. Recording Is Forbidden

```typescript
// In strict mode, attempting to record throws:

// Error message:
// STRICT CI MODE: Recording is forbidden.
// Execution snapshots must be created locally and committed to version control.
// Set TRACEFORGE_VCR_MODE=record locally to create snapshots.
```

#### 3. Missing Snapshots Fail the Build

```bash
$ npm test
✗ test-1: Missing execution snapshot
✗ test-2: Missing execution snapshot

Exit code: 1  # ← Build fails
```

#### 4. Changed Outputs Produce Explicit Diffs

```bash
$ npm test
✓ test-1: Passed
✗ test-2: Output changed

Expected (snapshot):
{
  "message": "Hello, world!"
}

Actual (current):
{
  "message": "Hello, user!"
}

Exit code: 1  # ← Build fails
```

---

## CI/CD Integration Examples

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: AI Execution Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Verify AI Executions (Strict Mode)
        env:
          TRACEFORGE_VCR_MODE: strict
        run: npx pnpm --filter @traceforge/cli start test run

      - name: Upload snapshot diffs (on failure)
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: snapshot-diffs
          path: .ai-tests/diffs/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
verify_executions:
  stage: test
  script:
    - npm install
    - export TRACEFORGE_VCR_MODE=strict
    - npx pnpm --filter @traceforge/cli start test run
  artifacts:
    when: on_failure
    paths:
      - .ai-tests/diffs/
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
  agent any

  environment {
    TRACEFORGE_VCR_MODE = 'strict'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm install'
      }
    }

    stage('Verify Executions') {
      steps {
        sh 'npx pnpm --filter @traceforge/cli start test run'
      }
    }
  }

  post {
    failure {
      archiveArtifacts artifacts: '.ai-tests/diffs/**', allowEmptyArchive: true
    }
  }
}
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  verify:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install Dependencies
          command: npm install
      - run:
          name: Verify AI Executions
          command: |
            export TRACEFORGE_VCR_MODE=strict
            npx pnpm --filter @traceforge/cli start test run
      - store_artifacts:
          path: .ai-tests/diffs
          destination: snapshot-diffs
          when: on_fail

workflows:
  version: 2
  test:
    jobs:
      - verify
```

---

## Snapshot Management

### What Gets Committed

```bash
.ai-tests/
├── cassettes/           # Execution snapshots
│   ├── openai/
│   │   ├── abc123.json  # Request signature → Response
│   │   └── def456.json
│   └── anthropic/
│       └── ghi789.json
└── tests/               # Verification rules
    ├── test-1.yaml
    └── test-2.yaml
```

**Always commit:**

- ✅ `.ai-tests/cassettes/` - Execution snapshots
- ✅ `.ai-tests/tests/` - Verification rules

**Never commit:**

- ❌ `.ai-tests/traces/` - Raw execution logs (local only)
- ❌ `.ai-tests/diffs/` - Temporary diff output

### Updating Snapshots

When AI output **intentionally** changes:

```bash
# 1. Delete old snapshot
rm .ai-tests/cassettes/openai/abc123.json

# 2. Record new snapshot
TRACEFORGE_VCR_MODE=record npm test

# 3. Commit with clear message
git add .ai-tests/cassettes/
git commit -m "Update snapshot: AI now includes user name in greeting"

# 4. PR description should explain the behavior change
```

### Reviewing Snapshot Changes

**In pull request reviews:**

```diff
# .ai-tests/cassettes/openai/abc123.json
{
  "request": {...},
  "response": {
    "body": {
      "choices": [{
        "message": {
-         "content": "Hello, world!"
+         "content": "Hello, John!"
        }
      }]
    }
  }
}
```

**Reviewer checklist:**

- ✅ Is this behavior change intentional?
- ✅ Does it match the feature requirements?
- ✅ Are all affected snapshots updated?
- ✅ Are verification rules still valid?

---

## Snapshot Diffs as PR Artifacts

### Automatic Diff Generation

Configure CI to generate human-readable diffs:

```yaml
# .github/workflows/ci.yml
- name: Generate snapshot diffs
  if: failure()
  run: |
    npx pnpm --filter @traceforge/cli start test run --json > test-results.json
    npx pnpm --filter @traceforge/cli start diff --format markdown > snapshot-diff.md

- name: Comment PR with diff
  if: failure()
  uses: actions/github-script@v6
  with:
    script: |
      const fs = require('fs');
      const diff = fs.readFileSync('snapshot-diff.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## ⚠️ Execution Snapshot Changes Detected\n\n${diff}`
      });
```

### Diff Output Example

````markdown
## Execution Snapshot Changes

### test-greeting: Output changed

**Expected (snapshot):**

```json
{
  "message": "Hello, world!"
}
```
````

**Actual (current):**

```json
{
  "message": "Hello, John!"
}
```

**Recommendation:**
If this change is intentional, update the snapshot with:

```bash
TRACEFORGE_VCR_MODE=record npm test
git add .ai-tests/cassettes/
git commit -m "Update greeting snapshot to include user name"
```

````

---

## Enforcement Strategies

### Strategy 1: Soft Enforcement (Warnings)

**Good for adoption phase:**

```yaml
# Allow failures but report
- name: Verify Executions
  continue-on-error: true
  env:
    TRACEFORGE_VCR_MODE: strict
  run: npm test
````

### Strategy 2: Hard Enforcement (Required)

**Production-ready:**

```yaml
# Build fails if snapshots missing/changed
- name: Verify Executions
  env:
    TRACEFORGE_VCR_MODE: strict
  run: npm test
```

### Strategy 3: Protected Branches

**GitHub branch protection:**

1. Settings → Branches → Add rule
2. Require status checks: ✅ `verify_executions`
3. Cannot merge unless all snapshots verified

---

## Developer Experience

### What Changes Psychologically

**Before TraceForge:**

> "Should we test this AI feature?"
> _(Optional, easy to skip)_

**After TraceForge:**

> "How do I update the execution snapshot?"
> _(Mandatory, must engage)_

### The Shift

- ❌ Testing is **optional confidence**
- ✅ Snapshots are **version control**

Removing snapshots means losing **institutional memory** of AI behavior.

---

## Troubleshooting

### "Build failing in CI but passes locally"

**Cause:** Snapshot exists locally but not committed.

**Fix:**

```bash
git add .ai-tests/cassettes/
git commit -m "Add missing snapshots"
```

### "Too many snapshot updates"

**Cause:** Non-deterministic AI responses (temperature > 0).

**Fix:**

```yaml
# test.yaml
request:
  temperature: 0 # Deterministic
```

### "Snapshot signature mismatch"

**Cause:** Cassette file modified or corrupted.

**Fix:**

```bash
# Re-record the snapshot
rm .ai-tests/cassettes/openai/abc123.json
TRACEFORGE_VCR_MODE=record npm test
```

### "CI slow due to many snapshots"

**Optimization:**

- Use `--bail` to fail fast
- Run verification in parallel
- Cache `.ai-tests/` directory

```yaml
- name: Cache snapshots
  uses: actions/cache@v3
  with:
    path: .ai-tests/cassettes
    key: snapshots-${{ hashFiles('.ai-tests/cassettes/**') }}
```

---

## Migration Strategy

### Phase 1: Observation (Week 1)

- Install TraceForge
- Record snapshots locally
- No CI enforcement yet
- **Goal:** Developers familiar with workflow

### Phase 2: Soft Enforcement (Week 2-3)

- Add CI job with `continue-on-error: true`
- Report failures but don't block merges
- **Goal:** Identify missing snapshots

### Phase 3: Hard Enforcement (Week 4+)

- Remove `continue-on-error`
- Require status check in branch protection
- **Goal:** Full enforcement, snapshots mandatory

---

## Success Metrics

### Before Enforcement

- 🔴 AI behavior changes deployed without review
- 🔴 Regressions discovered in production
- 🔴 No audit trail for AI decisions

### After Enforcement

- ✅ Every AI behavior change reviewed
- ✅ Regressions caught before merge
- ✅ Complete audit trail in git history

---

## Summary

**TraceForge becomes unavoidable by:**

1. **Owning one guarantee:** No unverified AI behavior in production
2. **Failing builds:** Missing snapshots = cannot merge
3. **Creating institutional memory:** Snapshots = version control for AI

This is not a testing tool.
This is an **execution control layer**.

---

## Next Steps

1. [Set up strict mode in CI](./CI_ENFORCEMENT.md#cicd-integration-examples)
2. [Configure branch protection](./CI_ENFORCEMENT.md#strategy-3-protected-branches)
3. [Train team on snapshot workflow](./CI_ENFORCEMENT.md#snapshot-management)

**The goal:** Make removing TraceForge more painful than using it.
