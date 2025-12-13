# TraceForge V2 Implementation Guide

**Goal:** Add production-ready features to transform TraceForge from MVP to professional AI debugging platform.

**Timeline:** 7-10 weeks

---

## Overview

V2 builds on the solid V1 foundation to add:
- **Streaming support** for real-world LLM apps
- **Visual diff** for comparing traces
- **Advanced assertions** for robust testing
- **Analytics dashboard** for insights
- **VS Code integration** for developer workflow
- **Multi-provider support** for ecosystem growth

---

## Prerequisites

Before starting V2:
- ✅ V1 must be fully functional and tested
- ✅ All V1 packages build successfully
- ✅ End-to-end workflow validated
- ✅ Documentation complete
- ✅ Clean git state (tag as v1.0.0)

---

# V2 Roadmap

## Phase 1: Streaming Support (Week 1-2)

**Goal:** Capture and display Server-Sent Events (SSE) responses

### Why This Matters

95% of production LLM apps use streaming. Without this, TraceForge can't be used seriously.

### Technical Architecture

```
Client → Proxy → OpenAI (streaming)
           ↓
    Capture chunks
           ↓
    Store as trace
```

### Implementation Steps

#### 1.1 Update Shared Types

**File:** `packages/shared/src/types.ts`

Add streaming-specific types:

```typescript
interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
  delta_ms?: number; // Time since last chunk
}

interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    function_call?: any;
  };
  finish_reason: string | null;
}

interface StreamingTrace extends Trace {
  streaming: true;
  chunks: StreamChunk[];
  total_chunks: number;
  stream_duration_ms: number;
  first_chunk_latency_ms: number;
}
```

#### 1.2 Proxy Streaming Handler

**File:** `packages/proxy/src/handlers/streaming-chat-completions.ts`

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LLMRequest, StreamingTrace } from '@traceforge/shared';

export async function streamingChatCompletionsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = request.body as LLMRequest;
  const trace: Partial<StreamingTrace> = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    endpoint: '/v1/chat/completions',
    request: body,
    streaming: true,
    chunks: [],
    metadata: {
      status: 'pending',
      duration_ms: 0,
    }
  };

  const startTime = Date.now();
  let firstChunk = true;

  try {
    // Forward to OpenAI with streaming
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastChunkTime = startTime;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            reply.raw.write(`data: [DONE]\n\n`);
            continue;
          }

          try {
            const chunk = JSON.parse(data);
            const now = Date.now();
            
            // Record first chunk latency
            if (firstChunk) {
              trace.first_chunk_latency_ms = now - startTime;
              firstChunk = false;
            }

            // Add chunk with timing
            trace.chunks!.push({
              ...chunk,
              delta_ms: now - lastChunkTime,
            });

            lastChunkTime = now;

            // Forward to client
            reply.raw.write(`data: ${data}\n\n`);
          } catch (e) {
            // Malformed chunk, skip
          }
        }
      }
    }

    // Finalize trace
    trace.total_chunks = trace.chunks!.length;
    trace.stream_duration_ms = Date.now() - startTime;
    trace.metadata!.status = 'success';
    trace.metadata!.duration_ms = trace.stream_duration_ms;

    // Save trace
    await storage.saveTrace(trace as StreamingTrace);

    reply.raw.end();
  } catch (error) {
    trace.metadata!.status = 'error';
    trace.metadata!.error = String(error);
    await storage.saveTrace(trace as StreamingTrace);
    
    reply.status(500).send({ error: String(error) });
  }
}
```

#### 1.3 Update Proxy Router

**File:** `packages/proxy/src/index.ts`

```typescript
// Check if request wants streaming
fastify.post('/v1/chat/completions', async (request, reply) => {
  const body = request.body as any;
  
  if (body.stream === true) {
    return streamingChatCompletionsHandler(request, reply);
  } else {
    return chatCompletionsHandler(request, reply);
  }
});
```

#### 1.4 Web UI: Streaming Trace Display

**File:** `packages/web/src/components/StreamingTraceDetail.tsx`

```typescript
import { useState, useEffect } from 'react';
import type { StreamingTrace, StreamChunk } from '@traceforge/shared';

interface Props {
  trace: StreamingTrace;
}

