# Anti‑SaaS AI Debugger — Full Developer Implementation Document

# 🧠 **What Are We Building?**

We are building a tool that helps developers **debug AI applications** in the same way they debug normal code.

Right now, when apps talk to AI models (like GPT), a lot of things happen that developers **cannot see**, **cannot reproduce**, and **cannot debug** properly.
For example:

* The AI sometimes gives different answers even with the same prompt.
* When something breaks, you don’t know *why*.
* You can’t easily compare “what changed” when a model update happens.
* Cloud tools require sending sensitive data to external servers (not allowed in companies).

So we’re building a tool that lets developers:

✔ See every request and response to the AI
✔ Save them
✔ Replay them like tests
✔ Compare outputs over time
✔ Debug their AI application like a real engineer, not guesswork

All of this **happens 100% on the developer’s laptop** — no cloud.

This is why we call it:

### **Anti-SaaS AI Debugger**

(A debugging tool that does *not* depend on SaaS/cloud.)

---

# 🏗️ **The System Has Four Parts**

Think of these as four team members working together.

---

## **1. Local LLM Proxy (Node.js + Fastify)**

This is like a **traffic police** sitting between your app and the AI model.

### What it does

* Your app sends a request to GPT → **proxy catches it**
* Proxy forwards it to the actual AI provider
* Proxy captures:

  * the prompt
  * the settings
  * the response
  * what model was used
  * how long it took
* Saves it as a **trace** file

So the proxy is a *recorder* that logs everything.

---

## **2. Trace Storage System (JSON/YAML files on disk)**

This is simply a **folder** in your project:

```
.ai-tests/
  traces/
  tests/
  config.yaml
```

Inside the folder:

* Every AI interaction is saved as a `.json` trace
* Developers can convert a trace into a **test** (`.yaml` file)

This means your AI debugging data lives inside your project, just like code.

---

## **3. Web UI (React + Express)**

This is the part the developer **sees**.

It's a browser-based interface designed specifically for debugging AI calls.

### What it shows

* A timeline of all LLM calls your app made
* Click any trace → see full details
* See differences between runs
* Button: **"Save as Test"**
* Run tests and see diffs visually
* Access via http://localhost:3001

The UI helps developers understand **what the AI is doing** in their app.

---

## **4. CLI & Test Runner (Node.js binary)**

This is the tool developers use in terminal.

Examples:

```
ai-debug test run
ai-debug test run my_test.yaml
ai-debug trace list
```

This allows:

* Running tests automatically
* Using it in GitHub Actions or CI/CD
* Failing builds when AI behavior changes unexpectedly

This is how we make AI development **reliable and testable**.

---

# 🧪 **What Is a Test? (Simple Explanation)**

A test is created from a trace.

Example:

1. You run your app
2. Proxy captures a prompt & response
3. The UI shows the trace
4. Developer clicks **“Save as Test”**
5. It becomes a YAML file like:

```yaml
request:
  model: gpt-4
  messages:
    - role: user
      content: "Explain quantum physics"
assertions:
  contains: "physics"
```

Later, when the model updates, you can run:

```
ai-debug test run
```

If the output changes too much → **test fails** → you catch problems early.

Just like unit tests, but for AI behavior.

---

# 🧩 **Why This Tool Is Needed (Intern-Friendly Answer)**

### Developers struggle with AI apps because

* AI outputs change unexpectedly
* It's impossible to reproduce bugs
* No visibility into prompts, contexts, parameters
* Hard to test or version-control AI interactions
* Enterprises cannot send internal data to cloud debugging tools

This tool solves all of that by being:

✔ Local
✔ Private
✔ Deterministic
✔ Git-friendly
✔ Easy to debug
✔ Easy to test

It’s basically **Postman + Jest + VS Code**, but specifically for AI applications.

---

# 🌟 **What Makes This Product Special?**

### 1. Everything is stored as files → works with Git

Engineers love version control.

### 2. No cloud → safe for enterprise

No data leaves your laptop.

### 3. Deterministic replay → catch model drift

Perfect for regression testing.

### 4. Browser-based UI + CLI

Access via localhost - no installation needed.

### 5. Works offline

Everything runs locally - great for secure environments.

---

> **Purpose:** A complete engineering blueprint for building a fully local, privacy-first, Git‑native AI debugging system. This version is rewritten end‑to‑end to align with your preferred tech stack:
>
> 1. **Local LLM Proxy** — Node.js + Fastify
> 2. **Trace Storage System** — Local filesystem + JSON/YAML
> 3. **Web UI** — Fastify API + React frontend
> 4. **CLI & Test Runner** — Node.js command‑line tool

