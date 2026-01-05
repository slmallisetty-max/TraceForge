# TraceForge Comprehensive Testing Plan

**Date:** January 4, 2026  
**Goal:** Validate all existing features before next phase  
**Strategy:** Stop building, start testing everything

---

## Testing Philosophy

Per next-phase.md:

> "The only validation that matters now: Can a real team ship with this enabled for 30 days?"

We need to validate **enforcement**, not just features.

---

## Testing Categories

### 1. Unit Tests (Existing)

### 2. Integration Tests (Manual)

### 3. End-to-End Tests (Manual)

### 4. CI Enforcement Tests (Critical)

### 5. Provider Compatibility Tests

### 6. Performance/Load Tests

### 7. Security Tests

---

## 1. Unit Tests Status

### Existing Test Files

```
✅ packages/proxy/src/retention.test.ts
✅ packages/proxy/src/redaction.test.ts
✅ packages/proxy/src/storage-sqlite.test.ts
✅ packages/proxy/src/embeddings.test.ts
✅ packages/proxy/src/vcr.test.ts
✅ packages/shared/src/schema.test.ts
✅ packages/shared/src/risk-scoring.test.ts (605 lines!)
✅ packages/shared/src/policies.test.ts
✅ packages/shared/src/ci-gating.test.ts
✅ packages/cli/src/utils/assertions.test.ts
✅ packages/web/server/auth.test.ts
```

**Total:** 11 test files

### Run All Unit Tests

```bash
# Run all tests
pnpm test

# With coverage
pnpm test:coverage
```

**Action Items:**

- [ ] Run all unit tests and verify they pass
- [ ] Check test coverage percentage
- [ ] Add missing tests for new features:
  - [ ] Strict CI mode (vcr.test.ts)
  - [ ] StorageManager (storage-manager.test.ts)
  - [ ] Logger (logger.test.ts)

---

## 2. Integration Tests (Manual)

### Test: Complete Workflow - Record to Replay

**Setup:**

```bash
# Start TraceForge
pnpm dev
```

**Test Steps:**

#### Step 1: Intercept Live Calls

```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=<your-key>
export TRACEFORGE_VCR_MODE=off

# Run simple OpenAI call
node -e "
const { OpenAI } = require('openai');
const client = new OpenAI();
client.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{role: 'user', content: 'Say hello'}]
}).then(r => console.log(r.choices[0].message.content));
"
```

**Expected:** Response logged, trace created

#### Step 2: Record Execution Snapshot

```bash
export TRACEFORGE_VCR_MODE=record

# Run again
node test-script.js
```

**Expected:**

- Cassette created in `.ai-tests/cassettes/openai/`
- Contains request + response + signature

#### Step 3: Replay Without API Key

```bash
export TRACEFORGE_VCR_MODE=replay
unset OPENAI_API_KEY  # Remove real key

# Run again
node test-script.js
```

**Expected:**

- Same response
- No live API call
- Works without API key

#### Step 4: Test Strict Mode (Missing Cassette)

```bash
rm -rf .ai-tests/cassettes/
export TRACEFORGE_VCR_MODE=strict

# Run again
node test-script.js
```

**Expected:**

- Script fails with exit code 1
- Error: "STRICT CI MODE: Missing execution snapshot"
- Clear instructions for recording

#### Step 5: Test Strict Mode (No Recording)

```bash
export TRACEFORGE_VCR_MODE=strict

# Try to record (should fail)
# This requires modifying VCR to attempt recording
```

**Expected:**

- Recording attempt fails
- Error: "STRICT CI MODE: Recording is forbidden"

---

## 3. Provider Compatibility Tests

### Test Matrix

| Provider      | Record | Replay | Streaming | Cassette Signature |
| ------------- | ------ | ------ | --------- | ------------------ |
| OpenAI        | ⬜     | ⬜     | ⬜        | ⬜                 |
| Anthropic     | ⬜     | ⬜     | ⬜        | ⬜                 |
| Google Gemini | ⬜     | ⬜     | ⬜        | ⬜                 |
| Ollama        | ⬜     | ⬜     | ⬜        | ⬜                 |

### OpenAI Tests

