# Snapshot Format Specification

This document defines the **canonical format** for AI behavior snapshots in TraceForge.

---

## Overview

Snapshots are the **single source of truth** for AI behavior. They capture every detail needed to verify that AI outputs haven't changed without approval.

**Key Principle:** If any field is missing or invalid, the snapshot is rejected and CI fails.

---

## Complete Snapshot Structure

```json
{
  "version": "1.0.0",
  "snapshots": [
    {
      "id": "abc123def456",
      "timestamp": "2026-01-09T10:30:00Z",
      "source": {
        "file": "src/agents/summarizer.py",
        "line": 12,
        "function": "generate_summary"
      },
      "request": {
        "model": "gpt-4-turbo",
        "messages": [
          {
            "role": "system",
            "content": "You are a precise summarization assistant."
          },
          {
            "role": "user",
            "content": "Summarize: AI is transforming software development"
          }
        ],
        "temperature": 0.0,
        "max_tokens": 100,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0,
        "seed": 42
      },
      "response": {
        "content": "AI is revolutionizing software development through automation.",
        "tokens_used": 12,
        "latency_ms": 450,
        "finish_reason": "stop"
      },
      "hash": "sha256:abcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890"
    }
  ],
  "hash": "sha256:fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
}
```

---

## Field Definitions

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | ✅ Yes | Snapshot format version (semver) |
| `snapshots` | array | ✅ Yes | Array of individual snapshot records |
| `hash` | string | ✅ Yes | SHA-256 hash of all snapshots combined |

### Snapshot Record Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique identifier for this snapshot |
| `timestamp` | string | ✅ Yes | ISO 8601 timestamp of when recorded |
| `source` | object | ✅ Yes | Location in codebase where call originated |
| `request` | object | ✅ Yes | Complete request sent to LLM |
| `response` | object | ✅ Yes | Complete response from LLM |
| `hash` | string | ✅ Yes | SHA-256 hash of this snapshot |

### Source Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | ✅ Yes | Relative path to source file |
| `line` | number | ✅ Yes | Line number where call was made |
| `function` | string | ✅ Yes | Function name containing the call |

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | ✅ Yes | Model identifier (e.g., "gpt-4-turbo") |
| `messages` | array | ✅ Yes* | Chat messages (*or `prompt` for completions) |
| `prompt` | string | ✅ Yes* | Prompt text (*or `messages` for chat) |
| `temperature` | number | ✅ Yes | Temperature setting (0.0-2.0) |
| `max_tokens` | number | ✅ Yes | Maximum tokens to generate |
| `top_p` | number | ⚠️ Optional | Nucleus sampling parameter |
| `frequency_penalty` | number | ⚠️ Optional | Frequency penalty (-2.0-2.0) |
| `presence_penalty` | number | ⚠️ Optional | Presence penalty (-2.0-2.0) |
| `seed` | number | ⚠️ Optional | Random seed for determinism |
| `stop` | array | ⚠️ Optional | Stop sequences |
| `tools` | array | ⚠️ Optional | Function calling tools |

### Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ Yes | Text content of response |
| `tokens_used` | number | ✅ Yes | Total tokens consumed |
| `latency_ms` | number | ✅ Yes | Response time in milliseconds |
| `finish_reason` | string | ✅ Yes | Why generation stopped |
| `tool_calls` | array | ⚠️ Optional | Function calls made by model |

---

## Hash Calculation

Hashes ensure snapshot integrity and detect tampering or drift.

### Individual Snapshot Hash

```javascript
const snapshotData = {
  id: snapshot.id,
  timestamp: snapshot.timestamp,
  source: snapshot.source,
  request: snapshot.request,
  response: snapshot.response
};

const hash = crypto
  .createHash('sha256')
  .update(JSON.stringify(snapshotData))
  .digest('hex');
```

### Combined Hash

