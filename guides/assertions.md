# Assertion Types

Comprehensive guide to all 8 assertion types supported by TraceForge.

---

## Overview

Assertions validate that AI model responses meet specific criteria. TraceForge supports 8 assertion types, each designed for different validation scenarios.

**All assertions have:**
- `type` - The assertion type identifier
- `weight` (optional) - Relative importance for scoring (default: 1.0)

**Quick Reference:**

| Type | Purpose | Best For |
|------|---------|----------|
| `exact` | Exact text match | Deterministic outputs |
| `contains` | Substring presence | Key terms/phrases |
| `regex` | Pattern matching | Structured formats |
| `semantic` | Meaning similarity | Paraphrased content |
| `json-schema` | JSON validation | Structured data |
| `json-subset` | Partial JSON match | Flexible JSON checks |
| `latency` | Response time | Performance requirements |
| `no-refusal` | Anti-censorship | Jailbreak detection |

---

## 1. Exact Match (`exact`)

**Purpose:** Validate exact string match (case-sensitive).

**Use when:**
- Response must match exactly (names, numbers, codes)
- Testing deterministic outputs
- Validating fixed-format responses

**Schema:**
```yaml
assertions:
  - type: exact
    expected: "Hello, World!"
    weight: 1.0  # optional
```

**Parameters:**
- `expected` (string, required) - The exact text to match

**Examples:**

```yaml
# Basic exact match
- type: exact
  expected: "The capital of France is Paris."

# Code snippet match
- type: exact
  expected: |
    def hello():
        return "Hello, World!"

# JSON string match
- type: exact
  expected: '{"status": "success", "code": 200}'
```

**Pass/Fail:**
```
✅ PASS: Response === expected
❌ FAIL: Response !== expected (any difference)
```

**Tips:**
- Whitespace and newlines must match exactly
- Use multiline syntax (`|`) for long text
- Consider `contains` for partial matches

---

## 2. Contains (`contains`)

**Purpose:** Check if response contains specific substring(s).

**Use when:**
- Validating presence of key terms
- Checking for required information
- Flexible content validation

**Schema:**
```yaml
assertions:
  - type: contains
    expected:
      - "keyword1"
      - "keyword2"
    weight: 1.0  # optional
```

**Parameters:**
- `expected` (string[] | string, required) - One or more substrings to find

**Examples:**

```yaml
# Single substring
- type: contains
  expected: "Paris"

# Multiple substrings (all required)
- type: contains
  expected:
    - "capital"
    - "France"
    - "Paris"

# Case-sensitive check
- type: contains
  expected: "JavaScript"  # Won't match "javascript"
```

**Pass/Fail:**
```
✅ PASS: Response includes ALL expected substrings
❌ FAIL: Response missing ANY expected substring
```

**Tips:**
- Case-sensitive by default
- All items in array must be present
- Use `regex` for case-insensitive matching

---

## 3. Regular Expression (`regex`)

**Purpose:** Validate response against regex pattern.

**Use when:**
- Checking structured formats (email, phone, URL)
- Pattern-based validation
- Case-insensitive matching
- Flexible text matching

**Schema:**
```yaml
assertions:
  - type: regex
    pattern: "^[A-Z][a-z]+ is the capital"
    flags: "i"  # optional: i, m, s, u, etc.
    weight: 1.0  # optional
```

**Parameters:**
- `pattern` (string, required) - Regular expression pattern
- `flags` (string, optional) - Regex flags (`i` = case-insensitive, `m` = multiline, `s` = dotall)

**Examples:**

```yaml
# Email validation
- type: regex
  pattern: "^[\\w.-]+@[\\w.-]+\\.[a-z]{2,}$"
  flags: "i"

# Phone number (US format)
- type: regex
  pattern: "\\(\\d{3}\\) \\d{3}-\\d{4}"

# URL validation
- type: regex
  pattern: "https?://[\\w.-]+(\\.[\\w.-]+)+(/[\\w.-]*)*"

# Case-insensitive keyword
- type: regex
  pattern: "paris"
  flags: "i"  # Matches "Paris", "PARIS", "paris"

# Date format (YYYY-MM-DD)
- type: regex
  pattern: "\\d{4}-\\d{2}-\\d{2}"

# Code block detection
- type: regex
  pattern: "```[\\w]*\\n[\\s\\S]+?```"
  flags: "m"
```