```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=<key>

# Test 1: Simple completion
node test-openai-simple.js

# Test 2: Streaming
node test-openai-streaming.js

# Test 3: Function calling
node test-openai-functions.js

# Test 4: Different models
# - gpt-3.5-turbo
# - gpt-4
# - gpt-4-turbo
```

### Anthropic Tests

```bash
export ANTHROPIC_BASE_URL=http://localhost:8787/anthropic
export ANTHROPIC_API_KEY=<key>

# Test 1: Claude completion
node test-anthropic.js

# Test 2: Streaming
node test-anthropic-streaming.js
```

### Google Gemini Tests

```bash
export GEMINI_BASE_URL=http://localhost:8787/google
export GEMINI_API_KEY=<key>

# Test 1: Gemini completion
node test-gemini.js
```

### Ollama Tests

```bash
export OLLAMA_BASE_URL=http://localhost:8787/ollama

# Test 1: Local model (no API key needed)
node test-ollama.js
```

---

## 4. Assertion Types Tests

### All 11 Assertion Types

```bash
# Create test files for each assertion type
pnpm --filter @traceforge/cli start test create
```

Test each assertion:

#### Traditional Assertions

- [ ] **exact** - Exact string match
- [ ] **contains** - Substring match
- [ ] **regex** - Pattern match
- [ ] **fuzzy** - Similarity threshold
- [ ] **json_path** - JSON field extraction
- [ ] **latency** - Response time check
- [ ] **tokens** - Token count validation

#### Semantic Assertions (NEW)

- [ ] **semantic_similarity** - Meaning-based comparison
- [ ] **semantic_contains** - Concept presence
- [ ] **semantic_not_contains** - Concept absence
- [ ] **semantic_entailment** - Logical implication

### Test Commands

```bash
# Run test with each assertion type
TRACEFORGE_VCR_MODE=replay pnpm --filter @traceforge/cli start test run

# Check for:
# - Assertion passes when should
# - Assertion fails when should
# - Clear error messages
```

---

## 5. CLI Commands Tests

### Trace Commands

```bash
# List traces
pnpm --filter @traceforge/cli start trace list

# Show trace
pnpm --filter @traceforge/cli start trace show <id>

# Compare traces
pnpm --filter @traceforge/cli start trace compare <id1> <id2>

# Delete trace
pnpm --filter @traceforge/cli start trace delete <id>
```

### Test Commands

```bash
# Create test from trace
pnpm --filter @traceforge/cli start test create-from-trace <id>

# List tests
pnpm --filter @traceforge/cli start test list

# Run tests
pnpm --filter @traceforge/cli start test run

# Run single test
pnpm --filter @traceforge/cli start test run --test test-name.yaml

# Parallel execution
pnpm --filter @traceforge/cli start test run --parallel 4

# Watch mode
pnpm --filter @traceforge/cli start test run --watch

# JUnit output
pnpm --filter @traceforge/cli start test run --junit

# CI gating
pnpm --filter @traceforge/cli start test run --gate
```

### VCR Commands

```bash
# Check status
pnpm --filter @traceforge/cli start vcr status

# Clean cassettes
pnpm --filter @traceforge/cli start vcr clean --yes
```

### Config Commands

```bash
# Show config
pnpm --filter @traceforge/cli start config show

# Set values
pnpm --filter @traceforge/cli start config set storage.backend sqlite
```

---

## 6. Web UI Tests (Manual)

### Pages to Test

#### Home/Timeline Page (/)

- [ ] Trace list loads
- [ ] Auto-refresh every 5 seconds
- [ ] Filtering by status
- [ ] Search functionality
- [ ] Pagination
- [ ] Click trace opens detail

#### Trace Detail Page (/trace/:id)

- [ ] Full request/response display
- [ ] Metadata display
- [ ] "Save as Test" button works
- [ ] "Compare" button available

#### Compare Page (/compare/:id1/:id2)

- [ ] Side-by-side diff view
- [ ] Syntax highlighting
- [ ] Similarity score
- [ ] Added/removed/changed indicators

#### Dashboard Page (/dashboard)

