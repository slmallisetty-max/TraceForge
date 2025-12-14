# TraceForge Tutorials

Step-by-step guides for common TraceForge workflows and use cases.

---

## Table of Contents

1. [Tutorial 1: Your First AI Test](#tutorial-1-your-first-ai-test)
2. [Tutorial 2: Multi-Provider Comparison](#tutorial-2-multi-provider-comparison)
3. [Tutorial 3: Testing Streaming Responses](#tutorial-3-testing-streaming-responses)
4. [Tutorial 4: Advanced Assertions](#tutorial-4-advanced-assertions)
5. [Tutorial 5: CI/CD Integration](#tutorial-5-cicd-integration)
6. [Tutorial 6: Regression Testing](#tutorial-6-regression-testing)
7. [Tutorial 7: Performance Testing](#tutorial-7-performance-testing)

---

## Tutorial 1: Your First AI Test

**Goal**: Capture an LLM interaction and create a reproducible test

**Time**: 10 minutes

### Step 1: Set Up TraceForge

```bash
# Start the proxy
cd packages/proxy
export OPENAI_API_KEY="sk-..."
pnpm start
```

### Step 2: Create a Simple App

```bash
mkdir my-first-test && cd my-first-test
npm init -y
npm install openai
```

Create `app.js`:

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:8787/v1'  // Point to TraceForge
});

async function askQuestion() {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful math tutor.' },
      { role: 'user', content: 'What is 15 + 27?' }
    ],
    temperature: 0  // Deterministic output
  });
  
  console.log('Answer:', response.choices[0].message.content);
  return response;
}

askQuestion();
```

### Step 3: Run and Capture

```bash
node app.js
```

**Output:**
```
Answer: 15 + 27 = 42
```

The trace is now saved in `.ai-tests/traces/`!

### Step 4: View the Trace

```bash
cd ../../packages/cli
node dist/index.js trace list
```

**Output:**
```
ID              Model            Status  Time      Tokens
trace_abc123    gpt-3.5-turbo   200     10:23:45  35
```

View details:

```bash
node dist/index.js trace view trace_abc123
```

### Step 5: Create a Test

```bash
node dist/index.js test create-from-trace trace_abc123 --name "math-addition"
```

This creates `.ai-tests/tests/math-addition.test.yaml`:

```yaml
name: math-addition
description: Test created from trace_abc123

request:
  model: gpt-3.5-turbo
  messages:
    - role: system
      content: You are a helpful math tutor.
    - role: user
      content: What is 15 + 27?
  temperature: 0

assertions:
  - type: equals
    path: choices[0].message.content
    expected: "15 + 27 = 42"
  
  - type: response_time
    max_ms: 3000
```

### Step 6: Run the Test

```bash
node dist/index.js test run
```

**Output:**
```
Running tests...

✓ math-addition (1.2s)
  ✓ equals assertion passed
  ✓ response_time assertion passed

Tests: 1 passed, 1 total
Time: 1.234s
```

**✅ Success!** You've created your first AI test!

### Step 7: Make It Fail (to see what happens)

Edit `.ai-tests/tests/math-addition.test.yaml` and change the expected value:

```yaml
assertions:
  - type: equals
    path: choices[0].message.content
    expected: "15 + 27 = 43"  # Wrong answer!
```

Run again:

```bash
node dist/index.js test run
```

**Output:**
```
Running tests...

✗ math-addition (1.2s)
  ✗ equals assertion failed
    Expected: "15 + 27 = 43"
    Actual:   "15 + 27 = 42"

Tests: 0 passed, 1 failed, 1 total
Time: 1.234s
```

Now you understand how assertions work!

---

## Tutorial 2: Multi-Provider Comparison

**Goal**: Compare responses from OpenAI, Claude, and Gemini

**Time**: 15 minutes

### Step 1: Set Up Multiple Providers

```bash
# Set up API keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="AIza..."
```

### Step 2: Configure Providers

Edit `.ai-tests/config.yaml`:

```yaml
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
    enabled: true
```

### Step 3: Create Comparison Script

Create `compare.js`:

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:8787/v1'
});

const prompt = "Explain quantum computing in simple terms (2-3 sentences).";

async function compareModels() {
  const models = [
    'gpt-3.5-turbo',
    'gpt-4',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'gemini-pro'
  ];
  
  console.log('Comparing models...\n');
  
  for (const model of models) {
    console.log(`Testing ${model}...`);
    
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    const duration = Date.now() - start;
    
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Tokens: ${response.usage.total_tokens}`);
    console.log(`  Response: ${response.choices[0].message.content.slice(0, 100)}...`);
    console.log();
  }
}

