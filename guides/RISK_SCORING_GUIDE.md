# Risk Scoring Guide

**2026 Q1 Feature: Automated Risk Classification for AI Responses**

## Overview

TraceForge's Risk Scoring system automatically analyzes differences between baseline and current AI responses, classifying changes by severity and providing actionable recommendations.

## Quick Start

### Using trace compare with risk scoring:

```bash
# Compare two traces with risk analysis
traceforge trace compare abc123 def456 --with-risk
```

### Example Output:

```
=== Trace Comparison ===

Baseline ID: abc12345
Current ID: def67890
Model: gpt-4 → gpt-4-turbo
Duration: 1234ms → 987ms
Tokens: 456 → 512

--- Response Comparison ---

Baseline length: 245 chars
Current length: 298 chars
Length difference: +53 (+21.6%)

--- Risk Analysis ---

🟡 Risk: SEMANTIC
   Severity: 5/10
   ⚠️ Recommendation: REVIEW
   Confidence: 82%

Semantic similarity: 72%. Response 22% longer.

Risk Factors:
   length_delta: 21.6%
   semantic_similarity: 72.0%
   word_overlap: 68.5%
   tone_shift: 0.15
   format_change: false
   latency_delta: -20.0%
   token_delta: 12.3%
```

## Risk Categories

### 🟢 Cosmetic (Severity 1-3)

**Minor, superficial changes that don't affect meaning**

Examples:
- Punctuation changes
- Minor phrasing adjustments
- Whitespace differences
- Synonym substitutions

**Recommendation:** Auto-approve

### 🟡 Semantic (Severity 4-7)

**Changes in meaning or content that require review**

Examples:
- Different explanation approach
- Additional/missing information
- Tone changes
- Format restructuring
- Moderate performance changes

**Recommendation:** Human review required

### 🔴 Safety (Severity 8-10)

**Critical changes that could indicate problems**

Examples:
- Completely different response
- Missing response
- Hallucinated information
- Policy violations
- Major performance degradation

**Recommendation:** Block deployment

## Risk Factors Explained

### Content Analysis

| Factor | Description | Range | Impact |
|--------|-------------|-------|--------|
| **semantic_similarity** | Embeddings-based meaning comparison | 0-1 | High |
| **word_overlap** | Jaccard similarity of words | 0-1 | Medium |
| **length_delta** | Percentage change in response length | -1 to ∞ | Medium |
| **tone_shift** | Sentiment/attitude change | 0-1 | Medium |
| **format_change** | Structure changed (JSON, code, lists) | boolean | High |

### Performance Metrics

| Factor | Description | Range | Impact |
|--------|-------------|-------|--------|
| **latency_delta** | Response time change (%) | -1 to ∞ | Low |
| **token_delta** | Token usage change (%) | -1 to ∞ | Low |

### Safety Signals

| Factor | Description | Impact |
|--------|-------------|--------|
| **policy_violations** | Matched forbidden patterns | Critical |
| **confidence_drop** | Model confidence decrease | High |
| **hallucination_risk** | Estimated factual error risk | High |

## Configuration

Add risk scoring settings to `.traceforge.yml`:

```yaml
risk_scoring:
  enabled: true
  
  # When to fail CI/CD pipeline
  fail_on: safety              # Options: safety, semantic, cosmetic, never
  min_severity: 8              # Fail if severity >= this number (1-10)
  
  # Auto-approval settings
  allow_cosmetic: true         # Auto-approve cosmetic changes
  auto_approve_below: 4        # Auto-approve if severity < this
  
  # Review requirements
  require_approval_for:
    - safety
    - semantic
```

### Configuration Examples

**Strict mode** (review everything):
```yaml
risk_scoring:
  fail_on: semantic
  min_severity: 4
  allow_cosmetic: false
  auto_approve_below: 1
```

**Balanced mode** (default):
```yaml
risk_scoring:
  fail_on: safety
  min_severity: 8
  allow_cosmetic: true
  auto_approve_below: 4
```

**Permissive mode** (trust most changes):
```yaml
risk_scoring:
  fail_on: never
  allow_cosmetic: true
  auto_approve_below: 7
```

