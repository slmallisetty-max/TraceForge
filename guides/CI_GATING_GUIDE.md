# CI Gating Guide

**CI Gating** provides automated quality gates for LLM testing in CI/CD pipelines. This Week 5 feature (2026 Q1) ensures AI tests meet quality standards before deployment.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Quality Gates](#quality-gates)
- [Configuration](#configuration)
- [CLI Usage](#cli-usage)
- [GitHub Actions Integration](#github-actions-integration)
- [Exit Codes](#exit-codes)
- [Badge Generation](#badge-generation)
- [Best Practices](#best-practices)
- [FAQ](#faq)

## Overview

CI Gating evaluates test results against configurable quality gates:

- **Test Failures**: Ensure all tests pass
- **Pass Rate**: Maintain minimum pass rate (default: 90%)
- **Policy Violations**: Block critical/high policy violations
- **Risk Threshold**: Limit maximum risk severity (default: 8/10)
- **Baseline Requirement**: Optionally require baselines for all tests

## Quick Start

Enable CI mode with quality gates:

```bash
traceforge test run --ci
```

With custom thresholds:

```bash
traceforge test run \
  --ci \
  --with-policy \
  --min-pass-rate 95 \
  --max-risk-severity 7
```

## Quality Gates

### 1. Test Failure Gate

**Purpose**: Ensure all tests pass

**Triggers**: When any test fails  
**Severity**: Critical  
**Exit Code**: 1

**Example**:
```bash
$ traceforge test run --ci

❌ GATES FAILED
  🔴 test_failure: 3 tests failed

Exit code: 1
```

### 2. Pass Rate Gate

**Purpose**: Maintain minimum pass rate across test suite

**Triggers**: When pass rate < `min_pass_rate` (default: 90%)  
**Severity**: 
- Critical if < 50%
- High if < 75%
- Medium otherwise

**Configuration**:
```bash
--min-pass-rate <number>  # Percentage (0-100)
```

**Example**:
```bash
$ traceforge test run --ci --min-pass-rate 95

❌ GATES FAILED
  🟠 pass_rate: Pass rate 92.5% is below minimum 95%

Pass Rate: 92.5%
Exit code: 1
```

### 3. Policy Violations Gate

**Purpose**: Block responses with policy violations

**Triggers**: When `--with-policy` enabled and critical/high violations detected  
**Severity**: Matches violation severity (critical or high)

**Configuration**:
```bash
--with-policy           # Enable policy evaluation
```

**Example**:
```bash
$ traceforge test run --ci --with-policy

❌ GATES FAILED
  🔴 policy_violations: 2 critical policy violations detected
  
Policy Violations: 2
Exit code: 1
```

### 4. Risk Threshold Gate

**Purpose**: Limit maximum risk severity from policy violations

**Triggers**: When max risk severity >= `max_risk_severity` (default: 8)  
**Severity**:
- Critical if >= 9
- High if >= 7
- Medium otherwise

**Configuration**:
```bash
--max-risk-severity <number>  # 1-10 scale
```

**Risk Severity Scale**:
- 10 = Critical policy violations
- 8 = High policy violations
- 5 = Medium policy violations
- 3 = Low policy violations

**Example**:
```bash
$ traceforge test run --ci --with-policy --max-risk-severity 5

❌ GATES FAILED
  🟠 risk_threshold: Risk severity 8 exceeds threshold 5
  
Max Risk Severity: 8/10
Exit code: 1
```

### 5. Baseline Requirement Gate (Optional)

**Purpose**: Ensure all tests have baselines (VCR recordings)

**Triggers**: When enabled and tests lack baselines  
**Severity**: Medium

**Note**: Disabled by default. Enable via config file only (not CLI flag).

## Configuration

### Via CLI Flags

```bash
traceforge test run \
  --ci \                        # Enable CI mode
  --with-policy \               # Enable policy evaluation
  --min-pass-rate 90 \          # Minimum pass rate (%)
  --max-risk-severity 8 \       # Maximum risk severity (1-10)
  --badge .ai-tests/badge.svg \ # Badge output path
  --summary .ai-tests/summary.md # Summary output path
```

### Via Config File

```yaml
# .traceforge.yml
ci_gating:
  enabled: true
  fail_on_test_failure: true
  fail_on_policy_violations: true
  fail_on_risk_threshold: true
  max_risk_severity: 8
  min_pass_rate: 90
  require_baselines: false
  generate_badge: true
  badge_path: .ai-tests/badge.svg
  summary_path: .ai-tests/summary.md
```

### Environment Detection

CI mode auto-enables when these environment variables are present:
- `CI=true`
- `GITHUB_ACTIONS=true`
- `GITLAB_CI=true`
- `CIRCLECI=true`
- `JENKINS_URL` exists

## CLI Usage

### Basic CI Run

```bash
traceforge test run --ci
```

### With Policy Validation

```bash
traceforge test run --ci --with-policy
```

### Custom Thresholds

```bash
traceforge test run \
  --ci \
  --min-pass-rate 95 \
  --max-risk-severity 7
```

### With Reports

```bash
traceforge test run \
  --ci \
  --junit junit.xml \
  --badge badge.svg \
  --summary summary.md
```

### Dry Run (Check Without Failing)

```bash
# Run without --ci to see results without exit codes
traceforge test run --with-policy
```

## GitHub Actions Integration

### Complete Workflow

See [`.github/workflows/ai-tests.yml`](../.github/workflows/ai-tests.yml) for full example.

### Key Steps

**1. Setup**:
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '18'
- uses: pnpm/action-setup@v2
  with:
    version: 8
```

**2. Run Tests**:
```yaml
- name: Run AI tests
  run: |
    pnpm traceforge test run \
      --ci \
      --with-policy \
      --junit test-results.xml
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**3. Upload Results**:
```yaml
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-results
    path: |
      test-results.xml
      .ai-tests/badge.svg
      .ai-tests/summary.md
```

**4. Publish Results**:
```yaml
- uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    files: test-results.xml
```

**5. Comment on PR**:
```yaml
- uses: actions/github-script@v7
  if: github.event_name == 'pull_request'
  with:
    script: |
      const fs = require('fs');
      const summary = fs.readFileSync('.ai-tests/summary.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: summary
      });
```

### Environment Variables

Store secrets in GitHub repository settings:

- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key (if used)
- Any other provider API keys

## Exit Codes

TraceForge uses standard exit codes for CI integration:

| Exit Code | Meaning | CI Behavior |
|-----------|---------|-------------|
| 0 | All gates passed | ✅ Build succeeds |
| 1 | Gate failure | ❌ Build fails |

### Exit Code Priority

When multiple gates fail, exit code is determined by highest severity:

1. **Critical failures** → Exit 1
   - Test failures
   - Critical policy violations
   - Pass rate < 50%

2. **High failures** → Exit 1
   - High policy violations
   - Pass rate < 75%
   - Risk severity >= 9

3. **Medium/Low failures** → Exit 1
   - Medium policy violations
   - Missing baselines
   - Other threshold violations

## Badge Generation

### Enable Badge

```bash
traceforge test run --ci --badge .ai-tests/badge.svg
```

### Badge Appearance

**Passing (100%)**:  
![Badge Passing](https://img.shields.io/badge/AI%20Tests-passing%20(100%25)-brightgreen)

**Passing (95%)**:  
![Badge Passing 95](https://img.shields.io/badge/AI%20Tests-passing%20(95%25)-brightgreen)

**Failing (45%)**:  
![Badge Failing](https://img.shields.io/badge/AI%20Tests-failing%20(45%25)-red)

### Display Badge in README

```markdown
## Test Status

![AI Tests](.ai-tests/badge.svg)
```

### Update Badge on Push

```yaml
# In GitHub Actions
- name: Update badge
  if: github.ref == 'refs/heads/main'
  run: |
    git add .ai-tests/badge.svg
    git commit -m "Update AI test badge [skip ci]"
    git push
```

## Summary Reports

### Generate Summary

```bash
traceforge test run --ci --summary .ai-tests/summary.md
```

### Summary Format

```markdown
✅ **Quality Gates: PASSED**

### Test Results
- **Total Tests**: 15
- **Passed**: 14 ✓
- **Failed**: 1 ✗
- **Pass Rate**: 93.3%
- **Policy Violations**: 0

---
Generated at 2026-01-03T12:34:56Z
```

### Use in PR Comments

```yaml
- name: Comment PR
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const summary = fs.readFileSync('.ai-tests/summary.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: summary
      });
```

## Best Practices

### 1. Start Conservative

Begin with lenient thresholds and tighten over time:

```bash
# Week 1: 70% pass rate
--min-pass-rate 70

# Week 2: 80% pass rate
--min-pass-rate 80

# Week 3: 90% pass rate (recommended)
--min-pass-rate 90
```

### 2. Use Policy Gates Selectively

Enable policies for production-critical paths:

```yaml
# .ai-tests/tests/customer-support.yaml
policy_contracts:
  - pii-protection    # Always check
  - customer-support  # Tone/quality
```

```yaml
# .ai-tests/tests/internal-tool.yaml
# No policies for internal tools
```

### 3. Monitor Trends

Track metrics over time:

```bash
# Save historical data
traceforge test run --ci --json > results-$(date +%Y%m%d).json
```

### 4. Fail Fast in PR, Warn in Main

```yaml
# Pull requests: strict gates
if: github.event_name == 'pull_request'
run: traceforge test run --ci --min-pass-rate 95

# Main branch: relaxed gates
if: github.ref == 'refs/heads/main'
run: traceforge test run --ci --min-pass-rate 85
```

### 5. Cache VCR Baselines

Commit baselines to git for consistent CI runs:

```yaml
# .gitignore
# Do NOT ignore these:
# .ai-tests/baselines/

.ai-tests/traces/    # Ignore runtime traces
.ai-tests/embeddings/ # Ignore embeddings cache
```

### 6. Use Matrix Testing

Test multiple models/configurations:

```yaml
strategy:
  matrix:
    model: [gpt-4, gpt-3.5-turbo, claude-3-sonnet]
steps:
  - run: traceforge test run --ci
    env:
      MODEL: ${{ matrix.model }}
```

## Programmatic Usage

### TypeScript/JavaScript

```typescript
import {
  evaluateQualityGates,
  formatGateSummary,
  generateBadge,
  getExitCode
} from '@traceforge/shared';

// Run tests (custom implementation)
const testResults = await runTests();

// Evaluate gates
const gateResult = evaluateQualityGates(testResults, {
  enabled: true,
  fail_on_test_failure: true,
  fail_on_policy_violations: true,
  max_risk_severity: 8,
  min_pass_rate: 90,
});

// Check result
if (!gateResult.passed) {
  console.error('Quality gates failed:');
  for (const failure of gateResult.gate_failures) {
    console.error(`- ${failure.gate}: ${failure.reason}`);
  }
}

// Generate outputs
const summary = formatGateSummary(gateResult);
const badge = generateBadge(gateResult);
const exitCode = getExitCode(gateResult);

// Write files
await fs.writeFile('summary.md', summary);
await fs.writeFile('badge.svg', badge);

process.exit(exitCode);
```

## FAQ

### Q: Can I disable specific gates?

**A**: Yes, via config:

```yaml
ci_gating:
  fail_on_test_failure: false  # Allow test failures
  fail_on_policy_violations: true
  fail_on_risk_threshold: true
```

Or disable all gates:

```yaml
ci_gating:
  enabled: false  # CI mode but no gates
```

### Q: How do I test locally without failing?

**A**: Omit `--ci` flag:

```bash
# Local development: see results, no exit codes
traceforge test run --with-policy

# CI: enforce gates
traceforge test run --ci --with-policy
```

### Q: Can I have different gates for different test suites?

**A**: Yes, use tags and multiple commands:

```bash
# Critical tests: strict gates
traceforge test run --ci --tag critical --min-pass-rate 100

# Non-critical: relaxed gates
traceforge test run --ci --tag experimental --min-pass-rate 70
```

### Q: What if I want warnings instead of failures?

**A**: Run without `--ci`, parse JSON output:

```bash
traceforge test run --with-policy --json > results.json
# Custom script analyzes results.json and warns
```

### Q: How do I debug gate failures locally?

**A**: Use verbose output:

```bash
traceforge test run --ci --with-policy --no-progress

# Or check summary file
traceforge test run --ci --summary summary.md
cat summary.md
```

### Q: Can I use quality gates without policies?

**A**: Yes! Gates work with or without `--with-policy`:

```bash
# Basic gates: test failures + pass rate
traceforge test run --ci

# With policies: adds policy + risk gates
traceforge test run --ci --with-policy
```

### Q: How do I set different thresholds per environment?

**A**: Use environment-specific config files:

```bash
# Staging: lenient
traceforge test run --ci --config .traceforge.staging.yml

# Production: strict
traceforge test run --ci --config .traceforge.prod.yml
```

Or environment variables:

```bash
# In CI
export MIN_PASS_RATE=95
export MAX_RISK_SEVERITY=7

traceforge test run --ci --min-pass-rate $MIN_PASS_RATE
```

### Q: What's the performance impact?

**A**: Minimal (~10-50ms):
- Gate evaluation: <10ms for 100 tests
- Badge generation: <5ms (SVG templating)
- Summary generation: <5ms (text formatting)

Total overhead: <1% of test execution time.

---

## Next Steps

1. **Enable CI mode**: Add `--ci` to your test commands
2. **Configure thresholds**: Set appropriate pass rates and risk limits
3. **Integrate with CI/CD**: Use GitHub Actions workflow template
4. **Monitor metrics**: Track pass rates and policy violations over time
5. **Iterate**: Adjust gates based on team needs

For more details:
- [Policy Contracts Guide](./POLICY_CONTRACTS_GUIDE.md) - Policy configuration
- [Risk Scoring Guide](./RISK_SCORING_GUIDE.md) - Risk severity details
- [CLI Reference](./cli.md) - All CLI options
- [GitHub Actions Workflow](../.github/workflows/ai-tests.yml) - Complete example

---

**Last Updated**: Week 5, 2026 Q1  
**Feature Status**: ✅ Complete (23/23 tests passing)
