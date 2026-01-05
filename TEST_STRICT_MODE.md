# Manual Test: VCR Strict CI Mode

**Test Goal:** Verify that strict CI mode actually enforces execution snapshots and fails builds.

**This is THE MOST IMPORTANT TEST** - it validates the unavoidability guarantee.

---

## Test Script

```javascript
// test-strict-mode.js
const https = require('https');

// Simple test that makes an API call
async function testOpenAI() {
  const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-key',
    }
  };

  const data = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say hello' }],
    temperature: 0,  // Deterministic
  });

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('✓ Response received');
        console.log(JSON.parse(body).choices[0].message.content);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

testOpenAI()
  .then(() => {
    console.log('✓ Test passed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('✗ Test failed:', err.message);
    process.exit(1);
  });
```

---

## Test Execution Plan

### Step 1: Start TraceForge

```bash
# Terminal 1: Start proxy
cd c:\repo\TraceForge.baseline
npx pnpm --filter @traceforge/proxy dev
```

### Step 2: Test VCR OFF Mode (Live Calls)

```bash
# Should make live API call
set TRACEFORGE_VCR_MODE=off
node test-strict-mode.js
```

**Expected Result:** ✓ Live call succeeds

---

### Step 3: Test VCR RECORD Mode

```bash
# Should record to cassette
set TRACEFORGE_VCR_MODE=record
set OPENAI_API_KEY=<your-real-key>
node test-strict-mode.js
```

**Expected Result:**
- ✓ Call succeeds
- ✓ Cassette created in `.ai-tests/cassettes/openai/<signature>.json`
- ✓ Contains full request/response
- ✓ Has HMAC signature

**Verify:**
```bash
dir .ai-tests\cassettes\openai
```

---

### Step 4: Test VCR REPLAY Mode (Without API Key)

```bash
# Should replay from cassette
set TRACEFORGE_VCR_MODE=replay
set OPENAI_API_KEY=
node test-strict-mode.js
```

**Expected Result:**
- ✓ Call succeeds (no live API)
- ✓ Same response as recorded
- ✓ No API key needed

---

### Step 5: Test VCR REPLAY Mode (Missing Cassette)

```bash
# Delete cassette and try replay
del .ai-tests\cassettes\openai\*.json
set TRACEFORGE_VCR_MODE=replay
node test-strict-mode.js
```

**Expected Result:**
- ✗ Call fails with error
- ✗ Error: "VCR replay miss: no cassette found"
- ✗ Exit code 1

---

### Step 6: **THE CRITICAL TEST - STRICT MODE (Missing Cassette)**

```bash
# Strict mode with no cassette
del .ai-tests\cassettes\openai\*.json
set TRACEFORGE_VCR_MODE=strict
node test-strict-mode.js
```

**Expected Result:**
- ✗ Call fails IMMEDIATELY
- ✗ Error: "STRICT CI MODE: Missing execution snapshot"
- ✗ Error: "Build failed"
- ✗ Error: "Record snapshots locally with TRACEFORGE_VCR_MODE=record"
- ✗ Exit code 1

**This is the enforcement behavior!**

---

### Step 7: STRICT MODE (With Cassette)

```bash
# Record first
set TRACEFORGE_VCR_MODE=record
set OPENAI_API_KEY=<your-real-key>
node test-strict-mode.js

# Then run in strict mode
set TRACEFORGE_VCR_MODE=strict
set OPENAI_API_KEY=
node test-strict-mode.js
```

**Expected Result:**
- ✓ Call succeeds from cassette
- ✓ No API key needed
- ✓ Deterministic response
- ✓ Exit code 0

---

### Step 8: STRICT MODE (Attempt to Record)

This test requires modifying VCR to attempt recording in strict mode.

**Expected Behavior:**
- ✗ Recording should be FORBIDDEN
- ✗ Error: "STRICT CI MODE: Recording is forbidden"
- ✗ Error: "Execution snapshots must be created locally"

---

## Test Matrix

