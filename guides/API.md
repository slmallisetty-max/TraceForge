# API Reference

Complete reference for TraceForge REST APIs.

---

## Overview

TraceForge provides two main APIs:

1. **Proxy Server API** - AI request routing and tracing (port 8787)
2. **Web Server API** - Dashboard backend (port 5173)

---

## Proxy Server API

Base URL: `http://localhost:8787`

### Authentication

Set API key as environment variable before making requests:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."
```

---

### Health Check

Check server health and dependencies.

**Endpoint:** `GET /health`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 12345,
  "checks": {
    "storage": "ok",
    "config": "ok",
    "circuit_breaker": "closed"
  }
}
```

**Status Codes:**
- `200` - All systems healthy
- `503` - One or more systems unhealthy

**Unhealthy Example:**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 12345,
  "checks": {
    "storage": "failed: ENOSPC: no space left on device",
    "config": "ok",
    "circuit_breaker": "open"
  }
}
```

---

### Metrics

Get operational metrics and statistics.

**Endpoint:** `GET /metrics`

**Response:**

```json
{
  "uptime": 86400,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576,
    "arrayBuffers": 524288
  },
  "storage": {
    "circuitBreaker": {
      "state": "closed",
      "failureCount": 0,
      "successCount": 1523,
      "lastFailureTime": null
    }
  }
}
```

**Fields:**
- `uptime` - Server uptime in seconds
- `memory` - Node.js process memory usage (bytes)
  - `rss` - Resident set size (total memory)
  - `heapTotal` - Total heap allocated
  - `heapUsed` - Heap actually used
  - `external` - C++ objects memory
  - `arrayBuffers` - ArrayBuffer/SharedArrayBuffer memory
- `storage.circuitBreaker` - Storage circuit breaker status
  - `state` - `closed` (normal) | `open` (failing) | `half-open` (testing)
  - `failureCount` - Consecutive failures
  - `successCount` - Total successes since start
  - `lastFailureTime` - ISO timestamp of last failure (null if none)

---

### OpenAI Chat Completions

OpenAI-compatible chat completions endpoint.

**Endpoint:** `POST /v1/chat/completions`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <OPENAI_API_KEY>
```

**Request Body:**
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 150
}
```

**Response:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I'm doing well, thank you!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

**Streaming:**

Set `"stream": true` in request body:

```json
{
  "model": "gpt-4",
  "messages": [...],
  "stream": true
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" there"}}]}

data: [DONE]
```

**Rate Limits:**
- OpenAI: 3500 requests/minute
- Anthropic: 1000 requests/minute
- Gemini: 60 requests/minute
- Ollama: 1000 requests/minute

**Timeouts:**
- Request timeout: 30 seconds
- If exceeded, request is aborted

---

### OpenAI Completions (Legacy)

Legacy completions endpoint.

**Endpoint:** `POST /v1/completions`

**Request Body:**
```json
{
  "model": "gpt-3.5-turbo-instruct",
  "prompt": "Say this is a test",
  "max_tokens": 7,
  "temperature": 0
}
```

**Response:**
```json
{
  "id": "cmpl-123",
  "object": "text_completion",
  "created": 1677652288,
  "model": "gpt-3.5-turbo-instruct",
  "choices": [
    {
      "text": " This is a test.",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 5,
    "completion_tokens": 7,
    "total_tokens": 12
  }
}
```

---

### OpenAI Embeddings

Generate embeddings for text.

**Endpoint:** `POST /v1/embeddings`

**Request Body:**
```json
{
  "model": "text-embedding-ada-002",
  "input": "The quick brown fox"
}
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.0023, -0.009, ...],
      "index": 0
    }
  ],
  "model": "text-embedding-ada-002",
  "usage": {
    "prompt_tokens": 5,
    "total_tokens": 5
  }
}
```

---

### Anthropic Messages

Claude API messages endpoint.

**Endpoint:** `POST /v1/messages`

**Headers:**
```
Content-Type: application/json
X-API-Key: <ANTHROPIC_API_KEY>
anthropic-version: 2023-06-01
```

**Request Body:**
```json
{
  "model": "claude-3-sonnet-20240229",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ],
  "max_tokens": 1024
}
```

**Response:**
```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-3-sonnet-20240229",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15
  }
}
```

---

### Google Gemini

Gemini API content generation.

**Endpoint:** `POST /v1beta/models/{model}:generateContent`

**Headers:**
```
Content-Type: application/json
```

**Query Parameters:**
- `key` - Gemini API key

**Request Body:**
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Explain quantum computing"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Quantum computing is..."
          }
        ]
      },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 3,
    "candidatesTokenCount": 150,
    "totalTokenCount": 153
  }
}
```