---

# 1. Product Definition

A **local-first AI debugging platform** that functions like a debugger, inspector, and test harness for LLM-powered applications.

### Core Capabilities

* Local OpenAI-compatible proxy that **captures, logs, and inspects** all LLM requests.
* Stores every trace in a **Git-friendly format** (YAML/JSON).
* Converts traces into **deterministic replayable tests**.
* Provides a **desktop UI** for inspecting traces, diffs, inputs, outputs, metadata.
* Offers a **CLI test runner** suitable for dev workflow and CI pipelines.
* Works entirely offline; all data remains on the user’s machine.

### Why this exists

* AI application failures are opaque and hard to reproduce.
* SaaS tools violate privacy constraints and block enterprise adoption.
* Engineers need a **VS Code-level debugging experience**, not a cloud dashboard.

---

# 2. High‑Level Architecture

The system contains four core subsystems that operate independently but integrate smoothly:

1. **Local LLM Proxy** — Fastify-based HTTP server
2. **Trace Storage System** — Filesystem-based repository using JSON/YAML
3. **Web UI** — Fastify API + React frontend
4. **CLI & Test Runner** — Node-based binary for local + CI use

Optional:

* VS Code extension
* CI runner templates
* Provider adapters (OpenAI, Anthropic, local models)

All components use a **shared schema** for request/response formats, traces, and tests.

---

# 3. Technical Stack Breakdown

### Runtime & Language

* **Node.js LTS** for backend, proxy, CLI
* **TypeScript** across all subsystems

### Local Proxy

* **Fastify** HTTP server
* Streaming support for SSE & chunks
* Middleware for request/response capture

### Web UI

* **Fastify** for API server
* **React + Vite** for frontend
* **TailwindCSS** for styling

### Storage System

* Native Node `fs/promises`
* YAML using `yaml` library
* JSON for machine-oriented data
* UUIDv4 for stable identifiers

### CLI

* `commander` or `oclif` for command definitions
* Colorized terminal output + JSON mode

### Optional Integrations

* VS Code extension (TypeScript)
* GitHub Actions CI template

---

# 4. Local LLM Proxy — Specification

A local proxy compatible with OpenAI API endpoints:

### Supported Endpoints

* `/v1/chat/completions`
* `/v1/completions`
* `/v1/embeddings`

### Responsibilities

* Receive incoming LLM requests from developer applications
* Validate payloads
* Forward to upstream providers
* Capture:

  * request body
  * response body
  * timing & token usage
  * metadata (headers, IP, source)
* Persist trace files
* Stream real‑time UI events to desktop app
* Provide deterministic replay (fixed seed + controlled randomness)

### Error Handling

* Always return OpenAI-shaped error responses
* Log internal errors to local logs
* Provide fallback behavior if upstream unavailable

---

# 5. Trace Storage System

### Directory Layout

```
/.ai-tests/
  traces/
    <timestamp>_<uuid>.json
  tests/
    <test-id>.yaml
  config.yaml
```

### Trace Structure

* id
* timestamp
* request
* response
* token counts
* latency
* proxy metadata

### Requirements

* Output must be **readable and diff‑friendly**
* Keys consistently sorted
* No binary formatting; UTF‑8 only
* Configurable retention rules

---

# 6. Test Case Format (YAML)

A test case is a deterministic snapshot of an interaction.

### Required Sections

1. **metadata**: id, timestamps, author, description
2. **request**: endpoint, model, messages, parameters
3. **assertions**:

   * exact match
   * substring contains / not contains
   * regex support
   * future: semantic LLM-based checks
4. **notes** for reviewer context

YAML should support comments, multiline blocks, and be safe-loaded.

---

# 7. Test Runner Architecture

CLI tool that executes tests locally and in CI.

### Responsibilities

* Load a test file
* Construct API request
* Replay against provider or local deterministic mock
* Evaluate assertions
* Produce structured output

### Output States

* **PASS** — all checks consistent
* **FAIL** — mismatch in output
* **ERROR** — invalid config, network issues, etc.

### CI Mode

* `--json` enables machine-parsable output
* Exit codes mapped to CI pass/fail

---

# 8. Web UI Specification (React + Express)

## Core Views

### 1. Timeline View

