# Baseline and Test Format Documentation

This document describes the structure and format of baseline files and test definitions in TraceForge.baseline.

## Overview

TraceForge uses **baseline files** to define deterministic tests for LLM interactions. Baselines are YAML files that specify:
- Test metadata
- Request payloads
- Assertions to verify responses

## File Location

Baseline files are stored in:
```
.ai-tests/baselines/
```

## File Naming Convention

Baselines use descriptive names with `.yaml` or `.yml` extension:

```
<test-suite-name>.yaml
```

Examples:
- `chat-completions.yaml`
- `sentiment-analysis.yaml`
- `code-generation.yaml`

## Baseline Structure

### Single Test Format

```yaml
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
name: "Basic chat completion"
description: "Tests a simple question-answer interaction"
tags:
  - chat
  - basic
timeout: 30000  # milliseconds

# Optional fixtures
fixtures:
  setup:
    - "npm run seed-db"
  teardown:
    - "npm run cleanup"
  env:
    TEST_MODE: "true"

# Request payload
request:
  model: "gpt-4"
  messages:
    - role: "system"
      content: "You are a helpful assistant."
    - role: "user"
      content: "What is 2+2?"
  temperature: 0
  max_tokens: 50

# Assertions
assertions:
  - type: "contains"
    field: "choices.0.message.content"
    value: "4"
  
  - type: "exact"
    field: "choices.0.finish_reason"
    value: "stop"
  
  - type: "latency"
    max: 5000  # milliseconds
```

### Multiple Tests Format

```yaml
tests:
  - id: "test-001"
    name: "Addition test"
    request:
      model: "gpt-4"
      messages:
        - role: "user"
          content: "What is 2+2?"
      temperature: 0
    assertions:
      - type: "contains"
        field: "choices.0.message.content"
        value: "4"

  - id: "test-002"
    name: "Multiplication test"
    request:
      model: "gpt-4"
      messages:
        - role: "user"
          content: "What is 3*3?"
      temperature: 0
    assertions:
      - type: "contains"
        field: "choices.0.message.content"
        value: "9"
```

## Test Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Test name (unique identifier) |
| `request` | object | LLM request payload |
| `assertions` | array | List of assertions to verify |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID (auto-generated if not provided) |
| `description` | string | Human-readable test description |
| `tags` | array | Tags for filtering (e.g., `["smoke", "regression"]`) |
| `timeout` | number | Test timeout in milliseconds (default: 30000) |
| `fixtures` | object | Setup/teardown commands and environment |
| `trace_id` | string | Link to a specific captured trace |

## Request Format

The `request` field follows the OpenAI API format:

```yaml
request:
  model: "gpt-4"              # Required: model identifier
  messages:                   # For chat completions
    - role: "system"
      content: "System prompt"
    - role: "user"
      content: "User message"
  temperature: 0.7            # Optional: sampling temperature
  max_tokens: 100             # Optional: token limit
  top_p: 1.0                  # Optional: nucleus sampling
  frequency_penalty: 0        # Optional: frequency penalty
  presence_penalty: 0         # Optional: presence penalty
  stop: ["END"]               # Optional: stop sequences
  stream: false               # Optional: streaming mode
```

## Assertion Types

TraceForge supports 8 assertion types:

### 1. Exact Match

Verifies exact equality.

```yaml
- type: "exact"
  field: "choices.0.finish_reason"
  value: "stop"
```

### 2. Contains

Checks if response contains a substring.

```yaml
- type: "contains"
  field: "choices.0.message.content"
  value: "Paris"
```

### 3. Not Contains

Checks if response does NOT contain a substring.

```yaml
- type: "not_contains"
  field: "choices.0.message.content"
  value: "inappropriate"
```

### 4. Regular Expression

Matches against a regex pattern.

```yaml
- type: "regex"
  field: "choices.0.message.content"
  pattern: "\\d{4}-\\d{2}-\\d{2}"  # Date format YYYY-MM-DD
```

### 5. JSON Path

Extracts and compares using JSONPath.

```yaml
- type: "json_path"
  path: "$.choices[0].message.content"
  value: "Expected content"
```

### 6. Fuzzy Match

Checks semantic similarity (using Levenshtein distance or embeddings).

```yaml
- type: "fuzzy_match"
  field: "choices.0.message.content"
  value: "The capital is Paris"
  threshold: 0.8  # Similarity threshold (0-1)
```