**Pass/Fail:**
```
✅ PASS: Response matches regex pattern
❌ FAIL: Response doesn't match pattern
```

**Tips:**
- Escape special characters with `\\` in YAML
- Use `flags: "i"` for case-insensitive
- Test patterns at regex101.com
- Common flags: `i` (case-insensitive), `m` (multiline), `s` (dotall), `g` (global)

---

## 4. Semantic Similarity (`semantic`)

**Purpose:** Validate meaning/intent similarity using embeddings.

**Use when:**
- Accepting paraphrased responses
- Validating intent, not exact words
- Testing conversational AI
- Comparing conceptual similarity

**Schema:**
```yaml
assertions:
  - type: semantic
    expected: "Paris is the capital city of France."
    threshold: 0.85  # optional, default: 0.8
    weight: 1.0  # optional
```

**Parameters:**
- `expected` (string, required) - Reference text for comparison
- `threshold` (number, optional) - Similarity threshold 0.0-1.0 (default: 0.8)

**Examples:**

```yaml
# Basic semantic check
- type: semantic
  expected: "The capital of France is Paris."
  threshold: 0.85

# Flexible phrasing
- type: semantic
  expected: "Explain recursion in programming."
  threshold: 0.75
  # Will match:
  #  - "Recursion is when a function calls itself"
  #  - "A recursive function invokes itself"
  #  - "In programming, recursion means self-invocation"

# Intent matching
- type: semantic
  expected: "I want to book a flight to New York."
  threshold: 0.8
  # Will match:
  #  - "I'd like to reserve a plane ticket to NYC"
  #  - "Book me a flight to New York City"
```

**How it works:**
1. Generate embeddings for expected and actual response
2. Calculate cosine similarity
3. Pass if similarity ≥ threshold

**Threshold Guidelines:**
- `0.95+` - Very strict, nearly identical meaning
- `0.85-0.95` - Similar meaning with minor variations
- `0.75-0.85` - Conceptually similar, different phrasing
- `0.60-0.75` - Loose similarity, related topics
- `<0.60` - Too loose, unrelated content may pass

**Pass/Fail:**
```
✅ PASS: Similarity ≥ threshold
❌ FAIL: Similarity < threshold
```

**Tips:**
- Use higher thresholds (0.9+) for precise meaning
- Use lower thresholds (0.7-0.8) for flexible responses
- Semantic matching requires OpenAI API access
- Test different thresholds to find optimal value

---

## 5. JSON Schema (`json-schema`)

**Purpose:** Validate JSON response against JSON Schema.

**Use when:**
- Structured JSON responses
- API response validation
- Type checking
- Required field validation

**Schema:**
```yaml
assertions:
  - type: json-schema
    schema:
      type: object
      required: ["name", "age"]
      properties:
        name:
          type: string
        age:
          type: number
    weight: 1.0  # optional
```

**Parameters:**
- `schema` (object, required) - JSON Schema definition

**Examples:**

```yaml
# Basic object validation
- type: json-schema
  schema:
    type: object
    required: ["status", "data"]
    properties:
      status:
        type: string
        enum: ["success", "error"]
      data:
        type: object

# Array validation
- type: json-schema
  schema:
    type: array
    items:
      type: object
      required: ["id", "name"]
      properties:
        id:
          type: integer
        name:
          type: string

# Nested object
- type: json-schema
  schema:
    type: object
    required: ["user"]
    properties:
      user:
        type: object
        required: ["email", "profile"]
        properties:
          email:
            type: string
            format: email
          profile:
            type: object
            properties:
              age:
                type: integer
                minimum: 0
                maximum: 120

# Complex validation
- type: json-schema
  schema:
    type: object
    required: ["results"]
    properties:
      results:
        type: array
        minItems: 1
        items:
          type: object
          required: ["score", "text"]
          properties:
            score:
              type: number
              minimum: 0
              maximum: 1
            text:
              type: string
              minLength: 1
```

**Supported Features:**
- Types: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`
- Validation: `required`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`, `format`
- Composition: `allOf`, `anyOf`, `oneOf`, `not`
- Nested objects and arrays

**Pass/Fail:**
```
✅ PASS: JSON response valid per schema
❌ FAIL: JSON invalid or schema violation
```

