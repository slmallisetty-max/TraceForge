# 🚀 **V1 — MVP (Minimum Viable Product)**

**Goal:** Capture LLM traffic → View traces → Create tests → Replay tests
Keep it local. Keep it simple. Ship value immediately.

---

# **V1 Core Components**

## **1. Local LLM Proxy (Foundational)**

Fastify server (port 8787) with OpenAI-compatible endpoints:

* `/v1/chat/completions`
* `/v1/completions`
* `/v1/embeddings`

### Must Do

* Receive requests
* Forward to real provider (OpenAI)
* Capture:

  * request
  * response
  * latency
  * token usage
  * errors
* Save trace JSON inside `./ai-tests/traces/`

### No streaming output?

Streaming can be added later. Start simple.

---

## **2. Trace Storage System**

Local folder structure:

```
.ai-tests/
  traces/          # JSON trace files
  tests/           # YAML test files
  config.yaml      # Configuration
```

### MVP functionality

* Write new trace files (JSON with sorted keys)
* Read traces via Fastify API server
* Config fields:
  * upstream_url
  * api_key_env_var
  * save_traces: true/false
  * proxy_port: 8787

No retention rules yet.

---

## **3. Web UI (React + Fastify)**

Focus on **only two screens** accessible via browser.

### Screen A — **Trace Timeline** (http://localhost:3001)

* List of traces
* Search by model or endpoint
* Basic filtering
* Clicking a trace opens detail view
* Fetched from Fastify API server

### Screen B — **Trace Detail**

* Show request & response
* Show metadata (tokens, duration, status)
* Button: **"Save as Test"**

No editing. No fancy diff.

### Fastify API Server (port 3001)

* `GET /api/traces` - List all traces
* `GET /api/traces/:id` - Get single trace details
* `POST /api/tests` - Create test from trace

Serves React frontend (static files via `@fastify/static`) and provides API.

---

## **4. Test Creation (YAML)**

When user clicks **Save as Test**:

* Generate YAML file in `tests/` folder:

Example:

```yaml
id: test-123
request:
  endpoint: /v1/chat/completions
  model: gpt-4
  messages:
    - role: user
      content: "Hello"
assertions:
  contains: "Hello"
```

Minimal structure.

---

## **5. CLI Test Runner**

Command:

```
ai-debug test run
```

### Features

* Load all YAML tests
* Replay them via proxy or direct upstream
* Compare output with assertions
* Print PASS/FAIL
* Exit with proper code

**Assertions supported in MVP:**

* exact match
* contains text
* not contains

No diffs yet.

---

## **6. Packaging**

* CLI shipped as global Node package
* Web UI runs on localhost:3001
* Proxy runs on localhost:8787
* Both accessed via browser

---

# 🧪 **MVP Acceptance Criteria**

* Can capture traces via proxy
* Can view traces in browser (localhost:3001)
* Can view traces in CLI
* Can save test from web UI
* Can replay test via CLI
* Can detect failures
* All runs 100% locally (no internet required except for LLM calls)
* Zero cloud storage
* Developer can use it daily
* Works in any browser

**MVP should feel like:
"Finally, I can see what my LLM app is doing - right in my browser."**

---

# 🚀 **V2 — After MVP (Power Features)**

**Goal:** Improve debugging experience, add reliability, improve UI/UX.
This turns the product from “cool” → “useful every day”.

---

# **V2 Core Additions**

## **1. Streaming Support**

Support for SSE/chunked responses:

* Capture partial output
* Display partial tokens in UI
* Save traced streaming responses

Important for real-world usage.

---

## **2. Trace Diff View**

Side-by-side diff:

* Compare two traces
* Compare trace vs test output

Highlight:

* changed tokens
* different metadata
* timing differences

---

## **3. Advanced Test Assertions**

Add:

* regex match
* JSON-path based assertions
* fuzzy match thresholds
* partial match rules

---

## **4. Project Dashboard Page**

A new web page at `/dashboard`:

* Total traces captured
* Number of tests created
* Test failure rate
* Recently used models
* Warnings for model drift
* Trace volume over time (charts)

This makes debugging a continuous workflow.

---

## **5. Config Editor Page**

Web UI page at `/config` to edit `.ai-tests/config.yaml`:

* Change upstream provider
* Toggle trace collection
* Configure redaction rules
* Set proxy port
* Live validation

---

## **6. Test Runner Improvements**

* Parallel execution
* JUnit export for CI
* Pretty diffs in terminal

---

## **7. VS Code Extension — Basic**

* View tests in sidebar
* Run tests inline with CodeLens
* Syntax highlighting for YAML
* Click trace ID to open in browser: `http://localhost:3001/trace/<id>`
* WebView panel to embed traces

Not full UX yet — just enabling ecosystem usage.

---

## **8. Multi-Provider Adapters**

Support:

* OpenAI
* Anthropic
* Local LLMs (Ollama)

Still through the same proxy.

---

# 🚀 **V3 — Advanced Platform Version**

**Goal:** Become the default AI debugging tool for enterprises & dev teams.
This is where the project becomes a full product ecosystem.

---

# **V3 Core Enhancements**

## **1. Semantic Diff & Semantic Assertions**

Use an LLM locally to check:

* meaning similarity
* semantic correctness
* hallucination detection

Assertions like:

```
semantic_equal: true
similarity_score: > 0.9
```

Game changer for AI testing.

---

## **2. Timeline Replay Mode**

Recreate context step-by-step:

* Feed trace 1 → get output
* Feed trace 2 → get output
* Simulate conversation history

Useful for debugging long workflows.

---

## **3. Test Flows (Multi-step Tests)**

Support sequences:

```
step1:
  request: ...
  assert: ...

step2:
  request: ...
  assert: ...
```

For chain-of-thought workflows & agents.

---

## **4. Plugin Architecture**

Allow third-party plugins to add:

* custom assertions
* new model providers
* integrations
* dashboards

This makes the tool an ecosystem, not just an app.

---

## **5. Enterprise Features**

* Encrypted trace storage
* Role-based access
* Centralized on-prem deployment
* Audit logs
* Configurable redaction engine
* Air-gapped enterprise installer

---

## **6. Full VS Code Integration**

* Run tests from gutter icons
* Inline diff view for test results
* Attach debugger to proxy server
* Auto-complete for test YAML schema
* Embedded WebView for trace inspection
* Real-time trace notifications

Make this tool feel like part of the IDE.

---

## **7. AI Debugging Autopilot**

A future vision feature:

* The tool explains why output changed
* Detects root causes
* Suggests fixes (prompt changes, params, etc.)
* Automated test generation

This transforms debugging → intelligence.

---

# 🧠 **Recap (Very Simple)**

### **V1 (MVP)**

"Capture → View (Browser/CLI) → Test → Replay"
Make the basic workflow possible with localhost tools.

### **V2 (After MVP)**

"Power tools for debugging"
Dashboards, diffs, streaming, advanced assertions, VS Code basics.

### **V3 (Platform)**

"Full AI debugging ecosystem"
Semantic diff, enterprise features, plugins, AI-powered analysis.