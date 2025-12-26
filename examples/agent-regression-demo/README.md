# Agent Regression Testing Demo

This example demonstrates the **golden path workflow** for regression testing AI agents with TraceForge.

## 🎯 What This Demonstrates

- **Real-world AI agent** with multiple LLM interactions
- **VCR record/replay workflow** for deterministic testing
- **Baseline comparison** to detect output drift
- **Zero API costs** when running tests in replay mode

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start TraceForge Proxy

In a separate terminal:

```bash
# From repository root
cd ../../
pnpm dev
```

The proxy will start on `http://localhost:3000`.

### 3. Record Baseline Tests

First time only - requires real OpenAI API key:

```bash
export OPENAI_API_KEY=sk-...
npm run test:record
```

This will:
- ✅ Make real API calls through the proxy
- ✅ Record responses in `.ai-tests/cassettes/`
- ✅ Save traces in `.ai-tests/traces/`
- ✅ Establish baseline outputs

### 4. Run Tests in Replay Mode

No API key needed - uses recorded cassettes:

```bash
npm run test:replay
```

This will:
- ✅ Mock API responses from cassettes
- ✅ Compare outputs against baselines
- ✅ Detect regressions and drift
- ✅ Run instantly with zero API costs

## 📋 What's Being Tested

### TravelAgent Class

A simple AI agent with two methods:

1. **`getRecommendation(city, interests)`**
   - Provides travel recommendations
   - Tests: output structure, relevance

2. **`analyzeReview(review)`**
   - Performs sentiment analysis
   - Tests: classification accuracy, consistency

### Test Suite

Three regression tests:

1. **Paris Recommendations**
   - Verifies structured output
   - Checks for required content

2. **Sentiment Analysis**
   - Tests classification logic
   - Ensures consistent categorization

3. **Response Consistency**
   - Validates determinism with low temperature
   - Detects unexpected variations

## 🔄 The Regression Testing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ INITIAL SETUP (Record Mode)                                 │
│                                                              │
│  1. Write agent code                                        │
│  2. Write test assertions                                   │
│  3. npm run test:record (with real API key)                │
│     ├─→ Makes real API calls                               │
│     ├─→ Records in cassettes                               │
│     └─→ Saves baseline outputs                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ DAILY DEVELOPMENT (Replay Mode)                             │
│                                                              │
│  1. Make code changes                                       │
│  2. npm run test:replay (no API key)                       │
│     ├─→ Uses cassettes (instant)                           │
│     ├─→ Compares outputs                                   │
│     └─→ Detects regressions                                │
│  3. Fix issues if tests fail                               │
│  4. Repeat                                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ MODEL UPDATE / INTENTIONAL CHANGE (Re-record)               │
│                                                              │
│  1. Decide change is intentional                           │
│  2. npm run test:record (with API key)                     │
│  3. Review new baselines                                   │
│  4. Commit updated cassettes                               │
└─────────────────────────────────────────────────────────────┘
```

## 🎓 Key Concepts

### VCR Modes

- **`record`**: Make real API calls, save cassettes
- **`replay`**: Use cassettes, no API calls
- **`passthrough`**: No recording (default)

### Cassettes

HTTP interaction recordings stored as JSON:

```
.ai-tests/cassettes/
  └── test_paris_recommendations.json
```

Contains:
- Request (method, URL, headers, body)
- Response (status, headers, body)
- Metadata (timestamp, provider)

### Baselines

Expected outputs for regression comparison:

```
.ai-tests/traces/
  └── test_paris_recommendations.json
```

Contains:
- Input parameters
- LLM output
- Assertions
- Metadata

## 🔍 Inspecting Results

### View Traces in Web UI

```bash
# From repository root
pnpm web
```

Open `http://localhost:3001` to:
- Browse all recorded traces
- Compare baselines
- Analyze token usage
- Debug failures

### View Cassettes Directly

```bash
cat .ai-tests/cassettes/test_paris_recommendations.json
```

## 💡 Best Practices

### 1. Use Low Temperature for Deterministic Tests

```javascript
temperature: 0.1  // More consistent outputs
```

### 2. Test Semantic Properties, Not Exact Matches

```javascript
assertContains(result, 'negative');  // ✓ Flexible
assertEquals(result, 'Negative');     // ✗ Too brittle
```

### 3. Define Acceptable Drift Thresholds

```javascript
assertOutputStable(actual, baseline, 0.8);  // 80% similarity OK
```

### 4. Re-record When Models Change

```bash
# When upgrading gpt-4 → gpt-4-turbo
npm run test:record
git add .ai-tests/
git commit -m "Update baselines for gpt-4-turbo"
```

## 🚨 Common Issues

### "Connection refused" Error

The proxy isn't running. Start it:

```bash
cd ../../
pnpm dev
```

### "No cassette found" Error

You need to record first:

```bash
npm run test:record
```

### Tests Pass Locally But Fail in CI

Ensure cassettes are committed:

```bash
git add .ai-tests/cassettes/
git commit -m "Add test cassettes"
```

## 🔗 Next Steps

- Read the [VCR Usage Guide](../../guides/VCR_USAGE.md)
- Explore [Assertion Patterns](../../guides/assertions.md)
- Set up [CI Integration](../../guides/getting-started.md#ci-integration)