- [ ] 6 metrics display correctly
- [ ] Timeline chart
- [ ] Model distribution chart
- [ ] Token usage chart
- [ ] Latency chart
- [ ] Success rate chart

#### Config Page (/config)

- [ ] Current config displays
- [ ] Edit mode works
- [ ] Validation errors shown
- [ ] Save functionality

#### Tests Page (/tests)

- [ ] Test list
- [ ] Run all tests
- [ ] View test results
- [ ] Delete tests

---

## 7. Storage Backend Tests

### File Storage

```bash
export TRACEFORGE_STORAGE_BACKEND=file

# Test operations
pnpm --filter @traceforge/cli start trace list
```

**Verify:**

- [ ] Traces saved to filesystem
- [ ] Atomic writes working
- [ ] No race conditions

### SQLite Storage

```bash
export TRACEFORGE_STORAGE_BACKEND=sqlite

# Test operations
pnpm --filter @traceforge/cli start trace list
```

**Verify:**

- [ ] Database created
- [ ] Schema migrations work
- [ ] Queries efficient
- [ ] Concurrent access safe

### Storage Manager (Fallback)

```bash
export TRACEFORGE_STORAGE_BACKEND=sqlite
export TRACEFORGE_STORAGE_FALLBACK=true

# Simulate SQLite failure
# Test falls back to file storage
```

**Verify:**

- [ ] Automatic failover
- [ ] Retry logic
- [ ] Metrics collected

---

## 8. Security Tests

### Authentication

```bash
# Start web server
pnpm --filter @traceforge/web start

# Test without credentials
curl http://localhost:3001/api/traces
# Expected: 401 Unauthorized

# Test with valid credentials
export TRACEFORGE_USERNAME=admin
export TRACEFORGE_PASSWORD=secret
# Expected: 200 OK
```

### Rate Limiting

```bash
# Send 101 requests in 1 minute
for i in {1..101}; do
  curl http://localhost:3001/api/traces &
done
wait

# Expected: 101st request gets 429 Rate Limit Exceeded
```

### Redaction

```bash
# Create trace with sensitive data
# Check that PII is redacted

# Test patterns:
# - Email addresses
# - API keys
# - Credit cards
# - SSNs
```

### VCR Signature Verification

```bash
# Create cassette
TRACEFORGE_VCR_MODE=record node test.js

# Modify cassette file manually
# Change response content

# Try to replay
TRACEFORGE_VCR_MODE=replay node test.js

# Expected: Signature verification fails
```

---

## 9. Performance/Load Tests

### High-Throughput Traces

```bash
# Generate 1000 traces quickly
for i in {1..1000}; do
  node generate-trace.js &
done
wait

# Verify:
# - All traces captured
# - No data loss
# - Storage remains consistent
```

### Concurrent VCR Requests

```bash
# Multiple processes recording simultaneously
for i in {1..10}; do
  TRACEFORGE_VCR_MODE=record node test.js &
done
wait

# Verify:
# - All cassettes saved
# - No file corruption
# - Atomic writes work
```

### Large Response Bodies

```bash
# Test with 10MB+ responses
# Check memory usage
# Check performance
```

---

## 10. CI Enforcement End-to-End Test

This is the **MOST IMPORTANT** test.

### Setup GitHub Actions Test Repo

```yaml
# .github/workflows/test.yml
name: Test TraceForge Strict Mode

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install
        run: npm install

      - name: Test WITHOUT Snapshots (should fail)
        continue-on-error: true
        env:
          TRACEFORGE_VCR_MODE: strict
        run: npm test
        id: test_no_snapshots

      - name: Verify Failure
        if: steps.test_no_snapshots.outcome == 'success'
        run: exit 1 # Should have failed

      - name: Record Snapshots
        env:
          TRACEFORGE_VCR_MODE: record
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm test

      - name: Test WITH Snapshots (should pass)
        env:
          TRACEFORGE_VCR_MODE: strict
        run: npm test
```

### Test Scenarios

1. **Scenario 1: Missing Snapshots**

   - PR without committed cassettes
   - Expected: Build fails with clear error

2. **Scenario 2: Changed Output**

   - Modify cassette response
   - Expected: Test fails with diff