| VCR Mode | API Key | Cassette Exists | Expected Result | Exit Code |
|----------|---------|-----------------|-----------------|-----------|
| `off` | Yes | N/A | ✓ Live call | 0 |
| `record` | Yes | N/A | ✓ Record + call | 0 |
| `replay` | No | Yes | ✓ From cassette | 0 |
| `replay` | No | No | ✗ Miss error | 1 |
| `auto` | Yes | No | ✓ Record | 0 |
| `auto` | No | Yes | ✓ Replay | 0 |
| **`strict`** | **No** | **Yes** | **✓ Replay** | **0** |
| **`strict`** | **No** | **No** | **✗ HARD FAIL** | **1** |
| **`strict`** | **Yes** | **No** | **✗ HARD FAIL** | **1** |

---

## Success Criteria

For TraceForge to be considered validated:

### Must Pass ✅
- [x] VCR OFF mode works (live calls)
- [ ] VCR RECORD mode creates cassettes
- [ ] VCR REPLAY mode uses cassettes
- [ ] VCR REPLAY fails on missing cassette
- [ ] **STRICT mode fails on missing cassette**
- [ ] **STRICT mode succeeds with cassette**
- [ ] **STRICT mode error message is clear and actionable**
- [ ] **STRICT mode works without API key**
- [ ] Cassettes have HMAC signatures
- [ ] Signature verification catches tampering

### Bonus Validation 🌟
- [ ] STRICT mode forbids recording (if implemented in proxy)
- [ ] Multiple requests create multiple cassettes
- [ ] Same request reuses same cassette
- [ ] Changed temperature creates new cassette

---

## Real CI Test

After manual validation, test in real GitHub Actions:

```yaml
# .github/workflows/test-strict.yml
name: Test Strict Mode

on: [push]

jobs:
  test-enforcement:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install
        run: npm install
      
      - name: Start TraceForge
        run: npx pnpm --filter @traceforge/proxy dev &
        
      - name: Wait for proxy
        run: sleep 5
      
      - name: Test WITHOUT Cassette (should fail)
        continue-on-error: true
        env:
          TRACEFORGE_VCR_MODE: strict
        run: node test-strict-mode.js
        id: test_no_cassette
      
      - name: Verify Failure
        if: steps.test_no_cassette.outcome == 'success'
        run: |
          echo "ERROR: Test should have failed!"
          exit 1
      
      - name: Record Cassette Locally
        env:
          TRACEFORGE_VCR_MODE: record
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node test-strict-mode.js
      
      - name: Test WITH Cassette (should pass)
        env:
          TRACEFORGE_VCR_MODE: strict
        run: node test-strict-mode.js
```

---

## Expected Output

### Strict Mode - Missing Cassette

```
✗ Test failed: STRICT CI MODE: Missing execution snapshot for openai request.
Build failed. Signature: abc123def456.
Record snapshots locally with TRACEFORGE_VCR_MODE=record before committing.

Process exited with code 1
```

### Strict Mode - With Cassette

```
✓ Response received
Hello!
✓ Test passed

Process exited with code 0
```

---

## Why This Test Matters

Per next-phase.md:

> "The only validation that matters now: Can a real team ship with this enabled for 30 days?"

This test validates that:

1. ✅ Missing snapshots = build fails (enforcement)
2. ✅ Committed snapshots = build passes (reproducibility)
3. ✅ No API keys needed in CI (security)
4. ✅ Deterministic behavior (reliability)
5. ✅ Clear error messages (developer experience)

**If this test passes, TraceForge delivers on its core guarantee.**

---

## Next: Integration with Real Project

Once manual tests pass, create example repo:

```
traceforge-strict-ci-starter/
├── .github/workflows/ci.yml  # Strict mode enforced
├── src/app.js                # Sample AI app
├── test.js                   # Test that calls AI
├── .ai-tests/cassettes/      # Committed snapshots
└── README.md                 # Setup instructions
```

This becomes the "golden path" for serious backend engineers (ICP from next-phase.md).