```javascript
const allSnapshotsData = {
  version: snapshots.version,
  snapshots: snapshots.snapshots.map(s => s.hash)
};

const combinedHash = crypto
  .createHash('sha256')
  .update(JSON.stringify(allSnapshotsData))
  .digest('hex');
```

---

## Validation Rules

### ❌ Invalid Snapshots (CI Fails)

1. **Missing required fields**
   ```json
   {
     "request": {
       "model": "gpt-4"
       // Missing: messages, temperature, max_tokens
     }
   }
   ```

2. **Hash mismatch**
   ```json
   {
     "hash": "abc123...",  // ← Doesn't match computed hash
     "request": {...}
   }
   ```

3. **Partial capture**
   ```json
   {
     "request": {
       "model": "gpt-4",
       "messages": "..."  // ← Should be array, not string
     }
   }
   ```

4. **Invalid types**
   ```json
   {
     "request": {
       "temperature": "0.7"  // ← Should be number, not string
     }
   }
   ```

### ✅ Valid Snapshots

```json
{
  "id": "abc123def456",
  "timestamp": "2026-01-09T10:30:00Z",
  "source": {
    "file": "src/agents/summarizer.py",
    "line": 12,
    "function": "generate_summary"
  },
  "request": {
    "model": "gpt-4-turbo",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "temperature": 0.0,
    "max_tokens": 100
  },
  "response": {
    "content": "Hello! How can I help you?",
    "tokens_used": 10,
    "latency_ms": 450,
    "finish_reason": "stop"
  },
  "hash": "sha256:..."
}
```

---

## Storage Format

Snapshots are stored as **Git-committable JSON files**:

```
.ai-snapshots/
├── openai/
│   ├── abc123def456.json
│   ├── def789ghi012.json
│   └── ...
├── anthropic/
│   ├── xyz789abc123.json
│   └── ...
└── manifest.json
```

### Manifest File

```json
{
  "version": "1.0.0",
  "created_at": "2026-01-09T10:00:00Z",
  "updated_at": "2026-01-09T14:30:00Z",
  "snapshots": [
    {
      "id": "abc123def456",
      "provider": "openai",
      "file": "openai/abc123def456.json",
      "hash": "sha256:..."
    }
  ],
  "hash": "sha256:..."
}
```

---

## Determinism Requirements

For snapshots to be meaningful, AI calls **must be deterministic**:

### Required Settings

```json
{
  "temperature": 0.0,    // ← Must be zero
  "seed": 42             // ← Use a fixed seed
}
```

### Invalid Settings (Non-Deterministic)

```json
{
  "temperature": 0.7,    // ❌ Non-zero temperature
  // Missing seed          ❌ No seed specified
}
```

### Detection

If TraceForge detects variance across multiple runs of the same prompt:

```bash
❌ Non-deterministic behavior detected
   5/10 runs produced different outputs
   → CI fails
```

---

## Backward Compatibility

Snapshots **do not** support backward compatibility:

- ❌ No "best effort" parsing
- ❌ No default values for missing fields
- ❌ No graceful degradation

**Rationale:** Incomplete snapshots are worse than no snapshots. They create false confidence.

---

## Migration Path

When changing snapshot format versions:

1. **Reject old format snapshots**
   ```bash
   ❌ Snapshot version 0.9.0 is no longer supported
      Current version: 1.0.0
      Re-record all snapshots
   ```

2. **Provide migration tool**
   ```bash
   $ traceforge snapshot migrate --from 0.9.0 --to 1.0.0
   ```

3. **No automatic migration in CI**
   - CI always uses the latest format
   - Old snapshots cause hard failures

---

## Design Principles

1. **No Partial Snapshots** - All fields required or snapshot is invalid
2. **No Inference** - Don't guess missing values
3. **Deterministic Hashing** - Same input always produces same hash
4. **Git-Friendly** - Human-readable JSON, line-based diffs
5. **Fail Hard** - Invalid snapshot = CI failure, no warnings

**If it's not captured, it didn't happen. If it's not valid, CI fails.**