---

### Ollama

Local Ollama API proxy.

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "model": "llama2",
  "messages": [
    {
      "role": "user",
      "content": "Why is the sky blue?"
    }
  ]
}
```

**Response:**
```json
{
  "model": "llama2",
  "created_at": "2025-01-15T10:30:00Z",
  "message": {
    "role": "assistant",
    "content": "The sky appears blue because..."
  },
  "done": true
}
```

---

## Web Server API

Base URL: `http://localhost:5173/api`

### List Traces

Get all captured traces with filtering.

**Endpoint:** `GET /api/traces`

**Query Parameters:**
- `limit` (number, optional) - Max results (default: 50)
- `offset` (number, optional) - Pagination offset (default: 0)
- `provider` (string, optional) - Filter by provider: `openai` | `anthropic` | `gemini` | `ollama`
- `status` (string, optional) - Filter by status: `success` | `error`

**Example:**
```
GET /api/traces?limit=10&provider=openai&status=success
```

**Response:**
```json
{
  "traces": [
    {
      "id": "abc123",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "provider": "openai",
      "model": "gpt-4",
      "status": "success",
      "latency": 1234
    }
  ],
  "total": 100,
  "limit": 10,
  "offset": 0
}
```

---

### Get Trace Details

Get full trace with request/response.

**Endpoint:** `GET /api/traces/:id`

