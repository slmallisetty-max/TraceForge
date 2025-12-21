# VCR Mode Quick Reference

## Environment Variables

```bash
TRACEFORGE_VCR_MODE=off      # Default - no VCR
TRACEFORGE_VCR_MODE=record   # Record API responses
TRACEFORGE_VCR_MODE=replay   # Replay from cassettes (fail if missing)
TRACEFORGE_VCR_MODE=auto     # Replay if exists, else record

TRACEFORGE_VCR_MATCH=fuzzy   # Default - match on core fields only
TRACEFORGE_VCR_MATCH=exact   # Match on all request parameters

TRACEFORGE_VCR_DIR=.ai-tests/cassettes  # Default cassette directory
```

## CLI Commands

```bash
# Show VCR status and cassette count
traceforge vcr status

# List all cassettes by provider
traceforge vcr list

# Delete all cassettes (requires confirmation)
traceforge vcr clean --yes
```

## Usage Examples

### Record Cassettes
```bash
# Record live API responses
TRACEFORGE_VCR_MODE=record npm test
```

### Replay Cassettes
```bash
# Run tests without API calls
TRACEFORGE_VCR_MODE=replay npm test
```

### Auto Mode
```bash
# Replay existing, record missing
TRACEFORGE_VCR_MODE=auto npm test
```

## CI Configuration

### GitHub Actions
```yaml
- name: Run Tests
  env:
    TRACEFORGE_VCR_MODE: replay
  run: npm test
```

### GitLab CI
```yaml
test:
  script:
    - export TRACEFORGE_VCR_MODE=replay
    - npm test
```

## Cassette Structure

```
.ai-tests/
  cassettes/
    openai/
      a1b2c3d4....json
      e5f6g7h8....json
    anthropic/
      i9j0k1l2....json
```

## Request Matching

### Fuzzy (Default)
- ✅ Provider
- ✅ Model
- ✅ Messages
- ✅ Tools
- ❌ temperature
- ❌ max_tokens
- ❌ other params

### Exact
- ✅ Everything

## Benefits

| Feature | Off Mode | VCR Mode |
|---------|----------|----------|
| API Calls | ✅ Yes | ❌ No |
| API Key | ✅ Required | ❌ Not needed |
| Cost | 💰 Per call | ✅ Free |
| Speed | 🐢 Network latency | ⚡ Instant |
| Deterministic | ❌ No | ✅ Yes |
| Offline | ❌ No | ✅ Yes |

## Troubleshooting

**Error: "VCR replay miss"**
- Run in `record` mode first to create cassettes

**Tests still calling API**
- Verify `TRACEFORGE_VCR_MODE` is set before running

**Cassettes not found**
- Check `TRACEFORGE_VCR_DIR` points to correct directory
- Run `traceforge vcr status` to verify configuration
