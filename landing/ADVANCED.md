# TraceForge Advanced Topics

Advanced features, patterns, and best practices for power users.

---

## Table of Contents

1. [Multi-Provider Strategies](#multi-provider-strategies)
2. [Advanced Testing Patterns](#advanced-testing-patterns)
3. [Performance Optimization](#performance-optimization)
4. [CI/CD Integration](#cicd-integration)
5. [Production Deployment](#production-deployment)
6. [Custom Integrations](#custom-integrations)
7. [Cost Optimization](#cost-optimization)
8. [Security Best Practices](#security-best-practices)

---

## Multi-Provider Strategies

### Fallback Chain

Automatically fallback to alternative providers if primary fails:

```yaml
# .ai-tests/config.yaml
providers:
  - type: openai
    name: OpenAI GPT-4
    priority: 1
    fallback: anthropic
    
  - type: anthropic
    name: Claude Opus
    priority: 2
    fallback: gemini
    
  - type: gemini
    name: Gemini Pro
    priority: 3
```

Implementation:

```javascript
// custom-client.js
const providers = ['openai', 'anthropic', 'gemini'];

async function callWithFallback(prompt) {
  for (const provider of providers) {
    try {
      const model = getModelForProvider(provider);
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }]
      });
      return response;
    } catch (error) {
      console.log(`${provider} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All providers failed');
}
```

### Load Balancing

Distribute requests across multiple providers:

```javascript
class LoadBalancer {
  constructor() {
    this.providers = [
      { name: 'openai', model: 'gpt-3.5-turbo', weight: 50 },
      { name: 'anthropic', model: 'claude-3-sonnet', weight: 30 },
      { name: 'gemini', model: 'gemini-pro', weight: 20 }
    ];
    this.index = 0;
  }
  
  getNextProvider() {
    // Round-robin
    const provider = this.providers[this.index];
    this.index = (this.index + 1) % this.providers.length;
    return provider;
  }
  
  async call(prompt) {
    const { model } = this.getNextProvider();
    return await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }]
    });
  }
}
```

### A/B Testing

Compare providers in production:

```javascript
async function abTest(prompt, userId) {
  // Hash user ID to consistently assign provider
  const bucket = hashUserId(userId) % 2;
  const model = bucket === 0 ? 'gpt-4' : 'claude-3-opus';
  
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    metadata: { ab_test: true, bucket }
  });
  
  // Track metrics
  await analytics.track({
    userId,
    provider: bucket === 0 ? 'openai' : 'anthropic',
    model,
    satisfaction: await getSatisfactionScore(userId)
  });
  
  return response;
}
```

---

## Advanced Testing Patterns

### Parameterized Tests

Test same logic with different inputs:

```yaml
# parameterized-test.test.yaml
name: parameterized-math-test
description: Test math with multiple inputs

parameters:
  - question: "What is 2+2?"
    expected: "4"
  - question: "What is 10*5?"
    expected: "50"
  - question: "What is 100/4?"
    expected: "25"

template:
  request:
    model: gpt-3.5-turbo
    messages:
      - role: user
        content: "{{question}}"
    temperature: 0
  
  assertions:
    - type: content_contains
      value: "{{expected}}"
```

Runner implementation:

```javascript
async function runParameterizedTest(test) {
  const results = [];
  
  for (const params of test.parameters) {
    const request = interpolate(test.template.request, params);
    const assertions = interpolate(test.template.assertions, params);
    
    const result = await runTest({
      name: `${test.name} (${params.question})`,
      request,
      assertions
    });
    
    results.push(result);
  }
  
  return results;
}
```

### Test Fixtures

Share setup across tests:

```yaml
# fixtures/common.yaml
openai_key: ${OPENAI_API_KEY}
base_url: http://localhost:8787/v1

system_prompts:
  helpful: "You are a helpful assistant."
  concise: "Be brief and to the point."
  technical: "You are a technical expert."

test_users:
  - id: user1
    context: "Beginner programmer"
  - id: user2
    context: "Senior engineer"
```

Use in tests:

```yaml
# test-with-fixture.test.yaml
name: test-with-fixture
fixtures:
  - ./fixtures/common.yaml

request:
  model: gpt-3.5-turbo
  messages:
    - role: system
      content: "{{system_prompts.helpful}}"
    - role: user
      content: "Hello"
```

### Snapshot Testing

Test that responses don't change unexpectedly:

```yaml
name: snapshot-test
description: Ensure stable responses

request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: "What is the capital of France?"
  temperature: 0  # Deterministic

assertions:
  - type: snapshot
    snapshot_file: .ai-tests/snapshots/capital-france.txt
    tolerance: 0.05  # Allow 5% variation
```

Implementation:

```javascript
function assertSnapshot(actual, snapshotFile, tolerance) {
  if (!fs.existsSync(snapshotFile)) {
    // First run - create snapshot
    fs.writeFileSync(snapshotFile, actual);
    return { passed: true, message: 'Snapshot created' };
  }
  
  const expected = fs.readFileSync(snapshotFile, 'utf8');
  const similarity = calculateSimilarity(actual, expected);
  const passed = similarity >= (1 - tolerance);
  
  return {
    passed,
    message: passed
      ? `Snapshot matches (${(similarity * 100).toFixed(1)}%)`
      : `Snapshot differs (${(similarity * 100).toFixed(1)}% similar)`,
    expected,
    actual
  };
}
```

### Mutation Testing

Test with intentionally wrong inputs:

```yaml
name: mutation-test
description: Test error handling

mutations:
  - type: remove_field
    field: messages
  - type: invalid_model
    model: "invalid-model-name"
  - type: negative_max_tokens
    max_tokens: -100

request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: "Hello"

assertions:
  - type: error_handling
    expect_error: true
    error_codes: [400, 422]
```

---

## Performance Optimization

### Caching Responses

Cache LLM responses for identical requests:

```javascript
const cache = new Map();

function getCacheKey(request) {
  return JSON.stringify({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature
  });
}

async function cachedCall(request) {
  const key = getCacheKey(request);
  
  if (cache.has(key)) {
    console.log('Cache hit!');
    return cache.get(key);
  }
  
  const response = await openai.chat.completions.create(request);
  cache.set(key, response);
  return response;
}
```

With Redis for distributed caching:

```javascript
const redis = require('redis');
const client = redis.createClient();

async function cachedCallRedis(request) {
  const key = getCacheKey(request);
  
  const cached = await client.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const response = await openai.chat.completions.create(request);
  await client.set(key, JSON.stringify(response), {
    EX: 3600  // Expire after 1 hour
  });
  
  return response;
}
```

### Request Batching

Batch multiple requests:

```javascript
class BatchProcessor {
  constructor(batchSize = 10, delayMs = 1000) {
    this.queue = [];
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.timer = null;
  }
  
  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delayMs);
      }
    });
  }
  
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    const batch = this.queue.splice(0, this.batchSize);
    
    // Process batch in parallel
    const results = await Promise.all(
      batch.map(({ request }) =>
        openai.chat.completions.create(request)
      )
    );
    
    // Resolve promises
    batch.forEach(({ resolve }, i) => resolve(results[i]));
  }
}

