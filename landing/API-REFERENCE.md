# TraceForge API Reference

Complete reference for TraceForge CLI commands, REST API endpoints, configuration files, and test formats.

---

## Table of Contents

1. [CLI Commands](#cli-commands)
2. [REST API](#rest-api)
3. [Configuration File](#configuration-file)
4. [Test File Format](#test-file-format)
5. [Trace File Format](#trace-file-format)
6. [TypeScript/JavaScript SDK](#typescriptjavascript-sdk)

---

## CLI Commands

The TraceForge CLI provides commands for initializing projects, viewing traces, and running tests.

### Installation

```bash
# Install globally
npm install -g @traceforge/cli

# Or use via npx
npx @traceforge/cli <command>

# Or use from source
cd packages/cli
node dist/index.js <command>
```

### Global Options

Available for all commands:

```bash
--help, -h        Show help
--version, -v     Show version number
--verbose         Enable verbose logging
--config <path>   Path to config file (default: .ai-tests/config.yaml)
```

---

### `init`

Initialize TraceForge in the current directory.

**Usage:**
```bash
traceforge init [options]
```

**Options:**
```bash
--dir <path>      Directory to initialize (default: current directory)
--force           Overwrite existing configuration
```

**Example:**
```bash
# Initialize in current directory
traceforge init

# Initialize in specific directory
traceforge init --dir ./my-project

# Force overwrite existing config
traceforge init --force
```

**What it creates:**
```
.ai-tests/
├── traces/          # Empty directory for traces
├── tests/           # Empty directory for tests
└── config.yaml      # Default configuration
```

---

### `trace list`

List all captured traces.

**Usage:**
```bash
traceforge trace list [options]
```

**Options:**
```bash
--filter <pattern>    Filter by model, status, or content
--provider <name>     Filter by provider (openai, anthropic, gemini, ollama)
--limit <n>           Limit number of results (default: 50)
--sort <field>        Sort by: time, model, tokens, duration (default: time)
--reverse             Reverse sort order
--format <type>       Output format: table, json, csv (default: table)
```

**Examples:**
```bash
# List all traces
traceforge trace list

# Filter by model
traceforge trace list --filter "gpt-4"

# Filter by provider
traceforge trace list --provider anthropic

# Show only last 10 traces
traceforge trace list --limit 10

# Sort by duration (slowest first)
traceforge trace list --sort duration --reverse

# Output as JSON
traceforge trace list --format json
```

**Output (table format):**
```
ID              Provider    Model              Status  Time      Tokens  Duration
trace_abc123    openai      gpt-3.5-turbo     200     10:23:45  45      1234ms
trace_def456    anthropic   claude-3-opus     200     10:24:12  67      2341ms
trace_ghi789    gemini      gemini-pro        200     10:25:33  52      1876ms
```

---

### `trace view`

View detailed information about a specific trace.

**Usage:**
```bash
traceforge trace view <trace-id> [options]
```

**Options:**
```bash
--format <type>       Output format: pretty, json, yaml (default: pretty)
--show-headers        Include HTTP headers in output
--show-tokens         Show token usage breakdown
```

**Examples:**
```bash
# View trace with pretty formatting
traceforge trace view trace_abc123

# View as JSON
traceforge trace view trace_abc123 --format json

# View with all details
traceforge trace view trace_abc123 --show-headers --show-tokens
```

**Output (pretty format):**
```
═══════════════════════════════════════════════════════
Trace: trace_abc123
═══════════════════════════════════════════════════════
Provider:     openai
Model:        gpt-3.5-turbo
Status:       200 OK
Timestamp:    2024-12-14 10:23:45
Duration:     1234ms
Total Tokens: 45 (prompt: 23, completion: 22)

───────────────────────────────────────────────────────
Request
───────────────────────────────────────────────────────
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is 2+2?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 100
}

───────────────────────────────────────────────────────
Response
───────────────────────────────────────────────────────
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1702551825,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "2 + 2 equals 4."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 23,
    "completion_tokens": 22,
    "total_tokens": 45
  }
}
```

---

### `trace delete`

Delete one or more traces.

**Usage:**
```bash
traceforge trace delete <trace-id> [trace-id...] [options]
```

**Options:**
```bash
--all             Delete all traces (use with caution!)
--before <date>   Delete traces before this date (ISO format)
--provider <name> Delete traces from specific provider
--yes             Skip confirmation prompt
```

**Examples:**
```bash
# Delete specific trace
traceforge trace delete trace_abc123

# Delete multiple traces
traceforge trace delete trace_abc123 trace_def456

# Delete all traces from 2023
traceforge trace delete --before 2024-01-01

# Delete all traces (dangerous!)
traceforge trace delete --all --yes
```

---

### `test create-from-trace`

Create a test file from an existing trace.

**Usage:**
```bash
traceforge test create-from-trace <trace-id> [options]
```

**Options:**
```bash
--name <name>           Test name (required)
--description <desc>    Test description
--output <path>         Output file path (default: .ai-tests/tests/<name>.test.yaml)
--assertions <types>    Comma-separated assertion types to include
                        (default: equals,response_time)
```

**Examples:**
```bash
# Create basic test
traceforge test create-from-trace trace_abc123 --name "math-test"

# Create test with description
traceforge test create-from-trace trace_abc123 \
  --name "math-test" \
  --description "Test basic math calculation"

# Create test with specific assertions
traceforge test create-from-trace trace_abc123 \
  --name "math-test" \
  --assertions "equals,content_contains,response_time,token_range"

# Create test in custom location
traceforge test create-from-trace trace_abc123 \
  --name "math-test" \
  --output "./tests/custom-math.test.yaml"
```

---

### `test list`

List all test files.

**Usage:**
```bash
traceforge test list [options]
```

**Options:**
```bash
--filter <pattern>    Filter by test name
--status <status>     Filter by status: passed, failed, pending
--tag <tag>           Filter by tag
--format <type>       Output format: table, json (default: table)
```

**Examples:**
```bash
# List all tests
traceforge test list

# Filter by name pattern
traceforge test list --filter "math"

# Show only failed tests
traceforge test list --status failed

# Filter by tag
traceforge test list --tag "regression"
```

---

### `test run`

Run tests.

**Usage:**
```bash
traceforge test run [pattern] [options]
```

**Options:**
```bash
[pattern]             Test name pattern (glob supported)
--parallel            Run tests in parallel
--workers <n>         Number of parallel workers (default: 5)
--watch               Watch mode - rerun on file changes
--filter <pattern>    Filter tests by name
--tag <tag>           Run only tests with specific tag
--fixture <path>      Load fixture file before running tests
--junit               Generate JUnit XML report
--junit-path <path>   JUnit output path (default: .ai-tests/junit.xml)
--verbose             Show detailed output
--bail                Stop on first failure
--timeout <ms>        Test timeout in milliseconds (default: 30000)
```

**Examples:**
```bash
# Run all tests
traceforge test run

# Run specific test
traceforge test run math-test

# Run tests matching pattern
traceforge test run "math-*"

# Run in parallel
traceforge test run --parallel

# Run with custom worker count
traceforge test run --parallel --workers 10

# Watch mode
traceforge test run --watch

# Run with fixture
traceforge test run --fixture ./fixtures/common.yaml

# Generate JUnit report
traceforge test run --junit

# Run only tagged tests
traceforge test run --tag "smoke"

# Stop on first failure
traceforge test run --bail

# Verbose output
traceforge test run --verbose
```

**Output:**
```
Running tests...

✓ math-test (1.2s)
  ✓ equals assertion passed
  ✓ content_contains assertion passed
  ✓ response_time assertion passed

✓ streaming-test (2.4s)
  ✓ fuzzy_match assertion passed
  ✓ token_range assertion passed

✗ edge-case-test (3.1s)
  ✓ equals assertion passed
  ✗ response_time assertion failed
    Expected: < 2000ms
    Actual: 3100ms

Tests:     2 passed, 1 failed, 3 total
Time:      6.7s
Pass Rate: 66.67%
```

---

## REST API

The TraceForge web server exposes a REST API for accessing traces, tests, and analytics.

**Base URL:** `http://localhost:3001`

**Content-Type:** `application/json`

---

### Authentication

Currently, no authentication is required (local-only tool).

---

### Traces Endpoints

#### GET `/api/traces`

List all traces.

**Query Parameters:**
```
limit      - Maximum number of traces (default: 50)
offset     - Pagination offset (default: 0)
provider   - Filter by provider
model      - Filter by model name
status     - Filter by HTTP status code
sort       - Sort field: time, duration, tokens (default: time)
order      - Sort order: asc, desc (default: desc)
```

**Response:**
```json
{
  "traces": [
    {
      "id": "trace_abc123",
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "status": 200,
      "timestamp": "2024-12-14T10:23:45.000Z",
      "duration": 1234,
      "tokens": {
        "prompt": 23,
        "completion": 22,
        "total": 45
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### GET `/api/traces/:id`

Get a specific trace by ID.

**Response:**
```json
{
  "id": "trace_abc123",
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "status": 200,
  "timestamp": "2024-12-14T10:23:45.000Z",
  "duration": 1234,
  "request": {
    "model": "gpt-3.5-turbo",
    "messages": [...]
  },
  "response": {
    "id": "chatcmpl-abc123",
    "choices": [...]
  },
  "tokens": {
    "prompt": 23,
    "completion": 22,
    "total": 45
  }
}
```

#### DELETE `/api/traces/:id`

Delete a specific trace.

**Response:**
```json
{
  "success": true,
  "message": "Trace deleted"
}
```

---

### Tests Endpoints

#### GET `/api/tests`

List all tests.

**Query Parameters:**
```
filter   - Filter by test name
status   - Filter by status (passed, failed, pending)
tag      - Filter by tag
```

**Response:**
```json
{
  "tests": [
    {
      "name": "math-test",
      "file": ".ai-tests/tests/math-test.test.yaml",
      "status": "passed",
      "lastRun": "2024-12-14T10:30:00.000Z",
      "tags": ["unit", "math"]
    }
  ],
  "total": 25
}
```

#### GET `/api/tests/:name`

Get a specific test by name.

**Response:**
```json
{
  "name": "math-test",
  "description": "Test basic math calculation",
  "file": ".ai-tests/tests/math-test.test.yaml",
  "request": {
    "model": "gpt-3.5-turbo",
    "messages": [...]
  },
  "assertions": [
    {
      "type": "equals",
      "path": "choices[0].message.content",
      "expected": "4"
    }
  ],
  "tags": ["unit", "math"]
}
```

#### POST `/api/tests`

Create a new test.

**Request Body:**
```json
{
  "name": "new-test",
  "description": "Test description",
  "request": {
    "model": "gpt-3.5-turbo",
    "messages": [...]
  },
  "assertions": [...]
}
```

**Response:**
```json
{
  "success": true,
  "test": {
    "name": "new-test",
    "file": ".ai-tests/tests/new-test.test.yaml"
  }
}
```

#### POST `/api/tests/:name/run`

Run a specific test.

**Response:**
```json
{
  "success": true,
  "result": {
    "passed": true,
    "duration": 1234,
    "assertions": [
      {
        "type": "equals",
        "passed": true
      }
    ]
  }
}
```

---

### Analytics Endpoints

#### GET `/api/analytics`

Get analytics data.

**Query Parameters:**
```
from   - Start date (ISO format)
to     - End date (ISO format)
```

**Response:**
```json
{
  "summary": {
    "totalTraces": 1234,
    "totalTokens": 567890,
    "avgResponseTime": 1543,
    "testPassRate": 0.95
  },
  "providers": {
    "openai": 800,
    "anthropic": 234,
    "gemini": 100,
    "ollama": 100
  },
  "models": {
    "gpt-3.5-turbo": 500,
    "gpt-4": 300,
    "claude-3-opus": 234,
    "gemini-pro": 100,
    "llama2": 100
  },
  "timeline": [
    {
      "date": "2024-12-14",
      "traces": 150,
      "tokens": 45000,
      "avgResponseTime": 1420
    }
  ]
}
```

---

### Config Endpoints

#### GET `/api/config`

Get current configuration.

**Response:**
```json
{
  "test_dir": ".ai-tests",
  "trace_dir": ".ai-tests/traces",
  "test_pattern": "**/*.test.yaml",
  "providers": [
    {
      "type": "openai",
      "name": "OpenAI",
      "enabled": true,
      "default": true
    }
  ]
}
```

#### PUT `/api/config`

Update configuration.

**Request Body:**
```json
{
  "test_dir": ".ai-tests",
  "providers": [...]
}
```

**Response:**
```json
{
  "success": true,
  "config": {...}
}
```

---

## Configuration File

The `.ai-tests/config.yaml` file configures TraceForge behavior.

### Full Example

```yaml
# Directory configuration
test_dir: .ai-tests
trace_dir: .ai-tests/traces
test_pattern: "**/*.test.yaml"

# Provider configuration
providers:
  - type: openai
    name: OpenAI
    base_url: https://api.openai.com
    api_key_env_var: OPENAI_API_KEY
    enabled: true
    default: true

  - type: anthropic
    name: Anthropic Claude
    base_url: https://api.anthropic.com
    api_key_env_var: ANTHROPIC_API_KEY
    enabled: true

  - type: gemini
    name: Google Gemini
    base_url: https://generativelanguage.googleapis.com
    api_key_env_var: GEMINI_API_KEY
    enabled: false

  - type: ollama
    name: Ollama Local
    base_url: http://localhost:11434
    enabled: false

# Test runner configuration
test_runner:
  parallel: false
  workers: 5
  timeout: 30000  # milliseconds
  bail_on_failure: false

# Proxy configuration
proxy:
  port: 8787
  host: localhost
  auto_refresh_interval: 5000  # milliseconds

# Web UI configuration
web:
  api_port: 3001
  ui_port: 5173
  dark_mode: true

# Logging
logging:
  level: info  # debug, info, warn, error
  file: .ai-tests/traceforge.log
```

### Configuration Fields

#### Directory Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `test_dir` | string | `.ai-tests` | Root directory for TraceForge data |
| `trace_dir` | string | `.ai-tests/traces` | Directory for trace files |
| `test_pattern` | string | `**/*.test.yaml` | Glob pattern for test files |

#### Provider Settings

Each provider has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Provider type: `openai`, `anthropic`, `gemini`, `ollama` |
| `name` | string | Yes | Display name |
| `base_url` | string | Yes | API base URL |
| `api_key_env_var` | string | No | Environment variable name for API key |
| `enabled` | boolean | Yes | Whether provider is active |
| `default` | boolean | No | Default provider when model is ambiguous |

---

## Test File Format

Test files are YAML documents that define LLM behavior tests.

### Basic Structure

```yaml
name: Test name (required)
description: Test description (optional)

request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: "Hello"

assertions:
  - type: equals
    path: choices[0].message.content
    expected: "Hi there!"
```

### Full Example

```yaml
name: Complex test example
description: Demonstrates all test features
tags:
  - integration
  - critical

# Optional: Fixtures to run before test
fixtures:
  - path: ./fixtures/setup.yaml

# The LLM request
request:
  model: gpt-4
  messages:
    - role: system
      content: "You are a helpful math tutor."
    - role: user
      content: "What is 2+2?"
  temperature: 0.7
  max_tokens: 100
  stream: false

# Assertions to validate response
assertions:
  # Exact match
  - type: equals
    path: choices[0].message.content
    expected: "2 + 2 equals 4."
  
  # Substring check
  - type: content_contains
    value: "4"
  
  # Regex pattern
  - type: content_matches
    pattern: "\\d+\\s*\\+\\s*\\d+\\s*equals\\s*\\d+"
  
  # Fuzzy matching
  - type: fuzzy_match
    expected: "Two plus two equals four"
    threshold: 0.8
  
  # Performance
  - type: response_time
    max_ms: 3000
  
  # Token validation
  - type: token_range
    min: 10
    max: 50
  
  # Content length
  - type: content_length
    min: 5
    max: 100
  
  # JSON path query
  - type: json_path
    path: "$.choices[0].finish_reason"
    expected: "stop"
  
  # Schema validation
  - type: schema_validation
    schema:
      type: object
      required:
        - choices
      properties:
        choices:
          type: array
          minItems: 1
```

### Assertion Types

#### 1. `equals`

Exact value match.

```yaml
- type: equals
  path: choices[0].message.content
  expected: "Hello, world!"
```

**Fields:**
- `path` (string): JSON path to the value
- `expected` (any): Expected value

#### 2. `content_contains`

Check if content contains a substring.

```yaml
- type: content_contains
  value: "hello"
  case_sensitive: false  # optional, default: false
```

**Fields:**
- `value` (string): Substring to find
- `case_sensitive` (boolean): Case sensitivity

#### 3. `content_matches`

Regex pattern match.

```yaml
- type: content_matches
  pattern: "\\d{4}-\\d{2}-\\d{2}"
  flags: "i"  # optional, regex flags
```

**Fields:**
- `pattern` (string): Regular expression
- `flags` (string): Regex flags (i, g, m, etc.)

#### 4. `fuzzy_match`

Similarity matching using Levenshtein distance.

```yaml
- type: fuzzy_match
  expected: "The answer is four"
  threshold: 0.85  # 85% similarity required
```

**Fields:**
- `expected` (string): Expected text
- `threshold` (number): Similarity threshold (0-1)

#### 5. `response_time`

Validate response time.

```yaml
- type: response_time
  max_ms: 2000  # 2 seconds
  min_ms: 100   # optional
```

**Fields:**
- `max_ms` (number): Maximum milliseconds
- `min_ms` (number): Minimum milliseconds (optional)

#### 6. `token_range`

Validate token usage.

```yaml
- type: token_range
  min: 10
  max: 100
  field: total  # total, prompt, or completion
```

**Fields:**
- `min` (number): Minimum tokens
- `max` (number): Maximum tokens
- `field` (string): Token field to check

#### 7. `content_length`

Validate content length.

```yaml
- type: content_length
  min: 10
  max: 500
```

**Fields:**
- `min` (number): Minimum characters
- `max` (number): Maximum characters

#### 8. `json_path`

Query JSON structure with JSON path.

```yaml
- type: json_path
  path: "$.choices[0].message.tool_calls[0].function.name"
  expected: "calculate"
```

**Fields:**
- `path` (string): JSON path query
- `expected` (any): Expected value at path

#### 9. `schema_validation`

Validate against JSON schema.

```yaml
- type: schema_validation
  schema:
    type: object
    required:
      - choices
    properties:
      choices:
        type: array
        items:
          type: object
          required:
            - message
```

**Fields:**
- `schema` (object): JSON Schema object

---

## Trace File Format

Trace files are JSON documents stored in `.ai-tests/traces/`.

### Basic Trace

```json
{
  "id": "trace_abc123",
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "timestamp": "2024-12-14T10:23:45.000Z",
  "status": 200,
  "duration": 1234,
  "request": {
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ]
  },
  "response": {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1702551825,
    "model": "gpt-3.5-turbo",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "Hi there!"
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 5,
      "total_tokens": 15
    }
  },
  "tokens": {
    "prompt": 10,
    "completion": 5,
    "total": 15
  }
}
```

### Streaming Trace

```json
{
  "id": "trace_streaming_abc123",
  "provider": "openai",
  "model": "gpt-4",
  "timestamp": "2024-12-14T10:25:00.000Z",
  "status": 200,
  "duration": 3456,
  "streaming": true,
  "chunks": [
    {
      "id": "chatcmpl-abc123",
      "object": "chat.completion.chunk",
      "created": 1702551900,
      "model": "gpt-4",
      "choices": [
        {
          "index": 0,
          "delta": {
            "role": "assistant",
            "content": "Hello"
          },
          "finish_reason": null
        }
      ],
      "delta_ms": 100
    },
    {
      "id": "chatcmpl-abc123",
      "object": "chat.completion.chunk",
      "created": 1702551900,
      "model": "gpt-4",
      "choices": [
        {
          "index": 0,
          "delta": {
            "content": " there"
          },
          "finish_reason": null
        }
      ],
      "delta_ms": 50
    }
  ],
  "total_chunks": 2,
  "stream_duration_ms": 3456,
  "first_chunk_latency_ms": 234
}
```

---

## TypeScript/JavaScript SDK

Use TraceForge programmatically in your Node.js applications.

### Installation

```bash
npm install @traceforge/shared
```

### Usage

```typescript
import { Trace, Test, LLMRequest } from '@traceforge/shared';

// Type-safe trace object
const trace: Trace = {
  id: 'trace_123',
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  // ...
};

// Type-safe test object
const test: Test = {
  name: 'my-test',
  request: {
    model: 'gpt-3.5-turbo',
    messages: [...]
  },
  assertions: [...]
};
```

### Available Types

```typescript
// Core types
export interface Trace {
  id: string;
  provider: string;
  model: string;
  timestamp: string;
  status: number;
  duration: number;
  request: LLMRequest;
  response: LLMResponse;
  tokens: TokenUsage;
}

export interface Test {
  name: string;
  description?: string;
  tags?: string[];
  fixtures?: string[];
  request: LLMRequest;
  assertions: Assertion[];
}

export interface Assertion {
  type: AssertionType;
  [key: string]: any;
}

export type AssertionType =
  | 'equals'
  | 'content_contains'
  | 'content_matches'
  | 'fuzzy_match'
  | 'response_time'
  | 'token_range'
  | 'content_length'
  | 'json_path'
  | 'schema_validation';
```

---

## Environment Variables

TraceForge respects these environment variables:

```bash
# API Keys
OPENAI_API_KEY           # OpenAI API key
ANTHROPIC_API_KEY        # Anthropic/Claude API key
GEMINI_API_KEY           # Google Gemini API key

# Configuration
TRACEFORGE_CONFIG_PATH   # Path to config.yaml
TRACEFORGE_TRACE_DIR     # Override trace directory
TRACEFORGE_TEST_DIR      # Override test directory

# Proxy Settings
TRACEFORGE_PROXY_PORT    # Proxy port (default: 8787)
TRACEFORGE_PROXY_HOST    # Proxy host (default: localhost)

# Web UI Settings
TRACEFORGE_API_PORT      # API port (default: 3001)
TRACEFORGE_UI_PORT       # UI port (default: 5173)

# Logging
TRACEFORGE_LOG_LEVEL     # Log level: debug, info, warn, error
```

---

## Error Codes

TraceForge uses standard HTTP status codes:

| Code | Meaning | Resolution |
|------|---------|------------|
| 200 | Success | - |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Verify API key |
| 404 | Not Found | Check trace/test ID |
| 429 | Rate Limited | Slow down requests |
| 500 | Internal Error | Check logs |
| 502 | Bad Gateway | Provider unreachable |
| 504 | Gateway Timeout | Provider timeout |

---

## Next Steps

- [Getting Started Guide](DEV-GETTING-STARTED.md) - Learn to use these APIs
- [Architecture Guide](ARCHITECTURE.md) - Understand how it works
- [Advanced Topics](ADVANCED.md) - Advanced patterns
- [Tutorials](TUTORIALS.md) - Step-by-step examples
