# Semantic Assertions - Quick Start Guide

## Overview

Semantic assertions let you test AI behavior by **meaning**, not just exact text matching. They use OpenAI embeddings to understand if two texts convey the same idea, even when worded differently.

## Prerequisites

```bash
# Required: Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Optional: Custom OpenAI endpoint
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

## Basic Usage

### 1. Semantic Similarity (`semantic`)

Checks if response conveys the same meaning as expected text:

```yaml
assertions:
  - type: semantic
    expected: "Paris is the capital of France"
    threshold: 0.85  # 0.0-1.0 similarity score
    description: "Response should indicate Paris is France's capital"
```

**Examples that would pass:**
- "The capital of France is Paris"
- "France's capital city is Paris"  
- "Paris serves as France's capital"

**Threshold Guidelines:**
- `0.90-1.00` - Very strict (near-identical meaning)
- `0.80-0.89` - Strict (same core idea)
- `0.70-0.79` - Moderate (same topic/concept)
- `0.60-0.69` - Loose (related topics)
- `<0.60` - Very loose (may give false positives)

### 2. Semantic Contradiction (`semantic-contradiction`)

Detects if response contradicts forbidden statements:

```yaml
assertions:
  - type: semantic-contradiction
    forbidden:
      - "Paris is not in France"
      - "France has no capital"
      - "The capital is Berlin"
    threshold: 0.70  # Similarity above this = contradiction detected
    description: "Should not contradict basic facts"
```

**Use cases:**
- Prevent AI from stating false information
- Ensure responses don't violate guidelines
- Catch contradictory statements

## Field Selectors

Test specific parts of the response:

```yaml
assertions:
  - type: semantic
    field: "choices.0.message.content"  # JSONPath
    expected: "The answer is 42"
    threshold: 0.80
```

## Configuration

### Global Config (`.ai-tests/config.yaml`)

```yaml
embedding:
  provider: openai
  model: text-embedding-3-small  # Fast and cost-effective
  api_key_env_var: OPENAI_API_KEY
  cache_enabled: true  # Cache for deterministic CI runs
  cache_dir: .ai-tests/embeddings
```

### Per-Test Config

```yaml
assertions:
  - type: semantic
    expected: "Some text"
    threshold: 0.85
    embedding_model: "text-embedding-3-large"  # Override model
    use_cache: false  # Disable cache for this assertion
```

## Cost & Performance

### Costs
- **text-embedding-3-small**: ~$0.00002 per 1K tokens (~$0.01 per 1,000 assertions)
- **text-embedding-3-large**: ~$0.00013 per 1K tokens (~$0.06 per 1,000 assertions)

### Caching
Embeddings are cached to disk by default:
- **First run**: Generates embeddings (costs money)
- **Subsequent runs**: Uses cache (free + fast)
- **Cache location**: `.ai-tests/embeddings/*.json`
- **Cache key**: SHA-256 hash of text

**Tip**: Commit `.ai-tests/embeddings/` to git for deterministic CI runs!

## Common Pitfalls

### ❌ Threshold Too High
```yaml
# BAD: Will fail on minor wording differences
- type: semantic
  expected: "The capital of France is Paris"
  threshold: 0.95  # Too strict!
```

**Fix**: Use `0.80-0.85` for most cases.

### ❌ Comparing Different Topics
```yaml
# BAD: Trying to match completely different concepts
- type: semantic
  expected: "Paris is a city"
  threshold: 0.75
# Response: "The Eiffel Tower is tall" 
# Result: Low similarity, test fails
```

**Fix**: Make sure expected text matches the response topic.

### ❌ Empty Expected Text
```yaml
# BAD: Empty or whitespace-only expected text
- type: semantic
  expected: ""  # ERROR!
  threshold: 0.80
```

**Fix**: Always provide meaningful expected text.

### ❌ Missing API Key
```bash
# ERROR: OPENAI_API_KEY environment variable not set
```

**Fix**:
```bash
export OPENAI_API_KEY="sk-..."
# Or add to .env file
```

## Advanced Patterns

### Multiple Semantic Checks

```yaml
assertions:
  # Check main content
  - type: semantic
    expected: "Plants convert sunlight to energy"
    threshold: 0.70
    description: "Core concept"
  
  # Ensure no false information
  - type: semantic-contradiction
    forbidden:
      - "Animals perform photosynthesis"
      - "Photosynthesis happens in darkness"
    threshold: 0.65
    description: "No scientific errors"
  
  # Traditional assertions still work
  - type: contains
    value: "photosynthesis"
    description: "Must mention the term"
```

### Dynamic Thresholds Based on Use Case

```yaml
# Customer support: Moderate threshold (allow flexibility)
- type: semantic
  expected: "We'll help you reset your password"
  threshold: 0.70

# Legal/Compliance: Strict threshold (exact meaning required)
- type: semantic
  expected: "Terms and conditions apply"
  threshold: 0.90

# Creative content: Loose threshold (general topic match)
- type: semantic
  expected: "Positive sentiment about technology"
  threshold: 0.55
```

## Troubleshooting

### Slow Tests
**Problem**: Tests take a long time  
**Solution**:
1. Enable caching (`use_cache: true`)
2. Reduce concurrency if hitting rate limits
3. Use `text-embedding-3-small` instead of large

### False Positives
**Problem**: Test passes when it shouldn't  
**Solution**:
1. Increase threshold (make it stricter)
2. Add `semantic-contradiction` to catch unwanted meanings
3. Combine with traditional assertions (contains, regex)

### False Negatives
**Problem**: Test fails when it shouldn't  
**Solution**:
1. Lower threshold (be more lenient)
2. Check if expected text matches response topic
3. Review actual similarity score in error message

### API Errors
```
Error: Invalid OpenAI API key. Check OPENAI_API_KEY environment variable.
```

**Solutions**:
- Verify API key is set: `echo $OPENAI_API_KEY`
- Check API key is valid on OpenAI dashboard
- Ensure no extra spaces or quotes in key

```
Error: OpenAI API rate limit exceeded. Please try again later.
```

**Solutions**:
- Wait a few minutes
- Reduce test concurrency
- Enable caching to avoid repeated API calls

## Examples

See working examples in:
- [.ai-tests/tests/semantic-example.yaml](.ai-tests/tests/semantic-example.yaml)
- [test-semantic-integration.js](../test-semantic-integration.js) - Full integration test suite

## Best Practices

1. **✅ Use semantic + traditional assertions together**
   - Semantic for meaning/concept
   - Contains/regex for required terms
   - Token count for brevity

2. **✅ Set appropriate thresholds**
   - Start with 0.80
   - Adjust based on test results
   - Document why you chose a specific threshold

3. **✅ Cache embeddings for CI**
   - Commit `.ai-tests/embeddings/` to version control
   - Ensures deterministic test results
   - Saves money on repeated runs

4. **✅ Add helpful descriptions**
   ```yaml
   - type: semantic
     expected: "..."
     threshold: 0.80
     description: "Why this matters and what it checks"
   ```

5. **✅ Monitor costs**
   - Use `text-embedding-3-small` for most cases
   - Enable caching
   - Review OpenAI usage dashboard monthly

## Getting Help

- 📖 Full docs: [guides/assertions.md](../guides/assertions.md)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/traceforge/issues)
- 💬 Questions: Add `[semantic-assertions]` tag

## What's Next?

Week 3-4 features coming soon:
- `semantic-intent`: LLM-judged intent classification
- `policy`: Enforce behavioral contracts
- Risk scoring: Classify changes by severity

---

**Version**: 2026 Q1 Week 1  
**Last Updated**: January 3, 2026