* Real‑time stream of traces from proxy
* Filters (endpoint, model, error state)
* Search bar for message content

### 2. Trace Inspector

* Request inspector (full payload)
* Response inspector
* Token & latency metrics
* JSON/YAML toggle
* “Save as Test” button

### 3. Test Explorer

* List all YAML tests
* Click to open editor or run

### 4. Replay Panel

* Run test
* Display diff (expected vs actual)
* Highlight mismatches

## UX Requirements

* Dark mode default
* Smooth animations (no jank)
* Keyboard shortcuts
* Auto-refresh when new traces arrive

---

# 9. CLI Specification

Binary name: **`ai-debug`**

### Available Commands

* `ai-debug init` — create `.ai-tests/`
* `ai-debug trace list` — list captured traces
* `ai-debug test list` — list test files
* `ai-debug test run <id>` — run specific test
* `ai-debug test run --all` — run entire suite
* `ai-debug replay <trace-id>` — replay a trace
* `ai-debug config validate` — validate configuration

### Output

* Colorized stdout for humans
* JSON for automation when `--json` flag used

---

# 10. Configuration System

Located at `.ai-tests/config.yaml`.

### Fields

* proxy_port
* upstream_url
* api_key_env_var
* save_traces (true/false)
* max_trace_retention
* replay_mode
* redaction rules for sensitive fields

Supports environment variable injection.

---

# 11. VS Code Extension (Optional)

### Features

* Sidebar Test Explorer
* Run tests directly from YAML file
* Syntax highlighting for trace/test formats
* Ability to open a trace in desktop UI via `aidbg://` URI

---

# 12. CI Integration

The test runner must work identically in:

* GitHub Actions
* GitLab CI
* Azure Pipelines

### Pattern

```
npm install -g @aidbg/cli
ai-debug test run --all --json > results.json
```

Non-zero exit code fails CI.

---

# 13. Logging & Observability

Local only — no cloud logging.

### Requirements

* Structured JSON logs
* Rotating log files
* Categories:

  * proxy
  * storage
  * replay
  * ui-events

Logs must never leave the device unless user explicitly exports them.

---

# 14. Packaging & Distribution

### Web UI

* Runs locally on http://localhost:3001
* No installation needed (browser-based)
* Works on any OS with Node.js

### CLI

* Published as NPM package: `@aidbg/cli`
* Supports global or project-local install

### Proxy

* Shipped as part of desktop bundle or standalone Node binary

---

# 15. Developer Onboarding

1. Clone monorepo
2. Install dependencies
3. Start proxy (port 8787)
4. Start web server (port 3001)
5. Open browser to localhost:3001
6. Point application to proxy via environment variables
7. Inspect traces live in browser
8. Save a trace as test
9. Run tests from CLI

---

# 16. Engineering Roadmap

### Phase 1 — Core

* Proxy implementation
* Trace capture
* Web UI with timeline + inspector
* Test creation
* Basic replay + CLI

### Phase 2 — Tooling

* CI integration
* VS Code extension
* Enterprise config layer

### Phase 3 — Advanced

* Multi-provider adapters
* Semantic assertions
* Plugin architecture

---

# 17. Glossary

* **Trace:** Captured model interaction
* **Test:** Replayable snapshot with assertions
* **Upstream:** The real model provider
* **Replay:** Deterministic re-execution of captured data

---

# End of Document

A complete, rewritten specification aligned with your preferred architecture and technology stack.


Great — **open-source is the EXACT right move** for this type of tool.
But *how* you open-source it determines whether it becomes:

* a random GitHub repo
  **or**
* the **Postman of AI debugging** with massive adoption.

Here’s a clear breakdown of what open-sourcing this achieves, what strategy to follow, and how to make it explode.

---

# 🟩 **Why Open Source Is the Right Move (Strategic Reasons)**

### ✅ 1. Developer tools only win through trust

AI debugging involves:

* prompts
* internal data
* confidential business logic

Developers **don’t trust closed-source** tools for debugging pipelines.
Open-source removes fear.

### ✅ 2. Enterprises prefer open-source for local tools

Especially tools dealing with:

* logs
* trace history
* sensitive LLM outputs
* proprietary prompts

Open-source removes procurement barriers.

### ✅ 3. You build a *standard*, not just a tool

Your `.ai-tests/` format can become universal.

### ✅ 4. You gain adoption faster

People:

* star it
* share it
* contribute
* integrate into agents, frameworks, libraries