compareModels();
```

### Step 4: Run Comparison

```bash
node compare.js
```

**Output:**
```
Comparing models...

Testing gpt-3.5-turbo...
  Duration: 1234ms
  Tokens: 95
  Response: Quantum computing uses quantum mechanics principles...

Testing gpt-4...
  Duration: 2341ms
  Tokens: 112
  Response: Quantum computers leverage quantum phenomena...

Testing claude-3-opus-20240229...
  Duration: 1876ms
  Tokens: 103
  Response: Quantum computing harnesses quantum mechanical properties...

...
```

### Step 5: View in Web UI

1. Start the web UI:
   ```bash
   cd packages/web
   pnpm dev
   ```

2. Open http://localhost:5173/

3. You'll see 5 traces, one for each model

4. Click on any two traces

5. Click **"Compare"** button

6. See side-by-side diff:
   - Response differences highlighted
   - Token usage comparison
   - Duration comparison

### Step 6: Create Comparative Tests

Create `.ai-tests/tests/quantum-comparison.test.yaml`:

```yaml
name: quantum-comparison
description: Compare quantum computing explanations across providers

tests:
  - name: GPT-3.5 explanation
    request:
      model: gpt-3.5-turbo
      messages:
        - role: user
          content: Explain quantum computing in simple terms (2-3 sentences).
      temperature: 0.7
    assertions:
      - type: content_contains
        value: quantum
      - type: token_range
        min: 50
        max: 150
      - type: response_time
        max_ms: 3000

  - name: Claude explanation
    request:
      model: claude-3-opus-20240229
      messages:
        - role: user
          content: Explain quantum computing in simple terms (2-3 sentences).
      temperature: 0.7
    assertions:
      - type: content_contains
        value: quantum
      - type: response_time
        max_ms: 5000

  - name: Gemini explanation
    request:
      model: gemini-pro
      messages:
        - role: user
          content: Explain quantum computing in simple terms (2-3 sentences).
      temperature: 0.7
    assertions:
      - type: content_contains
        value: quantum
```

### Step 7: Run Comparison Tests

```bash
cd packages/cli
node dist/index.js test run --filter quantum
```

**Analysis**: You can now see which providers:
- Respond fastest
- Use fewest tokens (cost)
- Give highest quality answers
- Are most consistent

---

## Tutorial 3: Testing Streaming Responses

**Goal**: Capture and test streaming LLM responses

**Time**: 10 minutes

### Step 1: Create Streaming App

Create `streaming.js`:

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:8787/v1'
});

async function streamResponse() {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Count from 1 to 10, one number per line.' }
    ],
    stream: true
  });
  
  console.log('Streaming response:');
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(content);
  }
  
  console.log('\n\nStreaming complete!');
}

streamResponse();
```

### Step 2: Run and Capture

```bash
node streaming.js
```

**Output:**
```
Streaming response:
1
2
3
4
5
6
7
8
9
10

Streaming complete!
```

### Step 3: View Streaming Trace

```bash
cd packages/cli
node dist/index.js trace list
```

Find the streaming trace (it will have a ⚡ indicator)

```bash
node dist/index.js trace view trace_streaming_abc123
```

**Output shows:**
```
Streaming: Yes
Total Chunks: 15
First Chunk Latency: 234ms
Stream Duration: 3456ms

Chunks:
  Chunk 1 (0ms):    "1"
  Chunk 2 (+150ms): "\n"
  Chunk 3 (+120ms): "2"
  ...
```

### Step 4: View in Web UI

1. Open http://localhost:5173/
2. Click the streaming trace
3. See chunk-by-chunk replay with timing
4. Use playback controls to step through chunks

### Step 5: Create Streaming Test

Create `.ai-tests/tests/streaming-count.test.yaml`:

```yaml
name: streaming-count
description: Test streaming response counting

request:
  model: gpt-4
  messages:
    - role: user
      content: Count from 1 to 10, one number per line.
  stream: true

assertions:
  # Check full content
  - type: content_contains
    value: "1"
  
  - type: content_contains
    value: "10"
  
  # Check performance
  - type: response_time
    max_ms: 5000
    field: first_chunk_latency
  
  # Check chunk count is reasonable
  - type: json_path
    path: "$.total_chunks"
    min: 10
    max: 50
```

### Step 6: Test Streaming Performance

Create `.ai-tests/tests/streaming-performance.test.yaml`:

```yaml
name: streaming-performance
description: Test streaming latency

request:
  model: gpt-4
  messages:
    - role: user
      content: Write a haiku about coding.
  stream: true

assertions:
  # First chunk should arrive quickly
  - type: response_time
    field: first_chunk_latency
    max_ms: 500
  
  # Average chunk time
  - type: json_path
    path: "$.avg_chunk_delay"
    max: 200  # ms
  
  # Total streaming time
  - type: response_time
    field: stream_duration
    max_ms: 3000
```

---

## Tutorial 4: Advanced Assertions

**Goal**: Use all assertion types effectively

**Time**: 15 minutes

### Assertion Type 1: Fuzzy Matching

**Use case**: Test AI responses that may vary slightly

```yaml
name: fuzzy-greeting
request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: Say hello

assertions:
  # Exact match would fail because AI varies
  # - type: equals
  #   expected: "Hello!"
  
  # Fuzzy match handles variations
  - type: fuzzy_match
    expected: "Hello there! How can I help you today?"
    threshold: 0.7  # 70% similarity required
```

Test variations like:
- "Hello! How can I assist you today?"
- "Hi there! What can I do for you?"
- "Greetings! How may I help?"

All pass with fuzzy matching!

### Assertion Type 2: JSON Path Queries

**Use case**: Test specific parts of complex responses

```yaml
name: json-path-example
request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: Call the calculate function
  tools:
    - type: function
      function:
        name: calculate
        parameters:
          type: object
          properties:
            operation:
              type: string
            numbers:
              type: array

assertions:
  # Check tool call was made
  - type: json_path
    path: "$.choices[0].message.tool_calls[0].function.name"
    expected: "calculate"
  
  # Check operation parameter
  - type: json_path
    path: "$.choices[0].message.tool_calls[0].function.arguments.operation"
    expected: "add"
  
  # Check finish reason
  - type: json_path
    path: "$.choices[0].finish_reason"
    expected: "tool_calls"
```

### Assertion Type 3: Schema Validation

**Use case**: Validate response structure

```yaml
name: schema-validation-example
request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: Return JSON with name and age

assertions:
  # Validate response has correct structure
  - type: schema_validation
    schema:
      type: object
      required:
        - choices
      properties:
        choices:
          type: array
          minItems: 1
          items:
            type: object
            required:
              - message
            properties:
              message:
                type: object
                required:
                  - role
                  - content
                properties:
                  role:
                    type: string
                    enum: [assistant]
                  content:
                    type: string
                    minLength: 1
```

### Assertion Type 4: Regex Patterns

**Use case**: Match formats (dates, emails, etc.)

```yaml
name: regex-pattern-example
request:
  model: gpt-3.5-turbo
  messages:
    - role: user
      content: What's today's date? (Format: YYYY-MM-DD)

assertions:
  # Match date format
  - type: content_matches
    pattern: "\\d{4}-\\d{2}-\\d{2}"
  
  # Match specific year
  - type: content_matches
    pattern: "2024-\\d{2}-\\d{2}"
```

### Combining Multiple Assertions

```yaml
name: comprehensive-test
description: Test with all assertion types

request:
  model: gpt-4
  messages:
    - role: user
      content: Write a professional email signature

assertions:
  # Must contain name
  - type: content_contains
    value: "Best regards"
  
  # Must match email format
  - type: content_matches
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
  
  # Fuzzy match to expected format
  - type: fuzzy_match
    expected: |
      Best regards,
      John Doe
      Software Engineer
      john@example.com
    threshold: 0.6
  
  # Performance check
  - type: response_time
    max_ms: 3000
  
  # Token efficiency
  - type: token_range
    min: 20
    max: 100
  
  # Length check
  - type: content_length
    min: 50
    max: 500
  
  # Schema validation
  - type: schema_validation
    schema:
      type: object
      required: [choices, usage]
```

---

