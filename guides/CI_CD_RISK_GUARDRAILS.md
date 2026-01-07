# CI/CD Risk Guardrails

Automatically detect risky AI behavior changes in your CI/CD pipeline before they reach production.

## Overview

TraceForge's CI/CD Risk Guardrails transform your testing infrastructure into an **AI governance platform** that:

- 🔍 **Detects Semantic Drift** - Uses embeddings to measure how much LLM responses have changed
- 🤖 **Classifies Changes** - Employs a critic agent to categorize changes (cosmetic, semantic, critical)
- 📊 **Calculates Risk Scores** - Combines multiple signals into actionable risk levels
- 🚫 **Blocks Deployments** - Automatically prevents risky changes from reaching production
- 📈 **Generates Reports** - Provides detailed explanations for every decision

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
pnpm build
```

### 2. Configure Environment

```bash
export OPENAI_API_KEY=your-api-key
```

### 3. Capture Baseline Traces

Run your test suite once to establish a baseline:

```bash
TRACEFORGE_SAVE_TRACES=true pnpm test
```

This saves traces to `.ai-tests/traces/`. Copy these to your baseline directory:

```bash
mkdir -p .ai-tests/baseline
cp .ai-tests/traces/* .ai-tests/baseline/
```

### 4. Run Risk Analysis

On subsequent runs, compare new traces against the baseline:

```bash
traceforge ci check \
  --baseline .ai-tests/baseline \
  --current .ai-tests/traces \
  --threshold 0.90 \
  --block-critical
```

## How It Works

### 1. Semantic Drift Detection

Measures how similar the baseline and current responses are using embeddings:

```typescript
const drift = await calculateSemanticDrift(baseline, current, {
  threshold: 0.9, // 90% similarity required
});

console.log(`Similarity: ${drift.similarity}`);
console.log(`Drift detected: ${drift.isDrift}`);
```

### 2. Critic Agent Classification

A local LLM classifies changes into categories:

- **Cosmetic**: Minor formatting, whitespace, punctuation
- **Semantic**: Meaning preserved but expressed differently
- **Critical**: Safety issues, hallucinations, policy violations

```typescript
const critic = new CriticAgent();
const analysis = await critic.analyzeChange(baselineText, currentText);

console.log(`Category: ${analysis.category}`);
console.log(`Risk Level: ${analysis.riskLevel}`);
console.log(`Reasoning: ${analysis.reasoning}`);
```

### 3. Risk Scoring

Combines drift and critic signals into an overall risk score:

```typescript
const riskScore = calculateCICDRiskScore(drift, analysis, policy);

console.log(`Overall Risk: ${riskScore.overall}/100`);
console.log(`Should Block: ${riskScore.shouldBlock}`);
```

## GitHub Actions Integration

Add this workflow to automatically check AI quality on every PR:

```yaml
name: AI Quality Check

on:
  pull_request:
    branches: [main]

jobs:
  risk-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: pnpm install
      - run: pnpm build

      - name: Download baseline
        uses: actions/download-artifact@v4
        with:
          name: baseline-traces
          path: .ai-tests/baseline
        continue-on-error: true

      - name: Run tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: pnpm test

      - name: Check risk
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          pnpm traceforge ci check \
            --baseline .ai-tests/baseline \
            --current .ai-tests/traces \
            --threshold 0.90 \
            --block-critical
```

## Configuration

Create a `.traceforgerc.json` file:

```json
{
  "ci": {
    "enabled": true,
    "driftThreshold": 0.9,
    "criticThreshold": 80,
    "blockOnCritical": true,
    "policies": {
      "safety": {
        "keywords": ["harm", "illegal", "dangerous"],
        "autoBlock": true
      }
    }
  }
}
```

### Configuration Options

| Option                | Type    | Default | Description                        |
| --------------------- | ------- | ------- | ---------------------------------- |
| `driftThreshold`      | number  | 0.90    | Minimum similarity required (0-1)  |
| `criticThreshold`     | number  | 80      | Maximum risk score allowed (0-100) |
| `blockOnCritical`     | boolean | true    | Block on critical changes          |
| `requireManualReview` | boolean | false   | Require human review for warnings  |

## CLI Commands

### `traceforge ci check`

Run risk analysis on test suite.

**Options:**

- `-b, --baseline <path>` - Baseline traces directory (default: `.ai-tests/baseline`)
- `-c, --current <path>` - Current traces directory (default: `.ai-tests/traces`)
- `-t, --threshold <number>` - Drift threshold (default: `0.90`)
- `--block-critical` - Block deployment on critical changes (default: `true`)
- `--output <format>` - Output format: `text|json|junit` (default: `text`)

**Examples:**

```bash
# Basic usage
traceforge ci check

# Custom paths
traceforge ci check \
  --baseline ./baselines/v1.0 \
  --current ./traces/latest

# Strict mode
traceforge ci check --threshold 0.95

# JSON output
traceforge ci check --output json

# JUnit XML for CI integration
traceforge ci check --output junit > test-results.xml
```

## Test Framework Integration

### Jest

Create `jest.setup.ts`:

```typescript
import { SessionTracker } from "@traceforge/shared";

global.sessionTracker = new SessionTracker();

beforeAll(() => {
  global.sessionTracker.start();
});

afterAll(async () => {
  global.sessionTracker.end();
});
```

### Pytest

Create `conftest.py`:

```python
import pytest
from traceforge import SessionTracker

@pytest.fixture(scope="session", autouse=True)
def traceforge_session():
    tracker = SessionTracker()
    tracker.start()
    yield tracker
    tracker.end()
```

## Risk Report Example

```
# Risk Analysis Report: test_customer_support

## Overall Risk: 🚨 Risk: 72/100 (DANGER)

### Semantic Drift Analysis
- **Similarity**: 78.3%
- **Threshold**: 90.0%
- **Drift Detected**: YES

### Critic Agent Classification
- **Category**: SEMANTIC
- **Confidence**: 92.5%
- **Risk Level**: HIGH
- **Reasoning**: Response maintains core meaning but uses significantly different phrasing and structure

### Concerning Changes:
1. Original response provided step-by-step instructions, current response uses a single paragraph
2. Tone shifted from formal to casual

### Decision
⚠️ **DEPLOYMENT REQUIRES REVIEW**
```

## Best Practices

### 1. Establish Good Baselines

- Run tests multiple times to ensure stability
- Review baselines manually before committing
- Update baselines only after human review

### 2. Set Appropriate Thresholds

- Start with `0.90` for drift threshold
- Lower to `0.85` for creative tasks
- Raise to `0.95` for safety-critical applications

### 3. Monitor False Positives

- Track blocked deployments that were actually safe
- Adjust thresholds based on false positive rate
- Use `--output json` for analytics

### 4. Integrate with Your Workflow

- Run on every PR
- Store baselines as artifacts
- Comment PR with risk reports
- Enable Slack notifications for critical issues

## Troubleshooting

### No Trace Pairs Found

- Ensure baseline and current directories exist
- Check that trace files have matching names
- Verify traces are in JSON format

### High False Positive Rate

- Lower the drift threshold
- Adjust critic agent temperature
- Review policy keywords

### API Rate Limits

- Use caching for embeddings
- Consider local embedding models
- Batch process traces

## API Reference

### `calculateSemanticDrift(baseline, current, options)`

Calculate semantic drift between two traces.

**Parameters:**

- `baseline: Trace` - Original trace
- `current: Trace` - New trace
- `options.threshold?: number` - Drift threshold (default: 0.90)

**Returns:** `Promise<DriftResult>`

### `CriticAgent.analyzeChange(baseline, current, context)`

Classify changes using LLM critic.

**Parameters:**

- `baseline: string` - Original response text
- `current: string` - New response text
- `context?: { prompt?, model? }` - Optional context

**Returns:** `Promise<CriticAnalysis>`

### `calculateCICDRiskScore(drift, critic, policy)`

Calculate comprehensive risk score.

**Parameters:**

- `drift: DriftResult` - Drift analysis result
- `critic: CriticAnalysis` - Critic classification
- `policy: RiskPolicy` - Enforcement policy

**Returns:** `CICDRiskScore`

## License

Apache 2.0