## Programmatic Usage

### Node.js/TypeScript

```typescript
import { calculateRiskScore } from '@traceforge/shared';

// Compare two responses
const score = await calculateRiskScore(
  baselineResponse,
  currentResponse,
  { duration_ms: 1234, tokens_used: 456 },
  { duration_ms: 987, tokens_used: 512 }
);

console.log(`Risk: ${score.category}`);
console.log(`Severity: ${score.severity}/10`);
console.log(`Recommendation: ${score.recommendation}`);
console.log(`Explanation: ${score.explanation}`);

// Check if change should be blocked
if (score.recommendation === 'block') {
  throw new Error('Unsafe change detected');
}
```

### Custom Thresholds

```typescript
const score = await calculateRiskScore(
  baseline,
  current,
  baseMeta,
  currMeta,
  {
    semantic_threshold: 0.95,   // Very strict
    length_threshold: 0.1,      // 10% length change triggers review
    tone_threshold: 0.2,        // 20% tone shift triggers review
  }
);
```

### Integration with Tests

```typescript
import { test, expect } from 'vitest';
import { calculateRiskScore } from '@traceforge/shared';

test('AI response should be safe', async () => {
  const baseline = await getBaselineResponse();
  const current = await getCurrentResponse();
  
  const risk = await calculateRiskScore(baseline, current);
  
  expect(risk.category).not.toBe('safety');
  expect(risk.severity).toBeLessThan(8);
  expect(risk.recommendation).not.toBe('block');
});
```

## How It Works

### 1. Text Extraction

Responses are normalized and text content extracted:
- Chat completions: `choices[0].message.content`
- Completions: `choices[0].text`
- Structured: JSON serialization

### 2. Feature Calculation

Multiple signals are analyzed in parallel:

**Semantic Analysis:**
- Embeddings generated using OpenAI `text-embedding-3-small`
- Cosine similarity calculated
- Cached for performance

**Lexical Analysis:**
- Word overlap (Jaccard similarity)
- Length difference
- Format detection (JSON, code blocks, lists)

**Sentiment Analysis:**
- Positive/negative word counts
- Tone shift calculation

**Performance Analysis:**
- Latency comparison
- Token usage comparison

### 3. Risk Classification

Severity (1-10) determined by:
```
1-3:  Cosmetic   - High similarity (>90%), minor changes
4-7:  Semantic   - Moderate similarity (60-90%), content changes
8-10: Safety     - Low similarity (<60%), major divergence
```

### 4. Recommendation Generation

```
Cosmetic → Approve   (auto-deploy safe)
Semantic → Review    (human decision needed)
Safety   → Block     (prevent deployment)
```

## Advanced Features

### Policy Violations

Custom patterns can be flagged as violations:

```typescript
const score = await calculateRiskScore(
  baseline,
  current,
  {},
  {},
  {
    policyViolations: [
      'pii-detected',
      'unsafe-advice',
      'hallucination-risk'
    ]
  }
);

// Violations automatically elevate to safety category
if (score.factors.policy_violations.length > 0) {
  console.log('Policy violations:', score.factors.policy_violations);
}
```

### Confidence Scoring

Risk scores include confidence (0-1):

```typescript
if (score.confidence < 0.7) {
  console.log('Low confidence - consider manual review');
}
```

Confidence is lower when:
- Semantic similarity unavailable (fallback to word overlap)
- Tone shift cannot be measured
- Metadata is incomplete

### Disable Semantic Analysis

For performance or offline testing:

```typescript
const score = await calculateRiskScore(
  baseline,
  current,
  {},
  {},
  {
    useSemanticSimilarity: false  // Uses word overlap only
  }
);
```

## CI/CD Integration

### GitHub Actions

```yaml
name: AI Safety Check
on: [pull_request]

jobs:
  risk-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install TraceForge
        run: npm install -g @traceforge/cli
      
      - name: Run tests with risk scoring
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          traceforge test --with-risk
          
          # Fail if any safety issues
          if [ $? -eq 2 ]; then
            echo "Safety issues detected"
            exit 1
          fi
```