// Usage
const batcher = new BatchProcessor();
const response1 = await batcher.add(request1);
const response2 = await batcher.add(request2);
```

### Streaming Optimization

Optimize streaming responses:

```javascript
async function optimizedStreaming(request) {
  const stream = await openai.chat.completions.create({
    ...request,
    stream: true
  });
  
  let buffer = '';
  let lastFlush = Date.now();
  const flushInterval = 100; // ms
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    buffer += content;
    
    const now = Date.now();
    if (now - lastFlush >= flushInterval || buffer.length > 100) {
      // Flush buffer
      process.stdout.write(buffer);
      buffer = '';
      lastFlush = now;
    }
  }
  
  // Flush remaining
  if (buffer) {
    process.stdout.write(buffer);
  }
}
```

### Trace Compression

Compress large traces:

```javascript
const zlib = require('zlib');

async function compressTrace(trace) {
  const json = JSON.stringify(trace);
  const compressed = await zlib.gzipSync(json);
  
  await fs.writeFile(
    `${trace.id}.json.gz`,
    compressed
  );
}

async function decompressTrace(id) {
  const compressed = await fs.readFile(`${id}.json.gz`);
  const json = await zlib.gunzipSync(compressed);
  return JSON.parse(json);
}
```

---

## CI/CD Integration

### Parallel Test Execution

Optimize CI runtime:

```yaml
# .github/workflows/ai-tests.yml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4, 5]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests (shard ${{ matrix.shard }})
        run: |
          traceforge test run \
            --parallel \
            --shard ${{ matrix.shard }}/5