## Tutorial 5: CI/CD Integration

**Goal**: Add TraceForge to your CI/CD pipeline

**Time**: 20 minutes

### GitHub Actions

Create `.github/workflows/ai-tests.yml`:

```yaml
name: AI Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build packages
        run: pnpm build
      
      - name: Start TraceForge proxy
        run: |
          cd packages/proxy
          pnpm start &
          sleep 5  # Wait for proxy to start
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Run AI tests
        run: |
          cd packages/cli
          node dist/index.js test run --junit --bail
        env:
          OPENAI_BASE_URL: http://localhost:8787/v1
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: junit-results
          path: .ai-tests/junit.xml
      
      - name: Publish test results
        if: always()
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: .ai-tests/junit.xml
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

ai_tests:
  stage: test
  image: node:18
  
  before_script:
    - npm install -g pnpm
    - pnpm install
    - pnpm build
    - cd packages/proxy && pnpm start &
    - sleep 5
  
  script:
    - cd packages/cli
    - node dist/index.js test run --junit
  
  artifacts:
    when: always
    reports:
      junit: .ai-tests/junit.xml
    paths:
      - .ai-tests/
  
  variables:
    OPENAI_BASE_URL: http://localhost:8787/v1
```

### Docker Compose for CI

Create `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  traceforge-proxy:
    build:
      context: .
      dockerfile: packages/proxy/Dockerfile
    ports:
      - "8787:8787"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./ai-tests:/app/.ai-tests

  test-runner:
    build:
      context: .
      dockerfile: packages/cli/Dockerfile
    depends_on:
      - traceforge-proxy
    environment:
      - OPENAI_BASE_URL=http://traceforge-proxy:8787/v1
    command: test run --junit
    volumes:
      - ./ai-tests:/app/.ai-tests
```

Run in CI:

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running AI tests before commit..."

# Start proxy in background
cd packages/proxy
pnpm start > /dev/null 2>&1 &
PROXY_PID=$!
sleep 3

# Run tests
cd ../cli
node dist/index.js test run --bail

TEST_EXIT=$?

# Cleanup
kill $PROXY_PID

if [ $TEST_EXIT -ne 0 ]; then
  echo "❌ AI tests failed! Commit aborted."
  exit 1
fi

echo "✅ AI tests passed!"
exit 0
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

## Tutorial 6: Regression Testing

**Goal**: Detect when model updates break your app

**Time**: 15 minutes

### Step 1: Create Baseline Tests

```bash
# Capture current behavior
node your-app.js

# Create tests from traces
traceforge test create-from-trace trace_1 --name "feature-search"
traceforge test create-from-trace trace_2 --name "feature-summarize"
traceforge test create-from-trace trace_3 --name "feature-extract"
```

### Step 2: Tag as Regression Tests

Edit each test file:

```yaml
name: feature-search
description: Search functionality baseline
tags:
  - regression
  - critical
  - feature-search

request:
  # ... existing request

assertions:
  # ... existing assertions
```

### Step 3: Run Regression Suite

```bash
# Run only regression tests
traceforge test run --tag regression

# Or use a dedicated script
./scripts/run-regression-tests.sh
```

### Step 4: Monitor for Changes

Create `scripts/regression-check.sh`:

```bash
#!/bin/bash

echo "Running regression tests..."

# Run tests
traceforge test run --tag regression --junit

# Check results
if [ $? -ne 0 ]; then
  echo "⚠️ REGRESSION DETECTED!"
  echo "Model behavior has changed from baseline."
  echo ""
  echo "Actions:"
  echo "1. Review failed tests in .ai-tests/junit.xml"
  echo "2. Check traces to see exact changes"
  echo "3. Update tests if new behavior is correct"
  echo "4. Or revert to previous model version"
  exit 1
fi

echo "✅ No regressions detected"
```

### Step 5: Compare Before/After