export default function StreamingTraceDetail({ trace }: Props) {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reconstruct full text from chunks
  const fullText = trace.chunks
    .map(chunk => chunk.choices[0]?.delta?.content || '')
    .join('');

  // Replay streaming animation
  const playbackText = trace.chunks
    .slice(0, playbackIndex + 1)
    .map(chunk => chunk.choices[0]?.delta?.content || '')
    .join('');

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= trace.chunks.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 50); // 50ms between chunks

    return () => clearInterval(timer);
  }, [isPlaying, trace.chunks.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Streaming Response</h3>
        <button
          onClick={() => {
            setPlaybackIndex(0);
            setIsPlaying(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ▶ Replay Stream
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800 rounded">
        <div>
          <div className="text-sm text-gray-400">Total Chunks</div>
          <div className="text-2xl font-bold">{trace.total_chunks}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">First Chunk</div>
          <div className="text-2xl font-bold">{trace.first_chunk_latency_ms}ms</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Total Duration</div>
          <div className="text-2xl font-bold">{trace.stream_duration_ms}ms</div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <pre className="text-gray-100 whitespace-pre-wrap">
          {isPlaying ? playbackText : fullText}
          {isPlaying && <span className="animate-pulse">|</span>}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Chunk Timeline</h4>
        <div className="space-y-1">
          {trace.chunks.map((chunk, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm p-2 bg-gray-800 rounded"
            >
              <span className="text-gray-400 w-12">#{i}</span>
              <span className="text-blue-400 w-20">+{chunk.delta_ms}ms</span>
              <span className="text-gray-300 flex-1 truncate">
                {chunk.choices[0]?.delta?.content || '(meta)'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 1.5 CLI: Display Streaming Traces

**File:** `packages/cli/src/commands/trace.ts`

Add detection for streaming traces:

```typescript
if (trace.streaming) {
  console.log(chalk.yellow('  Streaming: Yes'));
  console.log(chalk.gray(`  Chunks: ${trace.total_chunks}`));
  console.log(chalk.gray(`  First chunk: ${trace.first_chunk_latency_ms}ms`));
}
```

### Testing Streaming

1. Update demo app to use streaming:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Count to 10' }],
  stream: true, // Enable streaming
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

2. Verify trace captured with chunks
3. Check Web UI replay feature works
4. Confirm CLI displays streaming metadata

### Deliverable
✅ Streaming requests captured and displayed with timing data

---

## Phase 2: Trace Diff View (Week 3)

**Goal:** Visual comparison of two traces to detect changes

### Implementation Steps

#### 2.1 Update Shared Types

```typescript
interface TraceDiff {
  id1: string;
  id2: string;
  differences: {
    request: JsonDiff;
    response: JsonDiff;
    metadata: MetadataDiff;
  };
  similarity_score: number;
}

interface JsonDiff {
  added: Array<{ path: string; value: any }>;
  removed: Array<{ path: string; value: any }>;
  changed: Array<{ path: string; from: any; to: any }>;
}
```

#### 2.2 Web API: Diff Endpoint

**File:** `packages/web/server/routes/diff.ts`

```typescript
import { diff } from 'deep-diff';

fastify.get('/api/traces/diff', async (request, reply) => {
  const { id1, id2 } = request.query as { id1: string; id2: string };

  const trace1 = await loadTrace(id1);
  const trace2 = await loadTrace(id2);

  if (!trace1 || !trace2) {
    return reply.status(404).send({ error: 'Trace not found' });
  }

  // Compute differences
  const requestDiff = diff(trace1.request, trace2.request) || [];
  const responseDiff = diff(trace1.response, trace2.response) || [];

  // Calculate similarity
  const totalFields = Object.keys(trace1.response).length;
  const changedFields = responseDiff.length;
  const similarity = 1 - (changedFields / totalFields);

  return {
    id1,
    id2,
    differences: {
      request: formatDiff(requestDiff),
      response: formatDiff(responseDiff),
    },
    similarity_score: similarity,
  };
});
```

#### 2.3 React Diff Component

**File:** `packages/web/src/components/TraceDiff.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDiff } from '../api/client';
import type { TraceDiff } from '@traceforge/shared';

export default function TraceDiffView() {
  const [searchParams] = useSearchParams();
  const [diff, setDiff] = useState<TraceDiff | null>(null);

  const id1 = searchParams.get('id1');
  const id2 = searchParams.get('id2');

  useEffect(() => {
    if (id1 && id2) {
      fetchDiff(id1, id2).then(setDiff);
    }
  }, [id1, id2]);

  if (!diff) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trace Comparison</h2>
        <div className="text-lg">
          Similarity: 
          <span className={`ml-2 font-bold ${
            diff.similarity_score > 0.9 ? 'text-green-400' : 
            diff.similarity_score > 0.7 ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {(diff.similarity_score * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Trace 1: {id1}</h3>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Trace 2: {id2}</h3>
        </div>
      </div>

      {diff.differences.response.changed.map((change, i) => (
        <div key={i} className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400 mb-2">{change.path}</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-900/20 p-3 rounded border border-red-700">
              <pre className="text-sm">{JSON.stringify(change.from, null, 2)}</pre>
            </div>
            <div className="bg-green-900/20 p-3 rounded border border-green-700">
              <pre className="text-sm">{JSON.stringify(change.to, null, 2)}</pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 2.4 Add Diff Button to Timeline

**File:** `packages/web/src/components/TraceList.tsx`

Add checkbox selection:

```typescript
const [selectedTraces, setSelectedTraces] = useState<string[]>([]);

// In table row
<input
  type="checkbox"
  checked={selectedTraces.includes(trace.id)}
  onChange={(e) => {
    if (e.target.checked) {
      setSelectedTraces([...selectedTraces, trace.id]);
    } else {
      setSelectedTraces(selectedTraces.filter(id => id !== trace.id));
    }
  }}
/>

// Compare button
{selectedTraces.length === 2 && (
  <button
    onClick={() => navigate(`/diff?id1=${selectedTraces[0]}&id2=${selectedTraces[1]}`)}
    className="px-4 py-2 bg-blue-600 text-white rounded"
  >
    Compare Selected
  </button>
)}
```

### Deliverable
✅ Side-by-side trace comparison with visual diff

---

## Phase 3: Advanced Assertions (Week 4)

**Goal:** Robust testing with multiple assertion types

### New Assertion Types

#### 3.1 Update Shared Types

```typescript
type AssertionType = 
  | 'exact'
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'json_path'
  | 'fuzzy_match'
  | 'token_count'
  | 'response_time';

interface Assertion {
  type: AssertionType;
  value?: any;
  pattern?: string;
  path?: string;
  threshold?: number;
  min?: number;
  max?: number;
  description?: string;
}
```

#### 3.2 Assertion Evaluator

**File:** `packages/cli/src/commands/assertions.ts`

```typescript
import { minimatch } from 'minimatch';
import jp from 'jsonpath';
import { stringSimilarity } from 'string-similarity';

export function evaluateAssertion(
  assertion: Assertion,
  response: LLMResponse,
  metadata: TraceMetadata
): AssertionResult {
  const responseText = extractText(response);

  switch (assertion.type) {
    case 'exact':
      return {
        passed: responseText === assertion.value,
        message: `Expected exact match: "${assertion.value}"`,
      };

    case 'contains':
      return {
        passed: responseText.includes(assertion.value),
        message: `Expected to contain: "${assertion.value}"`,
      };

    case 'not_contains':
      return {
        passed: !responseText.includes(assertion.value),
        message: `Expected NOT to contain: "${assertion.value}"`,
      };

    case 'regex':
      const regex = new RegExp(assertion.pattern!);
      return {
        passed: regex.test(responseText),
        message: `Expected to match regex: ${assertion.pattern}`,
      };

    case 'json_path':
      try {
        const result = jp.query(response, assertion.path!);
        const matches = result.includes(assertion.value);
        return {
          passed: matches,
          message: `JSONPath ${assertion.path}: expected ${assertion.value}`,
        };
      } catch (e) {
        return {
          passed: false,
          message: `Invalid JSONPath: ${assertion.path}`,
        };
      }

    case 'fuzzy_match':
      const similarity = stringSimilarity.compareTwoStrings(
        responseText,
        assertion.value
      );
      return {
        passed: similarity >= (assertion.threshold || 0.8),
        message: `Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(assertion.threshold || 0.8) * 100}%)`,
      };

    case 'token_count':
      const tokens = metadata.tokens_used || 0;
      const inRange = 
        (!assertion.min || tokens >= assertion.min) &&
        (!assertion.max || tokens <= assertion.max);
      return {
        passed: inRange,
        message: `Token count: ${tokens} (expected: ${assertion.min || 0}-${assertion.max || '∞'})`,
      };

    case 'response_time':
      const duration = metadata.duration_ms;
      return {
        passed: duration <= (assertion.max || 5000),
        message: `Response time: ${duration}ms (max: ${assertion.max || 5000}ms)`,
      };

    default:
      return {
        passed: false,
        message: `Unknown assertion type: ${assertion.type}`,
      };
  }
}
```

#### 3.3 Update Test YAML Schema

Example test with new assertions:

```yaml
id: advanced-test-1
name: "Complex GPT-4 Test"
request:
  model: gpt-4
  messages:
    - role: user
      content: "What is 2+2?"
assertions:
  - type: contains
    value: "4"
    description: "Must mention the number 4"
  
  - type: regex
    pattern: "\\d+"
    description: "Must contain at least one number"
  
  - type: fuzzy_match
    value: "The answer is four"
    threshold: 0.7
    description: "Similar to expected phrasing"
  
  - type: token_count
    min: 5
    max: 50
    description: "Reasonable response length"
  
  - type: response_time
    max: 3000
    description: "Must respond within 3 seconds"
```

### Deliverable
✅ 8 assertion types with comprehensive evaluation

---

## Phase 4: Project Dashboard (Week 5)

**Goal:** Analytics and insights for AI usage

### Implementation Steps

#### 4.1 Analytics API Endpoint

**File:** `packages/web/server/routes/analytics.ts`

```typescript
fastify.get('/api/analytics', async (request, reply) => {
  const traces = await loadAllTraces();
  const tests = await loadAllTests();

  // Aggregate metrics
  const last7Days = traces.filter(t => 
    Date.parse(t.timestamp) > Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  return {
    total_traces: traces.length,
    traces_last_7_days: last7Days.length,
    total_tests: tests.length,
    models_used: [...new Set(traces.map(t => t.request.model))],
    average_tokens: average(traces.map(t => t.metadata.tokens_used || 0)),
    average_duration: average(traces.map(t => t.metadata.duration_ms)),
    success_rate: traces.filter(t => t.metadata.status === 'success').length / traces.length,
    timeline: generateTimeline(traces),
  };
});
```

#### 4.2 Dashboard Component

**File:** `packages/web/src/components/Dashboard.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { fetchAnalytics } from '../api/client';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics().then(setAnalytics);
  }, []);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Traces"
          value={analytics.total_traces}
          change="+12% vs last week"
        />
        <MetricCard
          title="Success Rate"
          value={`${(analytics.success_rate * 100).toFixed(1)}%`}
          change="+2.3% vs last week"
        />
        <MetricCard
          title="Avg Tokens"
          value={Math.round(analytics.average_tokens)}
          change="-5% vs last week"
        />
        <MetricCard
          title="Avg Duration"
          value={`${Math.round(analytics.average_duration)}ms`}
          change="+50ms vs last week"
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">Traces Over Time</h3>
          <Line data={analytics.timeline} />
        </div>

        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">Models Used</h3>
          <Pie data={modelDistribution(analytics.models_used)} />
        </div>
      </div>
    </div>
  );
}
```

### Deliverable
✅ Analytics dashboard with charts and metrics

---

## Phase 5: Config Editor (Week 6)

**Goal:** Edit configuration from Web UI

### Implementation Steps

#### 5.1 Config API Endpoints

```typescript
fastify.get('/api/config', async (request, reply) => {
  const config = await loadConfig();
  return config;
});

fastify.put('/api/config', async (request, reply) => {
  const newConfig = request.body as Config;
  await saveConfig(newConfig);
  return { success: true };
});
```

#### 5.2 Config Editor Component

**File:** `packages/web/src/components/ConfigEditor.tsx`

```typescript
export default function ConfigEditor() {
  const [config, setConfig] = useState<Config | null>(null);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Proxy Port
        </label>
        <input
          type="number"
          value={config?.proxy_port || 8787}
          onChange={(e) => setConfig({...config!, proxy_port: Number(e.target.value)})}
          className="w-full px-4 py-2 bg-gray-800 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Upstream URL
        </label>
        <input
          type="text"
          value={config?.upstream_url}
          onChange={(e) => setConfig({...config!, upstream_url: e.target.value})}
          className="w-full px-4 py-2 bg-gray-800 rounded"
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config?.save_traces}
            onChange={(e) => setConfig({...config!, save_traces: e.target.checked})}
          />
          Save traces to disk
        </label>
      </div>

      <button type="submit" className="px-6 py-2 bg-blue-600 rounded">
        Save Configuration
      </button>
    </form>
  );
}
```

### Deliverable
✅ Web-based config editor with validation

---

## Phase 6: Test Runner Improvements (Week 7)

**Goal:** Production-ready test execution

### Features to Add

#### 6.1 Parallel Execution

```typescript
// Run tests in parallel
const results = await Promise.all(
  tests.map(test => runTest(test))
);
```

#### 6.2 JUnit XML Export

```typescript
function exportJUnit(results: TestResult[]) {
  const xml = `
    <testsuite tests="${results.length}" failures="${results.filter(r => !r.passed).length}">
      ${results.map(r => `
        <testcase name="${r.name}" time="${r.duration_ms / 1000}">
          ${!r.passed ? `<failure message="${r.message}" />` : ''}
        </testcase>
      `).join('\n')}
    </testsuite>
  `;
  return xml;
}
```

#### 6.3 Watch Mode

```typescript
// packages/cli/src/commands/test.ts
testCommand
  .option('--watch', 'Re-run tests on file changes')
  .action(async (options) => {
    if (options.watch) {
      const watcher = fs.watch('.ai-tests/tests', async (event, filename) => {
        console.log(chalk.blue(`\nFile changed: ${filename}`));
        await runAllTests();
      });
    }
  });
```

### Deliverable
✅ Fast, parallel test runner with CI exports

---

## Phase 7: VS Code Extension (Week 8-9)

**Goal:** Integrate TraceForge into developer workflow

### Extension Features

#### 7.1 Test Explorer Sidebar

```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new TraceForgeTreeProvider();
  vscode.window.registerTreeDataProvider('traceforge-tests', treeDataProvider);
}

class TraceForgeTreeProvider implements vscode.TreeDataProvider<TestNode> {
  getChildren(): TestNode[] {
    const tests = loadTestFiles();
    return tests.map(t => new TestNode(t));
  }
}
```

#### 7.2 CodeLens for Tests

```typescript
class TestCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!document.fileName.endsWith('.yaml')) return [];

    const lenses: vscode.CodeLens[] = [];
    
    // Add "Run Test" button at top of file
    lenses.push(new vscode.CodeLens(
      new vscode.Range(0, 0, 0, 0),
      {
        title: '▶ Run Test',
        command: 'traceforge.runTest',
        arguments: [document.fileName]
      }
    ));

    return lenses;
  }
}
```

#### 7.3 Syntax Highlighting

**File:** `syntaxes/traceforge-test.tmLanguage.json`

```json
{
  "scopeName": "source.traceforge",
  "patterns": [
    {
      "match": "^(id|name|request|assertions):",
      "name": "keyword.control.traceforge"
    },
    {
      "match": "(exact|contains|regex|fuzzy_match):",
      "name": "entity.name.function.traceforge"
    }
  ]
}
```

### Deliverable
✅ VS Code extension with test runner and syntax highlighting

---

## Phase 8: Multi-Provider Support (Week 10)

**Goal:** Support multiple AI providers

### Provider Adapters

#### 8.1 Provider Interface

```typescript
interface ProviderAdapter {
  name: string;
  normalizeRequest(req: any): LLMRequest;
  normalizeResponse(res: any): LLMResponse;
  upstreamUrl: string;
  headers: Record<string, string>;
}
```

#### 8.2 Anthropic Adapter

```typescript
class AnthropicAdapter implements ProviderAdapter {
  name = 'anthropic';
  upstreamUrl = 'https://api.anthropic.com/v1/messages';

  normalizeRequest(req: any): LLMRequest {
    return {
      model: req.model,
      messages: req.messages,
      max_tokens: req.max_tokens,
    };
  }

  normalizeResponse(res: any): LLMResponse {
    return {
      id: res.id,
      choices: [{
        message: {
          role: 'assistant',
          content: res.content[0].text
        }
      }],
      usage: {
        prompt_tokens: res.usage.input_tokens,
        completion_tokens: res.usage.output_tokens,
      }
    };
  }

  get headers() {
    return {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    };
  }
}
```

#### 8.3 Provider Registry

```typescript
const providers = {
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
  gemini: new GeminiAdapter(),
  ollama: new OllamaAdapter(),
};

// Auto-detect provider from URL or config
function getProvider(config: Config): ProviderAdapter {
  return providers[config.provider] || providers.openai;
}
```

### Deliverable
✅ Support for 4+ AI providers with unified interface

---

## V2 Testing & Validation

### Integration Tests

```bash
# Test streaming
node examples/streaming-demo.js

# Test diff
ai-debug diff trace1 trace2

# Test advanced assertions
ai-debug test run advanced-tests/

# Test dashboard
open http://localhost:5173/dashboard

# Test VS Code extension
code --install-extension traceforge-0.2.0.vsix
```

### Performance Benchmarks

- Streaming capture: < 5ms overhead per chunk
- Diff computation: < 100ms for typical traces
- Dashboard load: < 500ms
- Test suite (100 tests): < 10 seconds

---

## V2 Documentation Updates

### New Docs to Write

1. **STREAMING.md** - Streaming capture guide
2. **DIFF-GUIDE.md** - How to use diff view
3. **ASSERTIONS.md** - Complete assertion reference
4. **DASHBOARD.md** - Dashboard metrics explained
5. **VSCODE.md** - VS Code extension usage

### Update Existing Docs

- README.md - Add V2 features
- QUICKSTART.md - Update screenshots
- API.md - New endpoints

---

## V2 Success Criteria

- ✅ Streaming responses captured and displayed
- ✅ Visual diff shows changes between traces
- ✅ 8+ assertion types supported
- ✅ Dashboard provides actionable insights
- ✅ Config editable from Web UI
- ✅ Tests run in parallel with JUnit export
- ✅ VS Code extension published
- ✅ 3+ AI providers supported
- ✅ All V1 features still work
- ✅ Documentation complete

---

## Post-V2 Roadmap (V3 Preview)

### Major V3 Features

1. **Semantic Assertions** - LLM-powered test evaluation
2. **Test Flows** - Multi-step conversation testing
3. **Timeline Replay** - Step-by-step debugging
4. **Plugin Architecture** - Extensibility system
5. **Enterprise Features** - Teams, RBAC, audit logs
6. **AI Autopilot** - Automated debugging insights

See [mvp-plan.md](./mvp-plan.md) for full V3 vision.

---

## Tips for V2 Development

### Start with Streaming

This is the #1 requested feature. Get it working first.

### Test with Real Apps

Use production-like apps with streaming, not just demos.

### Keep V1 Stable

Don't break existing functionality. Add, don't replace.

### Document As You Go

Each feature needs examples and screenshots.

### Get Feedback Early

Share preview builds with early users.

### Performance Matters

V2 adds complexity - keep it fast.

---

## Resources

### Dependencies to Add

```json
{
  "deep-diff": "^1.0.2",
  "jsonpath": "^1.1.1",
  "string-similarity": "^4.0.4",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "minimatch": "^9.0.3"
}
```

### VS Code Extension Template

```bash
npm install -g yo generator-code
yo code
# Select: New Extension (TypeScript)
```

---

## Timeline Summary

| Phase | Task | Duration | Cumulative |
|-------|------|----------|------------|
| 1 | Streaming Support | 2 weeks | 2 weeks |
| 2 | Trace Diff View | 1 week | 3 weeks |
| 3 | Advanced Assertions | 1 week | 4 weeks |
| 4 | Dashboard | 1 week | 5 weeks |
| 5 | Config Editor | 1 week | 6 weeks |
| 6 | Test Runner | 1 week | 7 weeks |
| 7 | VS Code Extension | 2 weeks | 9 weeks |
| 8 | Multi-Provider | 1 week | 10 weeks |

**Total: 10 weeks** for complete V2

---

## End of V2 Implementation Guide

This guide transforms TraceForge from MVP to production-ready AI debugging platform. Follow phases sequentially, test continuously, and gather user feedback throughout.

Ready to build V2! 🚀
