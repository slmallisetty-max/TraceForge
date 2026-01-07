# Trace Format Documentation

This document describes the structure and format of trace files in TraceForge.baseline.

## Overview

TraceForge captures all LLM API interactions as **trace files** stored locally in `.ai-tests/traces/`. Each trace is a JSON file containing the complete request, response, and metadata for an LLM call.

## File Naming Convention

Traces are saved with timestamps and UUIDs for uniqueness:

```
<ISO8601-timestamp>_<UUID>.json
```

Example:
```
2025-12-20T15-30-45-123Z_a1b2c3d4-e5f6-7890-abcd-ef1234567890.json
```

## Trace Schema

### Schema Version 1.0.0

```typescript
interface Trace {
  schema_version: string;        // e.g., "1.0.0"
  id: string;                    // UUID v4
  timestamp: string;             // ISO 8601 datetime
  endpoint: string;              // API endpoint path
  request: LLMRequest;           // Request payload
  response: LLMResponse | null;  // Response payload (null on error)
  metadata: TraceMetadata;       // Execution metadata
  
  // Session tracking fields (v0.5.0+)
  session_id?: string;           // Groups related traces into a session
  step_index?: number;           // Sequential order within session (0-based)
  parent_trace_id?: string;      // For hierarchical agent relationships
  state_snapshot?: Record<string, any>; // Environment/tool state at this step
}
```

### Session Tracking Fields (v0.5.0+)

TraceForge supports multi-step session tracking for agentic workflows:

- **session_id**: UUID identifying a complete workflow or agent interaction
- **step_index**: Zero-based index indicating the order of this trace within the session
- **parent_trace_id**: Reference to a parent trace for hierarchical workflows
- **state_snapshot**: JSON object capturing environment state, tool outputs, or context

See [Session Tracking Guide](./session-tracking.md) for usage details.

### Request Structure

```typescript
interface LLMRequest {
  model: string;                 // Model identifier (e.g., "gpt-4", "claude-3")
  messages?: ChatMessage[];      // For chat completions
  prompt?: string | string[];    // For legacy completions
  temperature?: number;          // Sampling temperature (0-2)
  max_tokens?: number;           // Maximum tokens to generate
  top_p?: number;                // Nucleus sampling (0-1)
  frequency_penalty?: number;    // Frequency penalty (-2 to 2)
  presence_penalty?: number;     // Presence penalty (-2 to 2)
  stop?: string | string[];      // Stop sequences
  stream?: boolean;              // Streaming mode
  n?: number;                    // Number of completions
  [key: string]: unknown;        // Additional provider-specific fields
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}
```

### Response Structure

```typescript
interface LLMResponse {
  id: string;                    // Provider's response ID
  object: string;                // Response type (e.g., "chat.completion")
  created: number;               // Unix timestamp
  model: string;                 // Model used
  choices: Choice[];             // Generated completions
  usage?: Usage;                 // Token usage statistics
}

interface Choice {
  index: number;
  message?: ChatMessage;         // For chat completions
  text?: string;                 // For legacy completions
  finish_reason: string;         // Why generation stopped
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

### Metadata Structure

```typescript
interface TraceMetadata {
  duration_ms: number;           // Request duration in milliseconds
  tokens_used?: number;          // Total tokens consumed
  model?: string;                // Model identifier
  status: 'success' | 'error';   // Request outcome
  error?: string;                // Error message (if status is 'error')
}
```

## Example Trace File

```json
{
  "schema_version": "1.0.0",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-12-20T15:30:45.123Z",
  "endpoint": "/v1/chat/completions",
  "request": {
    "model": "gpt-4",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 100
  },
  "response": {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1703089845,
    "model": "gpt-4-0613",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "The capital of France is Paris."
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 25,
      "completion_tokens": 8,
      "total_tokens": 33
    }
  },
  "metadata": {
    "duration_ms": 1234,
    "tokens_used": 33,
    "model": "gpt-4-0613",
    "status": "success"
  }
}
```

## Streaming Traces

For streaming requests (`stream: true`), traces capture the complete assembled response after all chunks are received. Individual chunks are stored separately for debugging.

Streaming trace structure:
- `request.stream` is `true`
- `response` contains the fully assembled response
- Additional `chunks/` directory contains individual stream chunks

## Multi-Provider Support

TraceForge supports multiple LLM providers with a unified trace format:

- **OpenAI**: Native format
- **Anthropic Claude**: Converted to OpenAI-compatible format
- **Google Gemini**: Converted to OpenAI-compatible format
- **Ollama**: Converted to OpenAI-compatible format

Provider-specific fields are preserved using the `[key: string]: unknown` pattern.

## Sensitive Data Redaction

TraceForge automatically redacts sensitive data before saving traces:

### Redacted Fields
- `Authorization` headers
- `X-API-Key` headers
- API keys in request bodies
- Bearer tokens
- JWT tokens

### Redacted Patterns
- Email addresses
- Phone numbers (US format)
- Social Security Numbers (US format)
- Credit card numbers
- API key patterns (e.g., `sk-...`)

Redacted values are replaced with `[REDACTED]`.

### Custom Redaction

Configure additional fields to redact in `traceforge.config.json`:

```json
{
  "redact_fields": [
    "Authorization",
    "X-API-Key",
    "custom_secret_field"
  ]
}
```

## Schema Versioning

Traces include a `schema_version` field for forward compatibility. When the trace format changes:

1. The version is incremented (e.g., `1.0.0` → `1.1.0` or `2.0.0`)
2. Migration utilities automatically upgrade old traces
3. The CLI warns when encountering old formats

### Migration

Use the migration utilities to upgrade traces:

```typescript
import { migrateTrace, needsMigration } from '@traceforge/shared';

if (needsMigration(trace)) {
  const { trace: upgraded, result } = migrateTrace(trace);
  console.log(`Migrated from ${result.originalVersion} to ${result.newVersion}`);
}
```

## Storage Location

By default, traces are stored in:
```
.ai-tests/traces/
```

This directory should be added to `.gitignore` to prevent accidental commits of sensitive data.

## Retention Policy

Configure automatic trace pruning in `traceforge.config.json`:

```json
{
  "max_trace_retention": 30  // Days to keep traces
}
```

## Best Practices

1. **Review before committing**: Always review traces before committing to version control
2. **Use redaction**: Enable automatic redaction for production use
3. **Set retention limits**: Configure `max_trace_retention` to prevent unbounded growth
4. **Compress old traces**: Use compression for long-term storage
5. **Separate environments**: Use different trace directories for dev/staging/prod

## Related Documentation

- [Baseline Format](./baseline-format.md) - Test baseline and assertion format
- [SECURITY.md](../SECURITY.md) - Security best practices
- [Migration Guide](./migrations.md) - Schema migration details