```javascript
// regression-compare.js
const fs = require('fs');

async function compareVersions() {
  console.log('Running tests with current model...');
  
  // Run with current model
  await runTests('gpt-3.5-turbo');
  const currentTraces = loadTraces();
  
  // Run with previous model (if available)
  console.log('Running tests with previous model...');
  await runTests('gpt-3.5-turbo-0613');  // Specific version
  const previousTraces = loadTraces();
  
  // Compare
  for (let i = 0; i < currentTraces.length; i++) {
    const current = currentTraces[i];
    const previous = previousTraces[i];
    
    console.log(`\nTest: ${current.name}`);
    console.log(`Current tokens:  ${current.tokens.total}`);
    console.log(`Previous tokens: ${previous.tokens.total}`);
    console.log(`Difference:      ${current.tokens.total - previous.tokens.total}`);
    
    // Show content diff
    if (current.response !== previous.response) {
      console.log('⚠️ Response changed!');
      console.log(diff(previous.response, current.response));
    }
  }
}

compareVersions();
```

---

## Tutorial 7: Performance Testing

**Goal**: Test LLM response times and token usage

**Time**: 10 minutes

### Step 1: Create Performance Tests

Create `.ai-tests/tests/performance-suite.test.yaml`:

```yaml
name: performance-suite
description: Performance benchmarks for all features

tests:
  - name: fast-response-check
    request:
      model: gpt-3.5-turbo
      messages:
        - role: user
          content: Say hi
      temperature: 0
    assertions:
      - type: response_time
        max_ms: 1000  # Must respond in < 1 second
      - type: token_range
        max: 50  # Efficient token usage

  - name: complex-query-performance
    request:
      model: gpt-4
      messages:
        - role: user
          content: Explain the theory of relativity
      max_tokens: 500
    assertions:
      - type: response_time
        max_ms: 10000  # 10 seconds for complex query
      - type: token_range
        min: 200
        max: 550

  - name: streaming-latency
    request:
      model: gpt-4
      messages:
        - role: user
          content: Count to 100
      stream: true
    assertions:
      - type: response_time
        field: first_chunk_latency
        max_ms: 500  # First chunk within 500ms
      - type: response_time
        field: avg_chunk_delay
        max_ms: 100  # Average chunk delay < 100ms
```

### Step 2: Run Performance Suite

```bash
traceforge test run --filter performance --parallel
```

### Step 3: Analyze Results

```bash
# View slowest tests
traceforge test run | grep -A 2 "✗.*response_time"

# Export to CSV for analysis
traceforge trace list --format csv > performance-data.csv
```

### Step 4: Create Performance Dashboard

Create `scripts/performance-report.js`:

```javascript
const traces = require('../.ai-tests/traces/*.json');

function generateReport() {
  const stats = {
    total: traces.length,
    avgDuration: 0,
    avgTokens: 0,
    slowest: null,
    fastest: null
  };
  
  let totalDuration = 0;
  let totalTokens = 0;
  
  traces.forEach(trace => {
    totalDuration += trace.duration;
    totalTokens += trace.tokens.total;
    
    if (!stats.slowest || trace.duration > stats.slowest.duration) {
      stats.slowest = trace;
    }
    
    if (!stats.fastest || trace.duration < stats.fastest.duration) {
      stats.fastest = trace;
    }
  });
  
  stats.avgDuration = Math.round(totalDuration / traces.length);
  stats.avgTokens = Math.round(totalTokens / traces.length);
  
  console.log('Performance Report');
  console.log('==================');
  console.log(`Total Traces: ${stats.total}`);
  console.log(`Avg Duration: ${stats.avgDuration}ms`);
  console.log(`Avg Tokens:   ${stats.avgTokens}`);
  console.log(`Fastest:      ${stats.fastest.duration}ms (${stats.fastest.model})`);
  console.log(`Slowest:      ${stats.slowest.duration}ms (${stats.slowest.model})`);
}

generateReport();
```

---

## Next Steps

**You've completed all tutorials!** 🎉

### Continue Learning:
- [API Reference](API-REFERENCE.md) - Master all commands
- [Architecture Guide](ARCHITECTURE.md) - Understand internals
- [Advanced Topics](ADVANCED.md) - Expert techniques
- [Contributing](CONTRIBUTING.md) - Build new features

### Real-World Applications:
1. **Add to your production app** - Start capturing real traffic
2. **Build a test suite** - Cover all your AI features
3. **Set up CI/CD** - Automate testing
4. **Monitor regressions** - Track model changes
5. **Optimize costs** - Compare providers

### Get Help:
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [GitHub Issues](https://github.com/your-org/traceforge/issues) - Report bugs
- [Discussions](https://github.com/your-org/traceforge/discussions) - Ask questions