3. **Scenario 3: New Test**

   - Add new test without snapshot
   - Expected: Build fails

4. **Scenario 4: Valid Snapshot Update**
   - Delete old cassette
   - Record new one
   - Commit
   - Expected: Build passes

---

## 11. Migration Tests

### Test Schema Migrations

```bash
# Create old-format trace
# Run migration
# Verify upgrade works
# Verify downgrade works
```

---

## 12. Error Handling Tests

### Network Errors

- [ ] API timeout
- [ ] Connection refused
- [ ] DNS failure

### File System Errors

- [ ] Disk full
- [ ] Permission denied
- [ ] Path doesn't exist

### Invalid Input

- [ ] Malformed JSON
- [ ] Invalid API response
- [ ] Corrupted cassette

---

## Testing Checklist

### Pre-Testing

- [ ] All packages build successfully
- [ ] All existing unit tests pass
- [ ] Documentation is up to date

### Unit Testing

- [ ] Run `pnpm test`
- [ ] Check coverage > 80%
- [ ] Add tests for new strict mode

### Integration Testing

- [ ] Test all VCR modes
- [ ] Test all providers
- [ ] Test all assertion types
- [ ] Test CLI commands

### End-to-End Testing

- [ ] Complete workflow (Record → Commit → CI → Replay)
- [ ] Strict CI mode in real GitHub Actions
- [ ] Snapshot update workflow
- [ ] PR review workflow

### Performance Testing

- [ ] 1000+ traces
- [ ] Concurrent operations
- [ ] Large payloads

### Security Testing

- [ ] Authentication
- [ ] Rate limiting
- [ ] Signature verification
- [ ] Redaction

---

## Test Execution Order

### Phase 1: Validation (Days 1-2)

1. ✅ Run all existing unit tests
2. ✅ Fix any broken tests
3. ✅ Add missing unit tests

### Phase 2: Integration (Days 3-4)

4. Test VCR modes (off, record, replay, auto, strict)
5. Test each provider (OpenAI, Anthropic, Google, Ollama)
6. Test all assertion types

### Phase 3: End-to-End (Days 5-6)

7. Complete workflow test
8. Strict CI mode test in real GitHub Actions
9. Snapshot update workflow

### Phase 4: Edge Cases (Day 7)

10. Error handling
11. Performance tests
12. Security tests

---

## Success Criteria

### Must Pass Before Next Phase

- [ ] All unit tests pass
- [ ] All 4 VCR modes work correctly
- [ ] Strict CI mode fails on missing snapshots
- [ ] Strict CI mode forbids recording
- [ ] At least 2 providers tested end-to-end
- [ ] All 11 assertion types work
- [ ] CLI commands don't crash
- [ ] Web UI loads and displays data
- [ ] Storage backends work
- [ ] Rate limiting prevents abuse
- [ ] Authentication required
- [ ] VCR signatures verified

### Documentation Must Be Complete

- [ ] All features documented
- [ ] CI setup guide tested
- [ ] Troubleshooting guide updated
- [ ] Quick reference accurate

---

## Issue Tracking

As we test, document issues in this format:

```markdown
### Issue #1: VCR Strict Mode - Recording Not Blocked

**Severity:** Critical
**Component:** VCR Layer
**Description:** Strict mode should forbid recording but doesn't
**Steps to Reproduce:**

1. Set TRACEFORGE_VCR_MODE=strict
2. Run test that would record
3. Recording succeeds (should fail)

**Expected:** Error thrown
**Actual:** Recording works
**Fix:** Add check in record() method
```

---

## Timeline

**Week 1 (Days 1-7):** Complete all testing phases
**Day 8:** Fix critical issues
**Day 9:** Retest fixes
**Day 10:** Final validation

**Goal:** 100% confidence before engaging real users (per next-phase.md)

---

## Next Steps After Testing

Once testing is complete and all issues fixed:

1. Create "Strict CI Starter" example repo
2. Identify 3-5 serious backend engineers
3. Help them integrate TraceForge
4. Watch them use it for 30 days
5. Fix only friction that blocks enforcement

**Remember:** We're not building features. We're validating enforcement.
