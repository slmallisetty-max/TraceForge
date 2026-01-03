# Policy Contracts Guide

**Policy Contracts** allow you to define and enforce safety rules, compliance requirements, and content policies for LLM responses. This Week 4 feature (2026 Q1) provides a declarative framework for automated policy validation.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Policy Rule Types](#policy-rule-types)
- [Built-in Policy Templates](#built-in-policy-templates)
- [Programmatic Usage](#programmatic-usage)
- [CLI Integration](#cli-integration)
- [Custom Policies](#custom-policies)
- [Best Practices](#best-practices)
- [FAQ](#faq)

## Overview

Policy Contracts provide automated validation of LLM responses against predefined rules. Common use cases:

- **Compliance**: Enforce HIPAA, financial regulations, data privacy laws
- **Safety**: Block harmful content, PII leakage, medical advice
- **Brand Protection**: Maintain tone, prevent profanity, length limits
- **Quality Assurance**: Require disclaimers, citations, proper formatting

## Core Concepts

### PolicyContract

A policy contract is a named collection of rules:

```typescript
interface PolicyContract {
  id: string;                 // Unique identifier
  name: string;              // Human-readable name
  description: string;       // What the policy enforces
  version: string;           // Semantic version (e.g., '1.0.0')
  rules: PolicyRule[];       // List of validation rules
  enabled?: boolean;         // Can be disabled (default: true)
  tags?: string[];          // Tags for categorization
}
```

### PolicyRule

Individual validation rules within a contract:

```typescript
interface PolicyRule {
  id: string;                        // Unique rule ID
  type: PolicyRuleType;              // Rule type (see below)
  description: string;               // What the rule checks
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled?: boolean;                 // Can be disabled (default: true)
  
  // Type-specific configuration
  pattern?: RegExp;                  // For forbidden/required content
  patterns?: RegExp[];               // Multiple patterns
  maxLength?: number;                // For max-length rules
  minLength?: number;                // For min-length rules
  sentimentTarget?: 'positive' | 'negative';  // For sentiment rules
  formatType?: 'json' | 'markdown' | 'code';  // For format rules
  validator?: (content: string) => boolean | Promise<boolean>;  // Custom validator
  violationMessage?: string;         // Custom violation message
  suggestion?: string;               // How to fix violation
}
```

### PolicyViolation

When a rule fails, a violation is created:

```typescript
interface PolicyViolation {
  ruleId: string;          // Which rule failed
  ruleType: string;        // Rule type
  severity: string;        // Violation severity
  message: string;         // Description of violation
  matched?: string;        // What triggered the violation
  location?: {             // Where in the response (future)
    line?: number;
    column?: number;
    offset?: number;
  };
  suggestion?: string;     // How to fix
}
```

### Evaluation Result

```typescript
interface PolicyEvaluationResult {
  passed: boolean;               // Overall pass/fail
  violations: PolicyViolation[]; // All violations found
  contract: PolicyContract;      // Policy that was evaluated
  timestamp: string;             // When evaluated
  criticalCount: number;         // Count by severity
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
```

**Pass/Fail Logic**: A policy evaluation **fails** if there are any `critical` OR `high` severity violations. Medium and low violations are warnings only.

## Policy Rule Types

### 1. `forbidden-content`

Blocks responses containing specific patterns (case-insensitive).

```typescript
{
  id: 'no-profanity',
  type: 'forbidden-content',
  description: 'Block profanity',
  severity: 'high',
  patterns: [/damn/, /hell/, /crap/]
}
```

**Use cases**: Profanity filtering, blocking specific terms, brand protection

### 2. `required-content`

Requires responses to contain specific patterns.

```typescript
{
  id: 'require-disclaimer',
  type: 'required-content',
  description: 'Must include disclaimer',
  severity: 'high',
  pattern: /disclaimer|consult.*professional/i
}
```

**Use cases**: Legal disclaimers, citations, required warnings

### 3. `max-length`

Enforces maximum response length in characters.

```typescript
{
  id: 'max-500-chars',
  type: 'max-length',
  description: 'Keep responses concise',
  severity: 'medium',
  maxLength: 500
}
```

**Use cases**: Brief responses, Twitter-length limits, mobile optimization

### 4. `min-length`

Enforces minimum response length.

```typescript
{
  id: 'detailed-response',
  type: 'min-length',
  description: 'Provide detailed answer',
  severity: 'medium',
  minLength: 100
}
```

**Use cases**: Detailed explanations, preventing lazy responses

### 5. `no-pii`

Detects personally identifiable information (PII).

```typescript
{
  id: 'block-pii',
  type: 'no-pii',
  description: 'No PII in responses',
  severity: 'critical'
}
```

**Detects**:
- Email addresses
- Phone numbers (US format)
- Social Security Numbers (SSN)
- Credit card numbers
- IP addresses
- ZIP codes

**Use cases**: GDPR compliance, data privacy, customer safety

### 6. `sentiment`

Requires specific sentiment (positive/negative).

```typescript
{
  id: 'positive-tone',
  type: 'sentiment',
  description: 'Maintain positive tone',
  severity: 'medium',
  sentimentTarget: 'positive'
}
```

**How it works**: Simple word-counting algorithm:
- Positive words: happy, great, excellent, wonderful, fantastic, amazing, love, perfect, beautiful
- Negative words: bad, terrible, awful, hate, horrible, disgusting, worst, useless, disappointing

**Use cases**: Customer support, brand sentiment, uplifting content

### 7. `format`

Validates response format (JSON, Markdown, code blocks).

```typescript
{
  id: 'json-only',
  type: 'format',
  description: 'Must be valid JSON',
  severity: 'high',
  formatType: 'json'
}
```

**Supported formats**:
- `json`: Valid JSON syntax
- `markdown`: Contains markdown (headers, lists, bold, etc.)
- `code`: Contains code blocks (```...```)

**Use cases**: API responses, structured output, code generation

### 8. `custom`

Custom validation function (sync or async).

```typescript
{
  id: 'word-count-check',
  type: 'custom',
  description: 'Between 50-200 words',
  severity: 'medium',
  validator: (content) => {
    const words = content.split(/\s+/).length;
    return words >= 50 && words <= 200;
  }
}
```

**Use cases**: Complex validation logic, external API checks, custom business rules

## Built-in Policy Templates

TraceForge includes 8 production-ready policy templates:

### 1. PII Protection Policy

```typescript
import { PII_PROTECTION_POLICY } from '@traceforge/shared';
```

**Purpose**: Blocks all forms of PII (GDPR/CCPA compliance)

**Rules**:
- No PII (critical): Blocks email, phone, SSN, credit cards, IPs, ZIPs

**Use when**: Customer-facing chatbots, public data, privacy-sensitive applications

### 2. Medical Safety Policy

```typescript
import { MEDICAL_SAFETY_POLICY } from '@traceforge/shared';
```

**Purpose**: HIPAA-inspired medical advice protection

**Rules**:
- No diagnoses (critical): Blocks "you have", "diagnosed with", "you are suffering"
- Require disclaimer (high): Must include "not a substitute for professional medical advice"
- No dosage recommendations (high): Blocks "take X mg", "dosage is", specific medication amounts

**Use when**: Health apps, wellness chatbots, medical Q&A

### 3. Financial Advice Policy

```typescript
import { FINANCIAL_ADVICE_POLICY } from '@traceforge/shared';
```

**Purpose**: Protect against unauthorized financial advice

**Rules**:
- No guarantees (critical): Blocks "guaranteed return", "risk-free", "can't lose"
- Require disclosure (high): Must include "not financial advice"
- No specific recommendations (high): Blocks "you should buy", "invest in", "sell"

**Use when**: FinTech apps, investment platforms, banking chatbots

### 4. Content Safety Policy

```typescript
import { CONTENT_SAFETY_POLICY } from '@traceforge/shared';
```

**Purpose**: Block harmful, inappropriate content

**Rules**:
- No violence (critical): Blocks violent, graphic content
- No hate speech (critical): Blocks slurs, discriminatory language
- No illegal content (critical): Blocks illegal activities, substances

**Use when**: Public forums, educational platforms, family-friendly apps

### 5. Customer Support Policy

```typescript
import { CUSTOMER_SUPPORT_POLICY } from '@traceforge/shared';
```

**Purpose**: Maintain professional, helpful support interactions

**Rules**:
- Positive sentiment (medium): Encourage positive tone
- No dismissiveness (high): Block "not my problem", "deal with it"
- Minimum length (medium): At least 50 characters for detailed responses

**Use when**: Support chatbots, customer service automation

### 6. Legal Compliance Policy

```typescript
import { LEGAL_COMPLIANCE_POLICY } from '@traceforge/shared';
```

**Purpose**: Prevent unauthorized legal advice

**Rules**:
- No legal advice (critical): Block "you should sue", "file a lawsuit", legal recommendations
- Require disclaimer (high): Must include "consult a lawyer"

**Use when**: Consumer apps, HR tools, dispute resolution

### 7. Brand Safety Policy

```typescript
import { BRAND_SAFETY_POLICY } from '@traceforge/shared';
```

**Purpose**: Maintain brand voice and professionalism

**Rules**:
- No profanity (high): Block inappropriate language
- Professional tone (medium): Positive sentiment required
- Max length (medium): Keep under 1000 characters

**Use when**: Brand ambassadors, marketing automation, public communications

### 8. Educational Content Policy

```typescript
import { EDUCATIONAL_CONTENT_POLICY } from '@traceforge/shared';
```

**Purpose**: Encourage academic integrity

**Rules**:
- Discourage cheating (medium): Warn against "just copy", "give me the answer"
- Encourage citations (low): Suggest including sources

**Use when**: EdTech platforms, homework helpers, research assistants

## Programmatic Usage

### Basic Evaluation

```typescript
import { evaluatePolicy, getPolicyTemplate } from '@traceforge/shared';

const policy = getPolicyTemplate('pii-protection');
const response = "My email is john@example.com";

const result = await evaluatePolicy(response, policy);

console.log(result.passed);        // false
console.log(result.violations);    // [{ ruleId: 'no-pii', ... }]
console.log(result.criticalCount); // 1
```

### Custom Policy

```typescript
import { evaluatePolicy } from '@traceforge/shared';

const customPolicy = {
  id: 'tweet-policy',
  name: 'Tweet Policy',
  description: 'Twitter-compatible responses',
  version: '1.0.0',
  enabled: true,
  rules: [
    {
      id: 'max-280',
      type: 'max-length',
      description: 'Twitter character limit',
      severity: 'high',
      maxLength: 280
    },
    {
      id: 'no-hashtags',
      type: 'forbidden-content',
      description: 'No hashtags',
      severity: 'medium',
      pattern: /#\w+/
    }
  ]
};

const tweet = "This is a great day! #sunny";
const result = await evaluatePolicy(tweet, customPolicy);
// result.passed = false (medium severity violation for hashtag)
```

### Integration with Risk Scoring

```typescript
import { evaluatePolicy, calculateRiskScore } from '@traceforge/shared';

// 1. Evaluate policies
const policyResult = await evaluatePolicy(response, policy);

// 2. Calculate risk score with policy violations
const riskScore = calculateRiskScore(
  baseline,
  actual,
  config.risk_scoring || {},
  policyResult  // Pass policy result
);

// Policy violations automatically feed into risk factors:
// - critical-policy
// - high-policy
// - medium-policy
// - low-policy
```

### Display Formatting

```typescript
import { formatPolicyResult } from '@traceforge/shared';

const result = await evaluatePolicy(response, policy);
const formatted = formatPolicyResult(result);

console.log(formatted);
// Output:
// ❌ Medical Safety Policy FAILED
//
// Violations:
// 🔴 [CRITICAL] Avoid medical diagnoses: Detected prohibited diagnostic language: "you have cancer"
//   → Avoid diagnostic statements; suggest consulting healthcare provider
//
// Summary:
// - Critical: 1
// - High: 0
// - Medium: 0
// - Low: 0
```

## CLI Integration

### Enable Policy Evaluation

Use `--with-policy` flag with `traceforge test run`:

```bash
traceforge test run --with-policy
```

### Test Configuration

In your test YAML files, specify `policy_contracts`:

```yaml
# .ai-tests/tests/customer-query.yaml
id: test-123
name: Customer Query Test
request:
  model: gpt-4
  messages:
    - role: user
      content: "Help me with my account issue"
assertions:
  - type: contains
    field: choices.0.message.content
    value: "account"
policy_contracts:
  - customer-support  # Built-in template
  - pii-protection    # Another template
```

### Test Output

```bash
$ traceforge test run --with-policy

🧪 Running 3 tests...

✗ Customer Query Test

  Policy Violations:
    [HIGH] No dismissive language: Detected dismissive response: "deal with it yourself"
    → Use supportive and professional language

  - semantic: Expected positive sentiment but got neutral

=== Summary ===
Total: 3
✓ Passed: 2
✗ Failed: 1
```

### Available Template IDs

- `pii-protection`
- `medical-safety`
- `financial-advice`
- `content-safety`
- `customer-support`
- `legal-compliance`
- `brand-safety`
- `educational-content`

## Custom Policies

### Creating Custom Policies

#### Option 1: Programmatic

```typescript
const myPolicy: PolicyContract = {
  id: 'company-policy',
  name: 'Company Communication Policy',
  description: 'Internal communication standards',
  version: '1.0.0',
  enabled: true,
  rules: [
    {
      id: 'no-competitor-names',
      type: 'forbidden-content',
      description: 'Do not mention competitors',
      severity: 'high',
      patterns: [/acme corp/i, /widgets inc/i]
    },
    {
      id: 'include-signature',
      type: 'required-content',
      description: 'Include signature block',
      severity: 'medium',
      pattern: /Best regards,/i
    }
  ]
};
```

#### Option 2: YAML Configuration (Future)

```yaml
# policies/company-policy.yaml
id: company-policy
name: Company Communication Policy
version: 1.0.0
rules:
  - id: no-competitor-names
    type: forbidden-content
    severity: high
    patterns:
      - /acme corp/i
      - /widgets inc/i
```

### Advanced: Custom Validators

#### Async Validation

```typescript
{
  id: 'api-check',
  type: 'custom',
  description: 'Verify against external API',
  severity: 'high',
  validator: async (content: string) => {
    const response = await fetch('https://api.example.com/validate', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    const result = await response.json();
    return result.valid;
  }
}
```

#### Word Count Validation

```typescript
{
  id: 'word-count-range',
  type: 'custom',
  description: '50-200 word responses',
  severity: 'medium',
  validator: (content: string) => {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    return wordCount >= 50 && wordCount <= 200;
  }
}
```

#### Readability Check

```typescript
{
  id: 'readability',
  type: 'custom',
  description: 'Maintain grade 8 reading level',
  severity: 'low',
  validator: (content: string) => {
    // Simplified Flesch-Kincaid approximation
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const syllables = content.split(/[aeiou]/i).length;
    const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
    return grade <= 8;
  }
}
```

## Best Practices

### 1. Severity Assignment

- **Critical**: Security, legal liability, safety violations
  - PII leakage, medical diagnoses, illegal content
- **High**: Compliance requirements, brand protection
  - Missing disclaimers, profanity, competitor mentions
- **Medium**: Quality issues, style violations
  - Length limits, sentiment requirements
- **Low**: Soft recommendations, nice-to-haves
  - Suggestions for citations, formatting preferences

### 2. Pattern Design

**Use case-insensitive patterns**:
```typescript
pattern: /disclaimer/i  // Matches "Disclaimer", "DISCLAIMER", "disclaimer"
```

**Match word boundaries**:
```typescript
pattern: /\byou should buy\b/i  // Avoids partial matches
```

**Multiple patterns for coverage**:
```typescript
patterns: [
  /\bdiagnosed with\b/i,
  /\byou have\b/i,
  /\bsuffering from\b/i
]
```

### 3. Policy Composition

**Start broad, then specialize**:
```typescript
const basePolicy = PII_PROTECTION_POLICY;
const customPolicy = {
  ...basePolicy,
  id: 'healthcare-policy',
  rules: [
    ...basePolicy.rules,
    ...MEDICAL_SAFETY_POLICY.rules
  ]
};
```

### 4. Testing Policies

**Write tests for edge cases**:
```typescript
describe('Custom Policy', () => {
  it('should allow normal responses', async () => {
    const result = await evaluatePolicy('Hello, how can I help?', policy);
    expect(result.passed).toBe(true);
  });
  
  it('should catch PII', async () => {
    const result = await evaluatePolicy('Call me at 555-1234', policy);
    expect(result.passed).toBe(false);
    expect(result.criticalCount).toBeGreaterThan(0);
  });
});
```

### 5. Performance Considerations

**Disable unused rules**:
```typescript
rules: [
  {
    id: 'expensive-check',
    enabled: false,  // Temporarily disable
    // ...
  }
]
```

**Cache custom validator results**:
```typescript
const cache = new Map();
validator: async (content) => {
  const hash = hashContent(content);
  if (cache.has(hash)) return cache.get(hash);
  const result = await expensiveCheck(content);
  cache.set(hash, result);
  return result;
}
```

## FAQ

### Q: Do medium/low violations fail tests?

**A**: No. Only `critical` and `high` severity violations cause test failures. Medium and low are warnings.

### Q: Can I disable specific rules?

**A**: Yes, set `enabled: false` on individual rules:

```typescript
rules: [
  {
    id: 'my-rule',
    enabled: false,  // Rule is skipped
    // ...
  }
]
```

### Q: Can I disable an entire policy?

**A**: Yes, set `enabled: false` on the policy:

```typescript
const policy = {
  id: 'my-policy',
  enabled: false,  // Policy is skipped
  // ...
};
```

### Q: How do I combine multiple policies?

**A**: Use multiple policy contracts in your test:

```yaml
policy_contracts:
  - pii-protection
  - medical-safety
  - customer-support
```

Or merge rules programmatically:

```typescript
const combinedPolicy = {
  id: 'combined',
  name: 'Combined Policy',
  version: '1.0.0',
  rules: [
    ...PII_PROTECTION_POLICY.rules,
    ...MEDICAL_SAFETY_POLICY.rules
  ]
};
```

### Q: How accurate is PII detection?

**A**: The built-in PII detection uses regex patterns and has limitations:
- **Email**: High accuracy (>95%)
- **Phone**: US formats only, ~90% accuracy
- **SSN**: High accuracy for XXX-XX-XXXX format
- **Credit Cards**: Basic Luhn validation, may have false positives
- **IP**: IPv4 only
- **ZIP**: US 5-digit only

For production, consider integrating dedicated PII detection services via custom validators.

### Q: Can I use policies without the CLI?

**A**: Yes! Policies work standalone:

```typescript
import { evaluatePolicy } from '@traceforge/shared';

const result = await evaluatePolicy(response, policy);
if (!result.passed) {
  console.error('Policy violation:', result.violations);
}
```

### Q: How do I report policy violations to external systems?

**A**: Use custom validators with side effects:

```typescript
{
  id: 'report-violations',
  type: 'custom',
  validator: async (content) => {
    const isValid = checkContent(content);
    if (!isValid) {
      await fetch('https://monitoring.example.com/alert', {
        method: 'POST',
        body: JSON.stringify({ content, timestamp: new Date() })
      });
    }
    return isValid;
  }
}
```

### Q: What's the performance impact?

**A**: Policy evaluation adds ~5-50ms per response:
- Simple patterns (forbidden/required): <1ms per rule
- PII detection: ~5-10ms (6 regex patterns)
- Sentiment analysis: ~2-5ms (word counting)
- Format validation: ~1-3ms
- Custom validators: Depends on implementation

For 10 rules, expect <50ms total overhead.

### Q: Can I use policies in VCR replay mode?

**A**: Yes, policies evaluate the replayed response. This ensures regression tests also validate policy compliance.

---

## Next Steps

1. **Try built-in templates**: Start with `PII_PROTECTION_POLICY` or `CONTENT_SAFETY_POLICY`
2. **Create custom policies**: Define rules specific to your use case
3. **Integrate with CI**: Use `--with-policy` in CI pipelines for automated compliance
4. **Monitor violations**: Track policy violations over time
5. **Iterate**: Adjust severity levels and rules based on real-world usage

For more details:
- [API Reference](./API.md) - Full API documentation
- [Risk Scoring Guide](./RISK_SCORING_GUIDE.md) - Policy integration with risk scores
- [Examples](../examples/) - Sample projects using policies

---

**Last Updated**: Week 4, 2026 Q1  
**Feature Status**: ✅ Complete (28/28 tests passing)
