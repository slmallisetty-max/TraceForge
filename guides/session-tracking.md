# Session Tracking Guide

> **Status**: Available in v0.5.0+

## Overview

Session tracking enables TraceForge to group related LLM calls into logical workflows, making it possible to trace and debug entire multi-step agent behaviors. This is essential for understanding complex agentic systems that make multiple LLM calls to accomplish a task.

## Key Concepts

### Session
A **session** represents a complete workflow or agent interaction. It groups multiple traces together and tracks:
- Session ID (unique identifier)
- Step sequence (0-based index)
- Hierarchical relationships (parent-child traces)
- State snapshots at each step
- Aggregate metrics (duration, tokens, cost)

### Step
Each **step** within a session represents a single LLM call. Steps are ordered sequentially and can reference parent steps for hierarchical workflows.

### State Snapshot
A **state snapshot** captures the environment or tool state at a particular step, enabling replay and debugging of the exact conditions under which an LLM call was made.

## Usage

### Basic Session Tracking

```typescript
import { SessionTracker } from '@traceforge/shared';

// Create a session tracker
const session = new SessionTracker();
session.start();

// Step 1: Initial query
session.setState('user_query', 'Book a flight to Paris');
const response1 = await fetch('http://localhost:8787/v1/chat/completions', {
  method: 'POST',
  headers: {
    ...session.getHeaders(),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Book a flight to Paris' }]
  })
});

session.nextStep();

// Step 2: Tool call
session.setState('tool_called', 'search_flights');
session.setState('search_params', { destination: 'Paris', date: '2024-06-01' });
const response2 = await fetch('http://localhost:8787/v1/chat/completions', {
  method: 'POST',
  headers: {
    ...session.getHeaders(),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [/* ... */]
  })
});

session.nextStep();

// Step 3: Present results
session.setState('results_count', 5);
const response3 = await fetch('http://localhost:8787/v1/chat/completions', {
  method: 'POST',
  headers: {
    ...session.getHeaders(),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [/* ... */]
  })
});

session.end();
```

### Manual Header Management

If you prefer not to use the `SessionTracker` class, you can manually set headers:

```typescript
const sessionId = crypto.randomUUID();

// First call (step 0)
await fetch('http://localhost:8787/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-TraceForge-Session-ID': sessionId,
    'X-TraceForge-Step-Index': '0',
    'X-TraceForge-State': JSON.stringify({ user_query: 'Hello' })
  },
  body: JSON.stringify({/* ... */})
});

// Second call (step 1)
await fetch('http://localhost:8787/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-TraceForge-Session-ID': sessionId,
    'X-TraceForge-Step-Index': '1',
    'X-TraceForge-State': JSON.stringify({ tool_result: 'data' })
  },
  body: JSON.stringify({/* ... */})
});
```

### Hierarchical Sessions

For complex workflows with sub-agents or nested calls:

```typescript
const session = new SessionTracker();
session.start();

// Parent step
const response1 = await fetch(/* ... */, {
  headers: { ...session.getHeaders() }
});

// Extract trace ID from response headers
const parentTraceId = response1.headers.get('X-TraceForge-Trace-ID');

session.nextStep();

// Child step that references parent
session.setParentTraceId(parentTraceId);
const response2 = await fetch(/* ... */, {
  headers: { ...session.getHeaders() }
});
```

## Response Headers

TraceForge returns session context in response headers for client chaining:

- `X-TraceForge-Session-ID`: Current session ID
- `X-TraceForge-Trace-ID`: Trace ID for this specific call
- `X-TraceForge-Next-Step`: Suggested next step index (current + 1)

Example:
```typescript
const response = await fetch(/* ... */);

const sessionId = response.headers.get('X-TraceForge-Session-ID');
const traceId = response.headers.get('X-TraceForge-Trace-ID');
const nextStep = response.headers.get('X-TraceForge-Next-Step');

console.log(`Session: ${sessionId}, Trace: ${traceId}, Next: ${nextStep}`);
```

## Querying Sessions

### Via Web API

```bash
# List all sessions
curl http://localhost:3001/api/sessions

# Get session details
curl http://localhost:3001/api/sessions/<session-id>

# Get timeline visualization data
curl http://localhost:3001/api/sessions/<session-id>/timeline
```

### Via Storage Backend

```typescript
import { SQLiteStorageBackend } from '@traceforge/proxy';

const storage = new SQLiteStorageBackend();

// List all traces in a session
const traces = await storage.listTracesBySession('session-123');

// Get session metadata
const metadata = await storage.getSessionMetadata('session-123');

console.log(`Session has ${metadata.total_steps} steps`);
console.log(`Total tokens: ${metadata.total_tokens}`);
console.log(`Duration: ${metadata.duration_ms}ms`);
console.log(`Status: ${metadata.status}`);
```