**Tips:**
- Test schemas at jsonschemavalidator.net
- Use `required` for mandatory fields
- Combine with `json-subset` for flexible checks
- See [JSON Schema docs](https://json-schema.org/)

---

## 6. JSON Subset (`json-subset`)

**Purpose:** Verify response contains expected JSON structure (partial match).

**Use when:**
- Response has extra fields (lenient validation)
- Checking for specific key-value pairs
- Flexible API testing

**Schema:**
```yaml
assertions:
  - type: json-subset
    expected:
      status: "success"
      code: 200
    weight: 1.0  # optional
```

**Parameters:**
- `expected` (object, required) - Subset of JSON to match

**Examples:**

```yaml
# Basic subset check
- type: json-subset
  expected:
    status: "success"
  # Passes if response contains: {"status": "success", "data": {...}, ...}

# Nested subset
- type: json-subset
  expected:
    user:
      email: "test@example.com"
  # Passes if response.user.email === "test@example.com"
  # Other user fields can exist

# Array item check
- type: json-subset
  expected:
    results:
      - id: 1
      - id: 2
  # Passes if results array contains objects with id: 1 and id: 2

# Multiple fields
- type: json-subset
  expected:
    status: "success"
    code: 200
    data:
      count: 5
```

**Matching Rules:**
- All specified keys must exist
- All specified values must match exactly
- Extra keys in response are ignored (allowed)
- Nested structures checked recursively

**Difference from `json-schema`:**
- `json-schema` = Strict validation of entire structure
- `json-subset` = Lenient validation of specific fields

**Pass/Fail:**
```
✅ PASS: Response contains all expected keys/values
❌ FAIL: Missing keys or mismatched values
```

**Tips:**
- Use for API responses with variable fields
- Combine with `json-schema` for strict + flexible checks
- Works with deeply nested structures

---

## 7. Latency (`latency`)

**Purpose:** Ensure response time is within acceptable limit.

**Use when:**
- Performance requirements
- SLA validation
- Load testing
- User experience guarantees

**Schema:**
```yaml
assertions:
  - type: latency
    threshold: 2000  # milliseconds
    weight: 0.5  # optional, often lower priority
```

**Parameters:**
- `threshold` (number, required) - Maximum acceptable latency in milliseconds

**Examples:**

```yaml
# Fast response requirement
- type: latency
  threshold: 500  # 500ms max

# Standard API timing
- type: latency
  threshold: 2000  # 2 seconds max

# Lenient for complex queries
- type: latency
  threshold: 10000  # 10 seconds max
  weight: 0.3  # Lower weight as it's less critical

# Critical performance
- type: latency
  threshold: 1000
  weight: 2.0  # Higher weight, very important
```

**Measurement:**
- Starts when request sent to proxy
- Ends when response fully received
- Includes network latency + model processing

**Pass/Fail:**
```
✅ PASS: Actual latency ≤ threshold
❌ FAIL: Actual latency > threshold
```

**Threshold Guidelines:**
- `< 500ms` - Real-time interactions (chat, autocomplete)
- `500-2000ms` - Standard API calls
- `2000-5000ms` - Complex queries
- `5000-10000ms` - Heavy processing (image gen, long context)
- `> 10000ms` - Batch operations only

**Tips:**
- Network conditions affect results
- Test multiple times for consistency
- Use lower weight for less critical timing
- Consider provider-specific benchmarks

---

## 8. No Refusal (`no-refusal`)

**Purpose:** Detect if model refused the request (censorship detection).

**Use when:**
- Testing jailbreak resistance
- Validating content policies
- Monitoring over-censorship
- Safety testing

**Schema:**
```yaml
assertions:
  - type: no-refusal
    weight: 2.0  # optional, often high priority
```

**Parameters:**
- No parameters required

**Refusal Patterns Detected:**
- "I cannot..."
- "I'm not able to..."
- "I can't assist with..."
- "I don't feel comfortable..."
- "I'm sorry, but I cannot..."
- "As an AI, I'm not able to..."
- "I must decline..."

**Examples:**

```yaml
# Basic refusal check
- type: no-refusal
  weight: 2.0

# Combined with content check
- type: no-refusal
- type: contains
  expected: "recipe for chocolate cake"

# High-priority refusal check
- type: no-refusal
  weight: 5.0  # Very important to not refuse
```

**Pass/Fail:**
```
✅ PASS: Response doesn't contain refusal patterns
❌ FAIL: Response contains refusal phrases
```

**Common Refusals:**
```
❌ "I cannot provide instructions on..."
❌ "I'm not able to assist with that request."
❌ "I can't help with..."
❌ "As an AI language model, I cannot..."
❌ "I don't feel comfortable generating..."
```

**Legitimate Responses:**
```
✅ "Here's how to make chocolate cake..."
✅ "The Python code for this is..."
✅ "To solve this math problem..."
```

**Tips:**
- Use with `contains` to ensure actual answer
- High weight for critical non-censorship tests
- Monitor for false positives ("I can do that!")
- Useful for A/B testing content policies

---

## Assertion Weights

Weights control relative importance for scoring.

**How weights work:**
1. Each assertion has a weight (default: 1.0)
2. Score = (Σ passed assertions' weights) / (Σ total weights)
3. Test passes if score ≥ pass threshold

**Example:**
```yaml
assertions:
  - type: contains
    expected: "Paris"
    weight: 1.0  # Standard importance
  
  - type: latency
    threshold: 2000
    weight: 0.5  # Less important
  
  - type: no-refusal
    weight: 2.0  # Very important

# Scoring:
# - All pass: (1.0 + 0.5 + 2.0) / 3.5 = 100%
# - Latency fails: (1.0 + 2.0) / 3.5 = 85.7%
# - Refusal fails: (1.0 + 0.5) / 3.5 = 42.9% ❌
```

**Weight Guidelines:**
- `0.1-0.5` - Nice-to-have (performance, style)
- `1.0` - Standard (default, most assertions)
- `1.5-2.0` - Important (correctness, key features)
- `3.0+` - Critical (must-pass, safety)

---

## Combining Assertions

Use multiple assertions for comprehensive validation.

**Example: Chat Completion Test**
```yaml
tests:
  - name: "Get capital of France"
    request:
      provider: openai
      model: gpt-4
      messages:
        - role: user
          content: "What is the capital of France?"
    
    assertions:
      # Content validation
      - type: contains
        expected: "Paris"
        weight: 2.0
      
      # No refusal
      - type: no-refusal
        weight: 3.0
      
      # Performance
      - type: latency
        threshold: 2000
        weight: 0.5
      
      # Semantic correctness
      - type: semantic
        expected: "Paris is the capital city of France."
        threshold: 0.85
        weight: 1.5
```

**Example: JSON API Test**
```yaml
tests:
  - name: "Get user data"
    request:
      provider: openai
      model: gpt-4
      messages:
        - role: user
          content: "Return user data as JSON"
    
    assertions:
      # Schema validation
      - type: json-schema
        schema:
          type: object
          required: ["id", "name", "email"]
          properties:
            id:
              type: integer
            name:
              type: string
            email:
              type: string
              format: email
        weight: 2.0
      
      # Subset check
      - type: json-subset
        expected:
          id: 123
        weight: 1.0
      
      # Performance
      - type: latency
        threshold: 1500
        weight: 0.5
```

---

## Best Practices

1. **Start Simple**: Begin with `contains` or `exact`, add complexity as needed

2. **Layer Validations**: Combine multiple assertion types for robust testing
   ```yaml
   - type: no-refusal  # Ensure response
   - type: contains    # Check key content
   - type: latency     # Validate performance
   ```

3. **Use Appropriate Weights**: Higher weight = more important
   - Critical correctness: 2.0-3.0
   - Standard checks: 1.0
   - Nice-to-have: 0.3-0.5

4. **Choose Right Type**:
   - Deterministic → `exact`
   - Flexible text → `contains` or `semantic`
   - Structured data → `json-schema` or `json-subset`
   - Format validation → `regex`
   - Performance → `latency`
   - Safety → `no-refusal`

5. **Test Assertions**: Validate assertions work as expected before production

6. **Document Intent**: Add comments explaining assertion purpose
   ```yaml
   # Ensure model provides actual answer, not refusal
   - type: no-refusal
     weight: 3.0
   ```

---

## Related Documentation

- [Test Format](./baseline-format.md) - Complete test file structure
- [Getting Started](./getting-started.md) - Quick start guide
- [CLI Reference](./cli.md) - Running tests with CLI
- [VCR Usage](./VCR_USAGE.md) - Recording and replay