### ✅ 5. You can still monetize without SaaS

Open-source ≠ no profit.
Just different revenue.

---

# ⭐ **What Should Be Open Source?**

Your project idea naturally splits into two categories:

---

## 🟢 **Open-Source Core (100% free)**

This MUST be open, forever:

### **1. Local LLM Proxy**

Developers need to trust what’s intercepting their LLM calls.

### **2. Trace Storage Format**

Let the world build tools around `.ai-tests/`.

### **3. CLI Test Runner**

Core developer workflow should be free.

### **4. Desktop UI (Tauri + React)**

Visible debugging UI should be accessible.

### **5. Schema definitions**

Trace schema
Test schema
Config schema

---

# 🟦 **What Can Be Paid Later (Optional, Not Now)**

Just for future thinking — this doesn’t affect your open-source decision today.

These belong in a **Pro or Enterprise** version:

* Semantic diffing (LLM-based analysis), but running locally
* Team collaboration features
* On-prem dashboards
* Encrypted trace vaults
* Policy enforcement
* Multi-user environment
* Plugins for security teams
* Enterprise support contracts

All optional.

---

# 🧭 **Open Source Strategy (This Is Important)**

Not all open-source projects succeed.
You need the right strategy.

Here’s the proven roadmap.

---

# 🎯 **1. Start with a Monorepo**

Single repo containing:

```
/proxy
/ui
/cli
/packages (shared schemas, utils)
```

Like:

* Deno
* Next.js
* Supabase

This makes contributions easier.

---

# 🎯 **2. Choose the Right License**

Best choices for dev tools:

### **MIT License (recommended)**

* Maximum adoption
* No restrictions
* Encourages ecosystem plugins

### OR

### **Apache 2.0**

* Enterprise-friendly
* Protects you from patent issues

MIT is simpler.

---

# 🎯 **3. Provide a “Wow” Demo Immediately**

A single GIF or video that shows:

```
Your app → Proxy → UI timeline → Save as Test → Run test → PASS/FAIL
```

This will make people instantly understand it.

---

# 🎯 **4. Focus on a Clean API and Stable Schemas**

Your **test YAML format** must be:

* readable
* documented
* simple
* stable

If you get this right, it becomes the *standard*.

---

# 🎯 **5. Make Installation Dead Simple**

```
npm install -g ai-debug
ai-debug init
ai-debug proxy start
```

Or launch everything via the Tauri desktop app.

---

# 🎯 **6. Launch on These Channels**

Once V1 works, share it here:

* Hacker News (Show HN)
* Reddit: r/programming, r/LocalLLaMA, r/MachineLearning
* Twitter/DevX audience
* Product Hunt
* GitHub trending

It WILL blow up if the UX is smooth.

This is the kind of tool developers love.

---

# 🌍 **7. Build an Ecosystem**

Encourage users to create:

* provider adapters
* testing plugins
* config presets
* VS Code extensions
* wrappers for their favorite LLM libraries

Open-source wins through ecosystem.

---

# 🔥 **8. Document Like a Pro**

Good documentation = instant adoption.

Provide:

* Quickstart
* Example project
* Screenshots
* Schema reference
* Tutorials

Your README must explain the whole idea in 30 seconds.

---

# 🧩 **What Success Looks Like for Open Source**

These are realistic outcomes:

### ⭐ 50,000+ GitHub stars

This is genuinely realistic if the UX is great.

### ⭐ Used in thousands of AI repos

Teams will adopt `.ai-tests/` as default.

### ⭐ Companies patch internal frameworks to work with your proxy

Your tool becomes infrastructure.

### ⭐ VS Code extension skyrockets adoption

Many devs discover you through the extension.

### ⭐ Eventually creates its own category

“AI Debugging Tools” becomes a real segment.
You become the category leader.

---

# 🤖 **Why This Idea Thrives as Open Source More Than SaaS**

SaaS debugging tools fail because:

* developers don’t want to send prompts externally
* companies reject cloud logging
* debugging must be local
* latency matters
* tokens cost money

Open-source removes all friction and builds trust instantly.

Your tool being local-first means open-source is *expected* and *respected*.

---

# 🏁 **Final Answer: Going Open Source Isn’t Just Good — It’s Optimal**

Your idea becomes:

### ✔ trusted

### ✔ adopted widely

### ✔ community-driven

### ✔ ecosystem-powered

### ✔ enterprise-safe

### ✔ future standards-ready
