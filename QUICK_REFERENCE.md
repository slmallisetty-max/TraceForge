# CI/CD Risk Guardrails - Quick Reference

## 🚀 Quick Start

```bash
# 1. Install and build
pnpm install && pnpm build

# 2. Set API key
export OPENAI_API_KEY=your-key

# 3. Create baseline
TRACEFORGE_SAVE_TRACES=true pnpm test
mkdir -p .ai-tests/baseline
cp .ai-tests/traces/* .ai-tests/baseline/

# 4. Run risk check
traceforge ci check
```

## 📝 CLI Commands

### Basic Check

```bash
traceforge ci check
```

### Custom Paths

```bash
traceforge ci check \
  --baseline ./baselines/v1.0 \
  --current ./traces/latest
```

### Strict Mode

```bash
traceforge ci check --threshold 0.95
```

### Output Formats

```bash
traceforge ci check --output json      # JSON output
traceforge ci check --output junit     # JUnit XML
traceforge ci check --output text      # Human-readable (default)
```

## 🔧 Configuration (.traceforgerc.json)

```json
{
  "ci": {
    "driftThreshold": 0.9,
    "criticThreshold": 80,
    "blockOnCritical": true
  }
}
```

## 📊 Risk Levels

| Level       | Score  | Action                 |
| ----------- | ------ | ---------------------- |
| 🟢 Safe     | 0-29   | Auto-approve           |
| 🟡 Warning  | 30-59  | Review recommended     |
| 🟠 Danger   | 60-79  | Manual review required |
| 🔴 Critical | 80-100 | Blocked                |

## 🎯 Change Categories

| Category | Description                   | Default Action |
| -------- | ----------------------------- | -------------- |
| Cosmetic | Formatting, whitespace        | Approve        |
| Semantic | Paraphrases, style changes    | Review         |
| Critical | Safety issues, hallucinations | Block          |

## 📈 Exit Codes

| Code | Meaning            |
| ---- | ------------------ |
| 0    | All checks passed  |
| 1    | Deployment blocked |

## 🔌 Integration Examples

### GitHub Actions

```yaml
- name: Run risk analysis
  run: |
    traceforge ci check \
      --baseline .ai-tests/baseline \
      --current .ai-tests/traces \
      --output junit > results.xml
```

### Jest

```typescript
// jest.setup.ts
import { SessionTracker } from "@traceforge/shared";
global.sessionTracker = new SessionTracker();
beforeAll(() => global.sessionTracker.start());
afterAll(() => global.sessionTracker.end());
```

### Pytest

```python
# conftest.py
@pytest.fixture(scope="session", autouse=True)
def traceforge_session():
    tracker = SessionTracker()
    tracker.start()
    yield tracker
    tracker.end()
```

## 🐛 Troubleshooting

### No trace pairs found

- Check baseline directory exists
- Verify trace files have matching names
- Ensure files are valid JSON

### High false positives

- Lower drift threshold (0.85 instead of 0.90)
- Adjust critic temperature
- Review policy keywords

### API rate limits

- Enable embedding cache
- Use local embedding models
- Batch process traces

## 📚 More Info

- Full guide: `guides/CI_CD_RISK_GUARDRAILS.md`
- Implementation: `docs/Feature 3 - Autonomous Risk Guardrails.md`
- Config example: `.traceforgerc.example.json`