```

### Test Result Reporting

Enhanced reporting:

```javascript
// custom-reporter.js
class CustomReporter {
  onTestComplete(test, result) {
    // Send to analytics
    fetch('https://analytics.example.com/test-result', {
      method: 'POST',
      body: JSON.stringify({
        test: test.name,
        passed: result.passed,
        duration: result.duration,
        tokens: result.tokens,
        cost: calculateCost(result),
        timestamp: new Date()
      })
    });
  }
  
  onSuiteComplete(results) {
    // Generate HTML report
    const html = generateHTMLReport(results);
    fs.writeFileSync('test-report.html', html);
    
    // Send notifications
    if (results.failed > 0) {
      sendSlackNotification({
        message: `❌ ${results.failed} tests failed`,
        details: results.failures
      });
    }
  }
}
```

### Regression Tracking

Track regressions over time:

```javascript
// regression-tracker.js
class RegressionTracker {
  constructor() {
    this.history = this.loadHistory();
  }
  
  async track(testResults) {
    const current = {
      timestamp: new Date(),
      results: testResults,
      metrics: {
        avgDuration: calculateAvg(testResults, 'duration'),
        avgTokens: calculateAvg(testResults, 'tokens'),
        passRate: testResults.filter(r => r.passed).length / testResults.length
      }
    };
    
    this.history.push(current);
    this.saveHistory();
    
    // Detect regressions
    const previous = this.history[this.history.length - 2];
    if (previous) {
      const regressions = this.detectRegressions(previous, current);
      if (regressions.length > 0) {
        await this.alertRegressions(regressions);
      }
    }
  }
  
  detectRegressions(previous, current) {
    const regressions = [];
    
    // Pass rate regression
    if (current.metrics.passRate < previous.metrics.passRate - 0.05) {
      regressions.push({
        type: 'pass_rate',
        previous: previous.metrics.passRate,
        current: current.metrics.passRate
      });
    }
    
    // Performance regression
    if (current.metrics.avgDuration > previous.metrics.avgDuration * 1.5) {
      regressions.push({
        type: 'performance',
        previous: previous.metrics.avgDuration,
        current: current.metrics.avgDuration
      });
    }
    
    return regressions;
  }
}
```

---

## Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/proxy/package.json packages/proxy/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY tsconfig.json ./

# Build
RUN pnpm build

# Expose ports
EXPOSE 8787

# Start proxy
CMD ["node", "packages/proxy/dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  traceforge-proxy:
    build: .
    ports:
      - "8787:8787"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./data:/app/.ai-tests
    restart: unless-stopped
    
  traceforge-web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
    ports:
      - "3001:3001"
      - "5173:5173"
    depends_on:
      - traceforge-proxy
    volumes:
      - ./data:/app/.ai-tests
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traceforge-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: traceforge-proxy
  template:
    metadata:
      labels:
        app: traceforge-proxy
    spec:
      containers:
      - name: proxy
        image: traceforge/proxy:latest
        ports:
        - containerPort: 8787
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-api-keys
              key: openai
        volumeMounts:
        - name: traces
          mountPath: /app/.ai-tests
      volumes:
      - name: traces
        persistentVolumeClaim:
          claimName: traceforge-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: traceforge-proxy
spec:
  selector:
    app: traceforge-proxy
  ports:
  - port: 8787
    targetPort: 8787
  type: LoadBalancer
```

### High Availability Setup

```javascript
// ha-proxy.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Master process starting ${numCPUs} workers...`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // Replace dead workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died, starting new worker...`);
    cluster.fork();
  });
  
} else {
  // Worker process - start proxy
  require('./packages/proxy/dist/index.js');
  console.log(`Worker ${process.pid} started`);
}
```

---

## Custom Integrations

### Webhook Integration

Send traces to external systems:

```javascript
// webhook-handler.js
class WebhookHandler {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }
  
  async onTraceCaptured(trace) {
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'trace_captured',
        trace: {
          id: trace.id,
          model: trace.model,
          provider: trace.provider,
          tokens: trace.tokens,
          duration: trace.duration
        },
        timestamp: new Date()
      })
    });
  }
  
  async onTestFailed(test, result) {
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'test_failed',
        test: test.name,
        failures: result.failures,
        timestamp: new Date()
      })
    });
  }
}
```

### Slack Integration

```javascript
// slack-notifier.js
const { WebClient } = require('@slack/web-api');

class SlackNotifier {
  constructor(token) {
    this.client = new WebClient(token);
  }
  