**Response:**
```json
{
  "id": "abc123",
  "schemaVersion": "1.0.0",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "provider": "openai",
  "model": "gpt-4",
  "status": "success",
  "latency": 1234,
  "request": {
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ],
    "temperature": 0.7
  },
  "response": {
    "id": "chatcmpl-123",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Hi there!"
        }
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Trace found
- `404` - Trace not found

---

### Delete Trace

Delete a specific trace.

**Endpoint:** `DELETE /api/traces/:id`

**Response:**
```json
{
  "success": true,
  "id": "abc123"
}
```

**Status Codes:**
- `200` - Trace deleted
- `404` - Trace not found

---

### List Tests

Get all test files.

**Endpoint:** `GET /api/tests`

**Response:**
```json
{
  "tests": [
    {
      "name": "test-chat-completion",
      "file": "chat-test.yaml",
      "assertions": 3,
      "lastRun": "2025-01-15T10:30:00.000Z",
      "status": "passed"
    }
  ],
  "total": 10
}
```

---

### Get Test Details

Get test file contents and results.

**Endpoint:** `GET /api/tests/:name`

**Response:**
```json
{
  "name": "test-chat-completion",
  "file": "chat-test.yaml",
  "content": "schemaVersion: 1.0.0\ntests:\n  - name: ...",
  "lastRun": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "status": "passed",
    "duration": 2345,
    "results": [
      {
        "assertion": "exact",
        "passed": true
      }
    ]
  }
}
```

---

### Run Test

Execute a specific test.

**Endpoint:** `POST /api/tests/:name/run`

**Request Body:**
```json
{
  "mode": "record"  // optional: "record" | "replay" | "off"
}
```

**Response:**
```json
{
  "status": "passed",
  "duration": 2345,
  "results": [
    {
      "name": "Test chat completion",
      "passed": true,
      "score": 1.0,
      "assertions": [
        {
          "type": "exact",
          "passed": true,
          "weight": 1.0
        }
      ]
    }
  ]
}
```

---

### Get Configuration

Get current proxy configuration.

**Endpoint:** `GET /api/config`

**Response:**
```json
{
  "tracesDir": ".ai-tests/traces",
  "cassettesDir": ".ai-tests/cassettes",
  "vcrMode": "auto",
  "providers": {
    "openai": {
      "enabled": true,
      "rateLimit": 3500
    },
    "anthropic": {
      "enabled": true,
      "rateLimit": 1000
    }
  }
}
```

---

### Update Configuration

Update proxy configuration (requires restart).

**Endpoint:** `POST /api/config`

**Request Body:**
```json
{
  "vcrMode": "replay",
  "providers": {
    "openai": {
      "rateLimit": 5000
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated. Restart proxy to apply changes."
}
```

---

## Error Responses

All APIs use consistent error format:

```json
{
  "error": {
    "code": "TRACE_NOT_FOUND",
    "message": "Trace with ID 'abc123' not found",
    "statusCode": 404
  }
}
```

**Common Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| `TRACE_NOT_FOUND` | 404 | Trace doesn't exist |
| `TEST_NOT_FOUND` | 404 | Test doesn't exist |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `TIMEOUT` | 504 | Request timeout (30s) |
| `STORAGE_ERROR` | 500 | Storage circuit breaker open |
| `UPSTREAM_ERROR` | 502 | Provider API error |
| `CONFIG_ERROR` | 500 | Invalid configuration |

---

## Rate Limiting

Rate limits enforced per provider:

| Provider | Limit | Window |
|----------|-------|--------|
| OpenAI | 3500 | 60 seconds |
| Anthropic | 1000 | 60 seconds |
| Gemini | 60 | 60 seconds |
| Ollama | 1000 | 60 seconds |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 3500
X-RateLimit-Remaining: 3499
X-RateLimit-Reset: 1705315800
```

**Rate Limit Exceeded:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded for provider: openai",
    "statusCode": 429,
    "retryAfter": 30
  }
}
```

---

## Timeouts

All upstream requests have 30-second timeout:

**Timeout Response:**
```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Request timeout after 30000ms",
    "statusCode": 504
  }
}
```

---

## Circuit Breaker

Storage operations protected by circuit breaker:

**States:**
- `closed` - Normal operation
- `open` - Too many failures, rejecting requests
- `half-open` - Testing if system recovered

**When Open:**
```json
{
  "error": {
    "code": "STORAGE_ERROR",
    "message": "Storage circuit breaker is open. System is recovering.",
    "statusCode": 503,
    "circuitBreaker": {
      "state": "open",
      "failureCount": 10,
      "willRetryAt": "2025-01-15T10:31:00.000Z"
    }
  }
}
```

**Configuration:**
- Failure threshold: 10 consecutive failures
- Reset timeout: 60 seconds
- Half-open test: Single request

---

## Authentication

### Proxy Server

API keys passed via:
- OpenAI: `Authorization: Bearer <key>` header
- Anthropic: `X-API-Key: <key>` header
- Gemini: `key=<value>` query parameter
- Ollama: No authentication (local)

### Web Server

No authentication required (local development).

**Production:** Configure reverse proxy authentication (nginx, Caddy).

---

## CORS

**Proxy Server:** CORS enabled for all origins (development mode)

**Web Server:** CORS enabled for `http://localhost:*`

---

## WebSocket Support

**Not currently supported.** Use HTTP/REST APIs only.

**Future:** WebSocket support planned for real-time trace streaming (v2.0).

---

## SDK/Client Libraries

**Official:**
- None yet

**Use any HTTP client:** (fetch, axios, curl)

**Example (Node.js):**
```javascript
const response = await fetch('http://localhost:8787/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});

const data = await response.json();
console.log(data);
```

---

## Related Documentation

- [Getting Started](./getting-started.md) - Setup guide
- [CLI Reference](./cli.md) - Command-line tools
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Configuration
- [Architecture](./architecture-visual.md) - System design
