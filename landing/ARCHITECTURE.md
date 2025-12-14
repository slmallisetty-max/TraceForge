# TraceForge Architecture Guide

Deep dive into TraceForge's system design, components, and data flows.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Storage Architecture](#storage-architecture)
5. [Multi-Provider System](#multi-provider-system)
6. [Streaming Architecture](#streaming-architecture)
7. [Test Execution Engine](#test-execution-engine)
8. [Extension Points](#extension-points)

---

## System Overview

TraceForge is a local-first AI debugging platform built with a modular, microservices-inspired architecture. All components run on the developer's machine with no cloud dependencies.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Developer's Machine                    │
│                                                            │
│  ┌─────────────┐                                          │
│  │   Your App  │                                          │
│  │ (any lang)  │                                          │
│  └──────┬──────┘                                          │
│         │ HTTP                                            │
│         │ localhost:8787/v1                               │
│         ↓                                                 │
│  ┌─────────────────────────────────────────────┐         │
│  │          TraceForge Proxy Server            │         │
│  │         (Node.js + Fastify)                 │         │
│  │                                             │         │
│  │  ┌──────────────┐  ┌──────────────────┐   │         │
│  │  │   Provider   │  │  Request/Response │   │         │
│  │  │   Detector   │  │    Interceptor    │   │         │
│  │  └──────────────┘  └──────────────────┘   │         │
│  │                                             │         │
│  │  ┌──────────────┐  ┌──────────────────┐   │         │
│  │  │   Streaming  │  │     Storage      │   │         │
│  │  │    Handler   │  │     Manager      │   │         │
│  │  └──────────────┘  └──────────────────┘   │         │
│  └─────────┬───────────────────────────────────┘         │
│            │                          ↓                   │
│            │ Forward to        Save to disk              │
│            │ real provider                               │
│            ↓                          ↓                   │
│  ┌──────────────────┐    ┌──────────────────────┐       │
│  │   AI Providers   │    │   .ai-tests/         │       │
│  │  OpenAI/Claude/  │    │   ├── traces/        │       │
│  │  Gemini/Ollama   │    │   ├── tests/         │       │
│  └──────────────────┘    │   └── config.yaml    │       │
│                           └──────────────────────┘       │
│                                     ↑                     │
│                           ┌─────────┴─────────┐          │
│                           │                   │          │
│                    ┌──────┴─────┐    ┌───────┴─────┐    │
│                    │  Web UI    │    │     CLI     │    │
│                    │  (React)   │    │  (Node.js)  │    │
│                    │ :5173      │    │             │    │
│                    └──────┬─────┘    └─────────────┘    │
│                           │                              │
│                    ┌──────┴─────┐                        │
│                    │  Web API   │                        │
│                    │  (Express) │                        │
│                    │  :3001     │                        │
│                    └────────────┘                        │
│                                                           │
│  ┌──────────────────────────────────────────────┐       │
│  │          VS Code Extension (optional)        │       │
│  │  ├── Test TreeView                           │       │
│  │  ├── Trace Explorer                          │       │
│  │  └── Proxy Manager                           │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Local-First** - All data stored locally, no cloud required
2. **Provider-Agnostic** - Works with any LLM provider
3. **Zero-Configuration** - Sensible defaults, minimal setup
4. **Developer-Friendly** - Clear errors, great DX
5. **Extensible** - Easy to add providers, assertions, features

---

## Component Architecture

### 1. Proxy Server (`packages/proxy`)

**Purpose**: Intercepts LLM API calls, captures data, forwards to providers

**Tech Stack**: Node.js, Fastify, TypeScript

**Key Files**:
```
packages/proxy/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── config.ts                   # Configuration loader
│   ├── storage.ts                  # Trace storage manager
│   ├── provider-detector.ts        # Provider routing logic
│   └── handlers/
│       ├── chat-completions.ts     # OpenAI chat completions
│       ├── completions.ts          # OpenAI completions (legacy)
│       ├── streaming-chat-completions.ts  # SSE streaming
│       ├── anthropic.ts            # Claude Messages API
│       ├── gemini.ts               # Gemini generateContent
│       ├── ollama.ts               # Ollama local models
│       └── embeddings.ts           # Embeddings endpoints
```

**Request Flow**:
```
1. Client request → Proxy (:8787)
2. Parse request body
3. Detect provider from model name
4. Start timer
5. Forward to actual provider
6. Capture response
7. Calculate metrics (tokens, duration)
8. Save trace to disk
9. Return response to client
```

**Key Classes**:

```typescript
// Storage Manager
class StorageManager {
  private traceDir: string;
  
  async saveTrace(trace: Trace): Promise<void>
  async loadTrace(id: string): Promise<Trace>
  async listTraces(): Promise<Trace[]>
  async deleteTrace(id: string): Promise<void>
}

// Provider Detector
class ProviderDetector {
  detectProvider(model: string): ProviderType
  getProviderConfig(type: ProviderType): ProviderConfig
  getBaseUrl(provider: ProviderType): string
}
```

### 2. Web UI (`packages/web`)

**Purpose**: Visual interface for browsing traces, comparing outputs, managing tests

**Tech Stack**: React, TypeScript, Vite, TailwindCSS, Express

**Structure**:
```
packages/web/
├── src/                      # Frontend (React)
│   ├── App.tsx              # Main app component
│   ├── components/
│   │   ├── TraceList.tsx    # Timeline view
│   │   ├── TraceDetail.tsx  # Single trace view
│   │   ├── TraceDiff.tsx    # Side-by-side comparison
│   │   ├── StreamingTraceDetail.tsx  # Streaming replay
│   │   ├── Dashboard.tsx    # Analytics dashboard
│   │   ├── ConfigEditor.tsx # Config file editor
│   │   └── Header.tsx       # Navigation
│   ├── api/
│   │   └── client.ts        # API client
│   └── utils/
│       └── diff.ts          # Diff algorithm
├── server/                   # Backend (Express)
│   └── index.ts             # REST API server
└── index.html               # HTML entry point
```

**Component Tree**:
```
App
├── Header
├── Router
│   ├── TraceList
│   │   └── TraceCard (multiple)
│   ├── TraceDetail
│   │   ├── RequestView
│   │   ├── ResponseView
│   │   └── MetadataView
│   ├── TraceDiff
│   │   ├── DiffHeader
│   │   ├── SideBySide
│   │   │   ├── TraceView (left)
│   │   │   └── TraceView (right)
│   │   └── DiffLegend
│   ├── StreamingTraceDetail
│   │   ├── ChunkList
│   │   ├── PlaybackControls
│   │   └── TimingChart
│   ├── Dashboard
│   │   ├── SummaryCards
│   │   ├── ProviderChart
│   │   ├── TimelineChart
│   │   └── TokenUsageChart
│   └── ConfigEditor
│       ├── YAMLEditor
│       └── ValidationPanel
```

**State Management**:
```typescript
// React hooks for data fetching
const { data: traces, loading, error } = useTraces();
const { data: trace } = useTrace(id);
const { data: analytics } = useAnalytics(dateRange);

// Auto-refresh with polling
useEffect(() => {
  const interval = setInterval(fetchTraces, 5000);
  return () => clearInterval(interval);
}, []);
```

### 3. CLI Tool (`packages/cli`)

**Purpose**: Command-line interface for traces and tests

**Tech Stack**: Node.js, TypeScript, Commander.js

**Structure**:
```
packages/cli/
├── src/
│   ├── index.ts             # CLI entry point
│   ├── commands/
│   │   ├── init.ts          # Initialize project
│   │   ├── trace.ts         # Trace commands
│   │   └── test.ts          # Test commands
│   └── utils/
│       ├── assertions.ts    # Assertion engine
│       ├── progress-reporter.ts  # Test output
│       └── junit-reporter.ts     # JUnit XML
```

**Command Structure**:
```typescript
// Commander.js setup
program
  .name('traceforge')
  .description('Local-first AI debugging platform')
  .version('2.0.0');

// Subcommands
program
  .command('trace')
  .addCommand(traceList)
  .addCommand(traceView)
  .addCommand(traceDelete);

program
  .command('test')
  .addCommand(testRun)
  .addCommand(testCreateFromTrace)
  .addCommand(testList);
```

### 4. Shared Package (`packages/shared`)

**Purpose**: Common types, schemas, utilities

**Tech Stack**: TypeScript, Zod

**Structure**:
```
packages/shared/
├── src/
│   ├── index.ts      # Main exports
│   ├── types.ts      # TypeScript interfaces
│   ├── schema.ts     # Zod schemas
│   └── utils.ts      # Shared utilities
```

**Key Types**:
```typescript
// Core trace type
export interface Trace {
  id: string;
  provider: ProviderType;
  model: string;
  timestamp: string;
  status: number;
  duration: number;
  request: LLMRequest;
  response: LLMResponse;
  tokens: TokenUsage;
  streaming?: boolean;
  chunks?: StreamChunk[];
}

// Test definition
export interface Test {
  name: string;
  description?: string;
  tags?: string[];
  fixtures?: string[];
  request: LLMRequest;
  assertions: Assertion[];
}

// Assertion types
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

### 5. VS Code Extension (`packages/vscode-extension`)

**Purpose**: Editor integration for seamless workflow

**Tech Stack**: TypeScript, VS Code Extension API

**Structure**:
```
packages/vscode-extension/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── ProxyManager.ts       # Manage proxy lifecycle
│   └── providers/
│       ├── TestsTreeProvider.ts   # Test tree view
│       └── TracesTreeProvider.ts  # Trace explorer
└── snippets/
    └── test-snippets.json    # YAML test snippets
```

**Features**:
- Tree view for tests with status icons
- Tree view for traces
- Commands: Run Test, Create Test, Start/Stop Proxy
- Status bar integration
- Code snippets

---

## Data Flow

### Trace Capture Flow

```
┌──────────┐
│Your App  │
└────┬─────┘
     │ POST /v1/chat/completions
     ↓
┌────────────────────────────────────┐
│   Proxy: chatCompletionsHandler    │
├────────────────────────────────────┤
│ 1. Parse request body              │
│ 2. Generate trace ID               │
│ 3. Detect provider from model      │
│ 4. Start timer                     │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Provider Detector                │
├────────────────────────────────────┤
│ if model.startsWith('gpt-')        │
│   → OpenAI                         │
│ else if model.startsWith('claude') │
│   → Anthropic                      │
│ else if model.startsWith('gemini') │
│   → Gemini                         │
│ else → Ollama                      │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Forward to Provider              │
├────────────────────────────────────┤
│ Transform request if needed        │
│ Add API key header                 │
│ Send HTTP request                  │
│ Wait for response                  │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Response Processing              │
├────────────────────────────────────┤
│ Transform to OpenAI format         │
│ Stop timer                         │
│ Extract token usage                │
│ Build trace object                 │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Storage Manager                  │
├────────────────────────────────────┤
│ Serialize to JSON                  │
│ Write to .ai-tests/traces/         │
│ Filename: {traceId}.json           │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Return to Client                 │
├────────────────────────────────────┤
│ Send original response             │
│ Client sees normal OpenAI response │
└────────────────────────────────────┘
```

### Test Execution Flow

```
┌──────────────────┐
│ CLI: test run    │
└────┬─────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Test Runner                      │
├────────────────────────────────────┤
│ 1. Load config.yaml                │
│ 2. Find test files (glob pattern)  │
│ 3. Parse YAML tests                │
│ 4. Validate with Zod schema        │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Parallel or Sequential?          │
├────────────────────────────────────┤
│ if --parallel                      │
│   → Create worker pool (5 workers) │
│ else                               │
│   → Sequential execution           │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   For Each Test                    │
├────────────────────────────────────┤
│ 1. Load fixtures (if any)          │
│ 2. Build LLM request               │
│ 3. Send to proxy                   │
│ 4. Wait for response               │
│ 5. Run assertions                  │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Assertion Engine                 │
├────────────────────────────────────┤
│ For each assertion:                │
│   switch (assertion.type) {        │
│     case 'equals':                 │
│       compare(actual, expected)    │
│     case 'fuzzy_match':            │
│       levenshtein(actual, expected)│
│     case 'response_time':          │
│       check(duration < max_ms)     │
│     ...                            │
│   }                                │
└────┬───────────────────────────────┘
     │
     ↓
┌────────────────────────────────────┐
│   Results Aggregation              │
├────────────────────────────────────┤
│ Collect all results                │
│ Calculate pass/fail counts         │
│ Generate report                    │
│   - Console output                 │
│   - JUnit XML (if --junit)         │
└────────────────────────────────────┘
```

---

## Storage Architecture

### File System Layout

```
.ai-tests/
├── traces/
│   ├── trace_2024-12-14_abc123.json
│   ├── trace_2024-12-14_def456.json
│   └── ...
├── tests/
│   ├── math-test.test.yaml
│   ├── streaming-test.test.yaml
│   └── fixtures/
│       └── common.yaml
├── config.yaml
└── junit.xml (generated)
```

### Trace Storage

**Format**: JSON

**Naming**: `trace_{timestamp}_{random}.json`

**Schema**:
```json
{
  "id": "trace_2024-12-14_abc123",
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "timestamp": "2024-12-14T10:23:45.123Z",
  "status": 200,
  "duration": 1234,
  "request": { ... },
  "response": { ... },
  "tokens": {
    "prompt": 23,
    "completion": 22,
    "total": 45
  }
}
```

**Indexing**: No database - scans directory on-demand

**Performance**:
- Fast for < 10,000 traces
- Consider cleanup for production use
- Future: SQLite index for large datasets

### Test Storage

**Format**: YAML (human-readable)

**Naming**: `{test-name}.test.yaml`

**Schema**:
```yaml
name: Test name
description: Optional description
tags: [tag1, tag2]

request:
  model: gpt-3.5-turbo
  messages: [...]

assertions:
  - type: equals
    path: choices[0].message.content
    expected: "value"
```

**Validation**: Zod schema at load time

---

## Multi-Provider System

### Provider Detection Algorithm

```typescript
function detectProvider(model: string): ProviderType {
  // Exact matches first
  if (model === 'claude-3-opus-20240229') return 'anthropic';
  if (model === 'gemini-pro') return 'gemini';
  
  // Prefix matches
  if (model.startsWith('gpt-') || 
      model.startsWith('text-')) {
    return 'openai';
  }
  
  if (model.startsWith('claude')) {
    return 'anthropic';
  }
  
  if (model.startsWith('gemini')) {
    return 'gemini';
  }
  
  if (['llama', 'mistral', 'phi', 'vicuna']
      .some(p => model.toLowerCase().includes(p))) {
    return 'ollama';
  }
  
  // Fallback to default provider
  return config.providers.find(p => p.default)?.type || 'openai';
}
```

### Request Transformation

Each provider has different API formats. TraceForge normalizes them.

#### OpenAI → OpenAI (pass-through)
```typescript
// No transformation needed
return request;
```

#### OpenAI → Anthropic
```typescript
function transformToAnthropic(request: OpenAIRequest): AnthropicRequest {
  return {
    model: request.model,
    messages: request.messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      content: msg.content
    })),
    max_tokens: request.max_tokens || 1024,
    temperature: request.temperature
  };
}
```

#### OpenAI → Gemini
```typescript
function transformToGemini(request: OpenAIRequest): GeminiRequest {
  return {
    contents: request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.max_tokens
    }
  };
}
```

### Response Normalization

All provider responses are converted to OpenAI format for storage.

```typescript
function normalizeResponse(
  provider: ProviderType,
  response: any
): OpenAIResponse {
  switch (provider) {
    case 'anthropic':
      return {
        id: response.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content[0].text
          },
          finish_reason: response.stop_reason
        }],
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    
    case 'gemini':
      return {
        id: `gemini-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gemini-pro',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.candidates[0].content.parts[0].text
          },
          finish_reason: response.candidates[0].finishReason
        }],
        usage: {
          prompt_tokens: 0,  // Gemini doesn't provide this
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    
    default:
      return response;  // OpenAI/Ollama already in correct format
  }
}
```

---

## Streaming Architecture

### SSE (Server-Sent Events) Flow

```
Client ──► Proxy ──► Provider
  ▲                     │
  │                     │ SSE Stream
  │                     ↓
  │              ┌──────────────┐
  │              │ Chunk Buffer │
  │              └──────┬───────┘
  │                     │
  │                     ↓
  │              ┌──────────────┐
  │              │ Save Chunks  │
  │              │ to Trace     │
  │              └──────────────┘
  │
  └─────────────  Stream to Client
```

### Streaming Handler

```typescript
async function streamingChatCompletionsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const chunks: StreamChunk[] = [];
  const startTime = Date.now();
  let firstChunkTime: number | null = null;
  
  // Forward to provider with streaming enabled
  const response = await fetch(providerUrl, {
    method: 'POST',
    body: JSON.stringify({ ...request.body, stream: true }),
    headers: { ...headers }
  });
  
  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Stream chunks to client and buffer
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      
      const parsed = JSON.parse(data);
      
      // Record first chunk timing
      if (!firstChunkTime) {
        firstChunkTime = Date.now() - startTime;
      }
      
      // Add timing metadata
      parsed.delta_ms = chunks.length > 0 
        ? Date.now() - chunks[chunks.length - 1].timestamp
        : firstChunkTime;
      
      chunks.push(parsed);
      
      // Forward to client
      reply.raw.write(`data: ${data}\n\n`);
    }
  }
  
  reply.raw.write('data: [DONE]\n\n');
  reply.raw.end();
  
  // Save streaming trace
  await storage.saveTrace({
    ...baseTrace,
    streaming: true,
    chunks,
    total_chunks: chunks.length,
    stream_duration_ms: Date.now() - startTime,
    first_chunk_latency_ms: firstChunkTime
  });
}
```

---

## Test Execution Engine

### Assertion Engine

```typescript
class AssertionEngine {
  async runAssertion(
    assertion: Assertion,
    response: LLMResponse,
    metadata: TestMetadata
  ): Promise<AssertionResult> {
    switch (assertion.type) {
      case 'equals':
        return this.assertEquals(assertion, response);
      
      case 'content_contains':
        return this.assertContentContains(assertion, response);
      
      case 'fuzzy_match':
        return this.assertFuzzyMatch(assertion, response);
      
      case 'response_time':
        return this.assertResponseTime(assertion, metadata);
      
      // ... other assertion types
    }
  }
  
  private assertEquals(
    assertion: EqualsAssertion,
    response: LLMResponse
  ): AssertionResult {
    const actual = jsonPath(response, assertion.path);
    const expected = assertion.expected;
    
    const passed = deepEqual(actual, expected);
    
    return {
      type: 'equals',
      passed,
      expected,
      actual,
      message: passed 
        ? 'Values match' 
        : `Expected "${expected}", got "${actual}"`
    };
  }
  
  private assertFuzzyMatch(
    assertion: FuzzyMatchAssertion,
    response: LLMResponse
  ): AssertionResult {
    const actual = response.choices[0].message.content;
    const expected = assertion.expected;
    const threshold = assertion.threshold || 0.85;
    
    const similarity = levenshteinSimilarity(actual, expected);
    const passed = similarity >= threshold;
    
    return {
      type: 'fuzzy_match',
      passed,
      expected,
      actual,
      similarity,
      threshold,
      message: passed
        ? `Similarity ${(similarity * 100).toFixed(1)}% >= ${threshold * 100}%`
        : `Similarity ${(similarity * 100).toFixed(1)}% < ${threshold * 100}%`
    };
  }
}
```

### Parallel Execution

```typescript
class ParallelTestRunner {
  private workerPool: WorkerPool;
  
  async runTests(tests: Test[], options: RunOptions): Promise<TestResults> {
    if (!options.parallel) {
      return this.runSequential(tests);
    }
    
    this.workerPool = new WorkerPool(options.workers || 5);
    
    const results = await Promise.all(
      tests.map(test => this.workerPool.execute(async () => {
        return await this.runSingleTest(test);
      }))
    );
    
    return this.aggregateResults(results);
  }
  
  private async runSingleTest(test: Test): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Send request to proxy
      const response = await this.sendRequest(test.request);
      
      // Run assertions
      const assertionResults = await Promise.all(
        test.assertions.map(assertion =>
          this.assertionEngine.runAssertion(
            assertion,
            response,
            { duration: Date.now() - startTime }
          )
        )
      );
      
      const passed = assertionResults.every(r => r.passed);
      
      return {
        test: test.name,
        passed,
        duration: Date.now() - startTime,
        assertions: assertionResults
      };
    } catch (error) {
      return {
        test: test.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
}
```

---

## Extension Points

### Adding a New Provider

1. **Create handler** in `packages/proxy/src/handlers/`:

```typescript
// my-provider.ts
export async function myProviderHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Transform request
  const transformed = transformToMyProvider(request.body);
  
  // Call provider
  const response = await fetch(PROVIDER_URL, {
    method: 'POST',
    body: JSON.stringify(transformed),
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  
  const data = await response.json();
  
  // Normalize to OpenAI format
  const normalized = normalizeMyProviderResponse(data);
  
  // Save trace
  await storage.saveTrace({ ...normalized });
  
  // Return to client
  return reply.send(normalized);
}
```

2. **Add to provider detector**:

```typescript
// provider-detector.ts
if (model.startsWith('my-provider-')) {
  return 'my-provider';
}
```

3. **Register route**:

```typescript
// index.ts
server.post('/v1/my-provider/*', myProviderHandler);
```

### Adding a New Assertion Type

1. **Add type** to `packages/shared/src/types.ts`:

```typescript
export interface MyCustomAssertion extends BaseAssertion {
  type: 'my_custom';
  someParam: string;
}
```

2. **Implement in assertion engine**:

```typescript
// packages/cli/src/utils/assertions.ts
case 'my_custom':
  return this.assertMyCustom(assertion, response);

private assertMyCustom(
  assertion: MyCustomAssertion,
  response: LLMResponse
): AssertionResult {
  // Your logic here
  const passed = /* ... */;
  return { type: 'my_custom', passed, ... };
}
```

---

## Performance Considerations

### Proxy Overhead

- **Latency**: ~5-10ms added per request
- **Memory**: ~1MB per trace in memory (flushed to disk)
- **CPU**: Minimal (JSON parsing/serialization)

### Scalability

- **Traces**: Handles 10,000+ traces efficiently
- **Tests**: Parallel execution scales linearly
- **Concurrent Requests**: Handles 100+ concurrent proxy requests

### Optimization Tips

1. **Cleanup old traces** regularly
2. **Use --parallel** for large test suites
3. **Limit trace retention** in production
4. **Index with SQLite** for 100k+ traces (future)

---

## Security

### Local-First = Secure

- No data sent to external servers (except actual LLM calls)
- API keys never leave your machine
- Traces stored unencrypted locally (use disk encryption if needed)

### Best Practices

- Use environment variables for API keys
- Add `.ai-tests/` to `.gitignore` if traces contain sensitive data
- Run proxy on localhost only (not exposed to network)

---

## Next Steps

- [API Reference](API-REFERENCE.md) - Complete API documentation
- [Advanced Topics](ADVANCED.md) - Performance, patterns, integrations
- [Contributing](CONTRIBUTING.md) - Extend TraceForge