  async notifyTestResults(results) {
    const message = {
      channel: '#ai-tests',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 AI Test Results'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Passed:* ${results.passed}`
            },
            {
              type: 'mrkdwn',
              text: `*Failed:* ${results.failed}`
            },
            {
              type: 'mrkdwn',
              text: `*Duration:* ${results.duration}ms`
            },
            {
              type: 'mrkdwn',
              text: `*Pass Rate:* ${(results.passRate * 100).toFixed(1)}%`
            }
          ]
        }
      ]
    };
    
    if (results.failed > 0) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Failed Tests:*\n' + results.failures.map(f =>
            `• ${f.name}: ${f.reason}`
          ).join('\n')
        }
      });
    }
    
    await this.client.chat.postMessage(message);
  }
}
```

---

## Cost Optimization

### Token Usage Tracking

```javascript
// cost-tracker.js
const PRICING = {
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },  // per 1K tokens
  'gpt-4': { input: 0.03, output: 0.06 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'gemini-pro': { input: 0.00125, output: 0.00375 }
};

class CostTracker {
  calculateCost(trace) {
    const pricing = PRICING[trace.model];
    if (!pricing) return 0;
    
    const inputCost = (trace.tokens.prompt / 1000) * pricing.input;
    const outputCost = (trace.tokens.completion / 1000) * pricing.output;
    
    return inputCost + outputCost;
  }
  
  async generateReport(startDate, endDate) {
    const traces = await loadTracesInRange(startDate, endDate);
    
    const report = {
      total: 0,
      byModel: {},
      byProvider: {},
      daily: {}
    };
    
    for (const trace of traces) {
      const cost = this.calculateCost(trace);
      report.total += cost;
      
      report.byModel[trace.model] = (report.byModel[trace.model] || 0) + cost;
      report.byProvider[trace.provider] = (report.byProvider[trace.provider] || 0) + cost;
      
      const date = trace.timestamp.split('T')[0];
      report.daily[date] = (report.daily[date] || 0) + cost;
    }
    
    return report;
  }
}
```

### Cost-Effective Model Selection

```javascript
// smart-router.js
class SmartRouter {
  selectModel(prompt, requirements) {
    const promptComplexity = this.analyzeComplexity(prompt);
    
    // Simple prompts → cheap models
    if (promptComplexity < 0.3) {
      return 'gpt-3.5-turbo';
    }
    
    // Medium complexity → mid-tier
    if (promptComplexity < 0.7) {
      return requirements.needsReasoning
        ? 'gpt-4'
        : 'claude-3-sonnet';
    }
    
    // Complex prompts → premium models
    return requirements.bestQuality
      ? 'gpt-4'
      : 'claude-3-opus';
  }
  
  analyzeComplexity(prompt) {
    const factors = {
      length: Math.min(prompt.length / 1000, 1),
      questions: (prompt.match(/\?/g) || []).length / 10,
      context: prompt.includes('context') || prompt.includes('given') ? 0.3 : 0
    };
    
    return (factors.length + factors.questions + factors.context) / 3;
  }
}
```

---

## Security Best Practices

### API Key Management

```javascript
// secure-config.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class SecureConfig {
  async getApiKey(provider) {
    // Use secret manager instead of env vars
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/my-project/secrets/${provider}-api-key/versions/latest`
    });
    
    return version.payload.data.toString();
  }
}
```

### Request Sanitization

```javascript
// sanitizer.js
function sanitizeRequest(request) {
  // Remove PII from prompts before logging
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
    /\b[\w.-]+@[\w.-]+\.\w+\b/g,  // Email
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g  // Credit card
  ];
  
  let sanitized = JSON.stringify(request);
  
  for (const pattern of piiPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  return JSON.parse(sanitized);
}
```

### Audit Logging

```javascript
// audit-logger.js
class AuditLogger {
  async log(event) {
    await db.insert('audit_log', {
      timestamp: new Date(),
      event_type: event.type,
      user: event.user,
      action: event.action,
      resource: event.resource,
      result: event.result,
      ip_address: event.ip,
      user_agent: event.userAgent
    });
  }
}
```

---

## Next Steps

- [API Reference](API-REFERENCE.md) - Complete API documentation
- [Contributing](CONTRIBUTING.md) - Extend TraceForge
- [Troubleshooting](TROUBLESHOOTING.md) - Solve issues
- [Tutorials](TUTORIALS.md) - Practical examples