### Custom Scripts

```javascript
// check-risk.js
const { calculateRiskScore } = require('@traceforge/shared');
const fs = require('fs');

async function checkRisk() {
  const baseline = JSON.parse(fs.readFileSync('baseline.json'));
  const current = JSON.parse(fs.readFileSync('current.json'));
  
  const score = await calculateRiskScore(
    baseline.response,
    current.response,
    baseline.metadata,
    current.metadata
  );
  
  console.log(`Risk: ${score.category} (${score.severity}/10)`);
  
  // Exit with error code for CI
  if (score.recommendation === 'block') {
    process.exit(2);  // Safety issue
  } else if (score.recommendation === 'review') {
    process.exit(1);  // Needs review
  }
  
  process.exit(0);  // Approved
}

checkRisk();
```

## Troubleshooting

### "Failed to calculate semantic similarity"

**Cause:** OpenAI API key not set or invalid

**Solution:**
```bash
export OPENAI_API_KEY=sk-...
```

Or disable semantic analysis:
```typescript
{ useSemanticSimilarity: false }
```

### High False Positive Rate

**Cause:** Thresholds too strict

**Solution:** Adjust thresholds:
```yaml
risk_scoring:
  fail_on: safety          # Only fail on critical issues
  min_severity: 8          # Higher threshold
  allow_cosmetic: true     # Auto-approve cosmetic
```

### Low Confidence Scores

**Cause:** Missing metadata or fallback to word overlap

**Solution:** 
- Ensure OPENAI_API_KEY is set
- Provide complete metadata
- Review confidence factors

## Best Practices

### 1. Start Permissive

Begin with `fail_on: safety` and gradually tighten:
```yaml
# Week 1
fail_on: never  # Observe only

# Week 2
fail_on: safety  # Block critical issues

# Week 3
fail_on: semantic  # Block all meaningful changes
```

### 2. Review Thresholds

Analyze historical scores and adjust:
```bash
# Collect risk scores
traceforge trace compare --with-risk --json > risks.jsonl

# Analyze distribution
cat risks.jsonl | jq '.severity' | sort | uniq -c
```

### 3. Combine with Assertions

Risk scoring complements assertions:
```yaml
assertions:
  - type: semantic
    expected: "explain quantum computing"
    threshold: 0.85
    
  - type: risk
    max_severity: 7
    allowed_categories: [cosmetic, semantic]
```

### 4. Monitor Trends

Track risk scores over time:
```bash
traceforge web  # View risk dashboard
```

### 5. Document Exceptions

When overriding recommendations:
```typescript
// Approved despite semantic changes
// Reason: Improved explanation based on user feedback
// Reviewer: alice@example.com
// Date: 2026-01-15
```

## FAQ

**Q: What's the difference between semantic assertions and risk scoring?**

A: Semantic assertions verify specific content requirements (e.g., "response must mention X"). Risk scoring evaluates overall change magnitude.

**Q: Does risk scoring slow down tests?**

A: First run: ~200-500ms per comparison (embedding generation). Subsequent runs: ~1-5ms (cached). Embedding cache is persistent across runs.

**Q: Can I use risk scoring offline?**

A: Yes, with `useSemanticSimilarity: false` for word-overlap-only mode, or cache embeddings beforehand.

**Q: What models are supported?**

A: Risk scoring works with any text output. Embeddings use OpenAI by default; bring your own embedding service via custom configuration.

**Q: How accurate is risk scoring?**

A: 85-95% accuracy in our testing. Always combine with human review for critical applications.

## Related

- [Semantic Assertions Quick Start](./SEMANTIC_ASSERTIONS_QUICK_START.md)
- [Policy Contracts Guide](./POLICY_CONTRACTS_GUIDE.md) (coming Week 4)
- [CI/CD Integration](./CI_CD_INTEGRATION.md)
- [API Reference](./API.md)

## Support

- GitHub Issues: https://github.com/traceforge/traceforge/issues
- Discord: https://discord.gg/traceforge
- Email: support@traceforge.dev