## Configuration

Session tracking is enabled by default. Configure via environment variables:

```bash
# .env
TRACEFORGE_SESSION_AUTO_ID=true              # Auto-generate session IDs (default: true)
# Note: The following are reserved for future implementation:
# TRACEFORGE_SESSION_TIMEOUT_MS=3600000      # Session timeout (not yet enforced)
# TRACEFORGE_SESSION_MAX_STEPS=1000          # Max steps per session (not yet enforced)
```

## Best Practices

### 1. Use Descriptive State Keys

```typescript
// Good
session.setState('user_intent', 'book_flight');
session.setState('selected_destination', 'Paris');

// Avoid
session.setState('data', 'flight');
session.setState('x', 'Paris');
```

### 2. Keep State Snapshots Small

State snapshots are limited to 10KB. Store only essential data:

```typescript
// Good - store references
session.setState('document_id', 'doc-123');

// Avoid - storing large objects
session.setState('full_document', largeObject);
```

### 3. Use Hierarchical Structure for Complex Workflows

```typescript
// Main agent
const mainSession = new SessionTracker();

// Sub-agent for specific task
const subSession = new SessionTracker();
subSession.setParentTraceId(mainTraceId);
```

### 4. End Sessions Properly

```typescript
try {
  // ... session work
} finally {
  session.end();
}
```

## Debugging with Sessions

### View Session Timeline

Access the web UI at `http://localhost:5173` and:

1. Navigate to Sessions tab
2. Click on a session to view details
3. See timeline visualization with:
   - Step-by-step execution flow
   - State changes between steps
   - Token usage per step
   - Duration metrics
   - Parent-child relationships

### Replay Entire Sessions

```typescript
// Get all traces in a session
const traces = await storage.listTracesBySession('session-123');

// Replay each step
for (const trace of traces) {
  console.log(`Step ${trace.step_index}:`);
  console.log(`  Model: ${trace.metadata.model}`);
  console.log(`  Duration: ${trace.metadata.duration_ms}ms`);
  console.log(`  State:`, trace.state_snapshot);
  console.log(`  Request:`, trace.request);
  console.log(`  Response:`, trace.response);
}
```

## Integration Examples

### LangChain

```typescript
import { SessionTracker } from '@traceforge/shared';
import { ChatOpenAI } from 'langchain/chat_models/openai';

const session = new SessionTracker();
session.start();

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  configuration: {
    baseURL: 'http://localhost:8787/v1',
    defaultHeaders: session.getHeaders()
  }
});

// Each call will be tracked in the session
await model.call([/* messages */]);
session.nextStep();

await model.call([/* more messages */]);
session.nextStep();

session.end();
```

### AutoGen

```typescript
const session = new SessionTracker();
session.start();

const config = {
  base_url: 'http://localhost:8787/v1',
  default_headers: session.getHeaders()
};

// AutoGen will use these headers for all LLM calls
```

### Custom Agent Framework

```typescript
class MyAgent {
  private session: SessionTracker;

  constructor() {
    this.session = new SessionTracker();
  }

  async run(query: string) {
    this.session.start();
    this.session.setState('query', query);

    // Step 1: Plan
    const plan = await this.llmCall('plan', query);
    this.session.nextStep();

    // Step 2: Execute
    for (const step of plan.steps) {
      this.session.setState('executing_step', step.name);
      await this.llmCall('execute', step);
      this.session.nextStep();
    }

    // Step 3: Summarize
    const summary = await this.llmCall('summarize', plan.results);
    this.session.end();

    return summary;
  }

  private async llmCall(type: string, data: any) {
    return await fetch('http://localhost:8787/v1/chat/completions', {
      method: 'POST',
      headers: {
        ...this.session.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({/* ... */})
    });
  }
}
```

## Troubleshooting

### Sessions Not Appearing

1. Verify headers are being sent correctly
2. Check that TraceForge proxy is running on port 8787
3. Ensure `save_traces` is enabled in config

### Session IDs Not Consistent

- Make sure you're using the same `SessionTracker` instance across calls
- If manually managing headers, reuse the same session ID

### State Snapshot Too Large

- Reduce state payload to < 10KB
- Store references instead of full objects
- Use external storage and store keys/IDs only

## See Also

- [Trace Format Guide](./trace-format.md)
- [API Reference](./API.md)
- [Web UI Guide](./getting-started.md)
