# Example VCR Usage

This document demonstrates how to use VCR mode for deterministic, offline testing.

## Setup

1. Make sure you have tests created in `.ai-tests/tests/`
2. Set up VCR mode using environment variables

## Recording Cassettes

Record live API responses once:

```bash
# Set VCR to record mode
export TRACEFORGE_VCR_MODE=record

# Run your tests (this will call the real API and save responses)
npx pnpm --filter @traceforge/cli start test run

# Cassettes are saved to .ai-tests/cassettes/{provider}/{hash}.json
```

## Replaying from Cassettes

Run tests without API calls:

```bash
# Set VCR to replay mode
export TRACEFORGE_VCR_MODE=replay

# Run tests (no API calls, uses cassettes)
npx pnpm --filter @traceforge/cli start test run

# No API key needed! Tests run offline!
```

## Auto Mode

Automatically record missing cassettes:

```bash
# Set VCR to auto mode
export TRACEFORGE_VCR_MODE=auto

# If cassette exists: replay
# If cassette missing: record
npx pnpm --filter @traceforge/cli start test run
```

## CI Integration

In your CI pipeline (GitHub Actions, GitLab CI, etc.):

```yaml
- name: Run Tests
  env:
    TRACEFORGE_VCR_MODE: replay
  run: npx pnpm --filter @traceforge/cli start test run
```

**Benefits for CI:**
- ✅ No API keys required
- ✅ Fast execution (no network)
- ✅ Deterministic results
- ✅ Zero API costs

## Managing Cassettes

```bash
# View cassette status
npx pnpm --filter @traceforge/cli start vcr status

# List all cassettes
npx pnpm --filter @traceforge/cli start vcr list

# Delete all cassettes
npx pnpm --filter @traceforge/cli start vcr clean --yes
```

## Cassette Format

Cassettes are stored as JSON files:

```json
{
  "cassette_version": "1.0",
  "provider": "openai",
  "request": {
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "What is 2+2?"
      }
    ]
  },
  "response": {
    "status": 200,
    "headers": {},
    "body": {
      "id": "chatcmpl-...",
      "object": "chat.completion",
      "created": 1702000000,
      "model": "gpt-4o-mini",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "2+2 equals 4."
          },
          "finish_reason": "stop"
        }
      ],
      "usage": {
        "prompt_tokens": 12,
        "completion_tokens": 6,
        "total_tokens": 18
      }
    }
  },
  "recorded_at": "2024-12-21T00:00:00.000Z"
}
```

## Configuration Options

Environment variables:

- `TRACEFORGE_VCR_MODE` - `off` (default), `record`, `replay`, `auto`
- `TRACEFORGE_VCR_MATCH` - `fuzzy` (default), `exact`
- `TRACEFORGE_VCR_DIR` - Cassette directory (default: `.ai-tests/cassettes`)

### Match Modes

**Fuzzy (default):**
- Matches on: provider, model, messages, tools
- Ignores: temperature, max_tokens, etc.
- Best for most use cases

**Exact:**
- Matches on: all request parameters
- Use when testing parameter sensitivity

## Best Practices

1. **Commit cassettes to git** - They're safe (redacted) and enable others to run tests
2. **Use replay mode in CI** - Guarantees deterministic, fast, free tests
3. **Re-record when updating tests** - Use `record` mode when test logic changes
4. **Use fuzzy matching** - Unless you specifically need to test parameter variations
5. **Review cassettes** - Check that sensitive data is properly redacted

## Troubleshooting

### "VCR replay miss: no cassette found"

- **Cause:** Running in `replay` mode but cassette doesn't exist
- **Solution:** Run in `record` mode first to create the cassette

### "Cannot find module '@traceforge/shared'"

- **Cause:** Dependencies not built
- **Solution:** Run `npx pnpm build` first

### Tests still calling API in replay mode

- **Cause:** VCR mode not set correctly
- **Solution:** Verify `TRACEFORGE_VCR_MODE=replay` is set before running tests