### 7. Token Count

Verifies token usage is within bounds.

```yaml
- type: "token_count"
  min: 10
  max: 100
  field: "usage.total_tokens"  # Optional: defaults to usage.total_tokens
```

### 8. Latency

Checks response time.

```yaml
- type: "latency"
  max: 5000  # milliseconds
```

## Field Paths

Use dot notation to access nested fields:

```yaml
field: "choices.0.message.content"
```

This accesses: `response.choices[0].message.content`

## Fixtures

Fixtures allow setup and teardown actions:

```yaml
fixtures:
  setup:
    - "npm run db:migrate"
    - "npm run seed"
  teardown:
    - "npm run db:cleanup"
  env:
    DATABASE_URL: "postgres://localhost/test"
    API_MODE: "test"
```

## Tags

Use tags to organize and filter tests:

```yaml
tags:
  - smoke         # Quick sanity checks
  - regression    # Full regression suite
  - integration   # Integration tests
  - unit          # Unit-level tests
  - slow          # Tests that take >5 seconds
```

Run tests by tag:
```bash
traceforge test --tags smoke,regression
```

## Complete Example

```yaml
# File: .ai-tests/baselines/sentiment-analysis.yaml

tests:
  - id: "sentiment-positive"
    name: "Positive sentiment detection"
    description: "Verifies the model correctly identifies positive sentiment"
    tags:
      - sentiment
      - classification
    timeout: 10000
    
    request:
      model: "gpt-4"
      messages:
        - role: "system"
          content: "Classify the sentiment as positive, negative, or neutral."
        - role: "user"
          content: "I absolutely love this product! It's amazing!"
      temperature: 0
      max_tokens: 10
    
    assertions:
      - type: "contains"
        field: "choices.0.message.content"
        value: "positive"
      
      - type: "latency"
        max: 5000
      
      - type: "token_count"
        max: 50

  - id: "sentiment-negative"
    name: "Negative sentiment detection"
    description: "Verifies the model correctly identifies negative sentiment"
    tags:
      - sentiment
      - classification
    
    request:
      model: "gpt-4"
      messages:
        - role: "system"
          content: "Classify the sentiment as positive, negative, or neutral."
        - role: "user"
          content: "This is terrible. I'm very disappointed."
      temperature: 0
      max_tokens: 10
    
    assertions:
      - type: "contains"
        field: "choices.0.message.content"
        value: "negative"
```

## Creating Baselines from Traces

Convert a captured trace to a baseline:

```bash
traceforge create-baseline <trace-id> --name "My Test" --output baselines/my-test.yaml
```

This generates a baseline with:
- Request copied from the trace
- Suggested assertions based on the response
- Metadata from the trace

## Running Tests

### Run all tests
```bash
traceforge test
```

### Run specific file
```bash
traceforge test baselines/sentiment.yaml
```

### Run with tags
```bash
traceforge test --tags smoke
```

### Watch mode
```bash
traceforge test --watch
```

### Parallel execution
```bash
traceforge test --parallel 4
```

## Test Output

### Console Output

```
✓ Positive sentiment detection (1.2s)
✓ Negative sentiment detection (1.1s)
✗ Neutral sentiment detection (0.8s)
  - Assertion failed: contains "neutral"
    Expected: "neutral"
    Actual: "positive"

Tests: 2 passed, 1 failed, 3 total
Time: 3.1s
```

### JUnit XML Output

For CI/CD integration:

```bash
traceforge test --reporter junit --output results.xml
```

## Best Practices

1. **Use descriptive names**: Make test names clear and specific
2. **Set appropriate timeouts**: Account for model response times
3. **Use temperature=0 for deterministic tests**: Reduces flakiness
4. **Tag tests appropriately**: Enables selective test execution
5. **Keep baselines in version control**: Track test changes over time
6. **Use fixtures for setup**: Ensure consistent test environments
7. **Start with contains, not exact**: Allows for minor response variations
8. **Add multiple assertions**: Verify different aspects of the response
9. **Document expected behavior**: Use `description` field

## Related Documentation

- [Trace Format](./trace-format.md) - Captured trace structure
- [CLI Reference](./cli.md) - Command-line usage
- [Assertions](./assertions.md) - Detailed assertion documentation
