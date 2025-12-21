# TraceForge.baseline — Product Knowledge Transfer (KT)

## 1. What this product is (in one paragraph)

TraceForge.baseline is a **local-first AI behavior tracing and regression testing tool**.

It captures **real LLM interactions** (prompts, responses, tool calls, streaming output), stores them as **trace artifacts**, and allows developers to convert approved behavior into **baselines** that can be enforced in **CI** to prevent silent AI regressions.

It is **not** an agent framework, **not** a SaaS observability platform, and **not** an evaluation benchmark.
It is **behavioral regression infrastructure** for AI systems (including AI agents).

---

## 2. Why this product exists (the core problem)

### The real problem

AI systems fail **silently**.

* Prompts change
* Models update
* Tools evolve
* Context shifts
* Agent logic drifts

The system still runs.
No exception.
No crash.
But behavior changes.

Traditional tools (logs, metrics, dashboards) answer:

> “What happened?”

They do **not** answer:

> “Did this change break something that used to work?”

TraceForge exists to answer **that exact question**.

---

## 3. What problems TraceForge explicitly solves

TraceForge solves these problems:

1. Developers cannot see **exactly what the LLM saw and returned**
2. AI behavior changes cannot be **tested like normal code**
3. AI regressions are discovered **after users complain**
4. Agent behavior is hard to **lock and review**
5. CI cannot block **unsafe or unintended AI changes**
6. Teams need a solution that works **locally and securely**

---

## 4. What TraceForge deliberately does NOT do

This is extremely important for scope control.

TraceForge does **NOT**:

* Build AI agents
* Execute agent planners
* Interpret chain-of-thought
* Replace LangChain / AutoGen / CrewAI
* Visualize agent reasoning trees
* Provide SaaS dashboards
* Decide whether an output is “correct” automatically

**Human approval defines correctness.**

---

## 5. High-level system architecture

### Core components

```
Application / Agent
        |
        |  (HTTP / SDK calls)
        v
TraceForge Proxy (localhost)
        |
        |  (forward unchanged)
        v
LLM Provider (OpenAI / Anthropic / Gemini / Ollama)
```

### Supporting components

* **Proxy** – captures requests and responses
* **Trace store** – writes structured trace files to disk
* **Redaction layer** – masks secrets & PII before storage
* **Retention service** – manages disk usage
* **Baseline engine** – converts traces into behavioral tests
* **VCR engine** – record/replay for deterministic CI testing
* **CLI** – developer & CI interface
* **Web UI** – trace inspection and diffing
* **VS Code extension** – developer convenience

---

## 6. Core design principles (non-negotiable)

Every design decision follows these rules:

1. **Local-first**
   No mandatory cloud. Data stays on the developer’s machine.

2. **Framework-agnostic**
   Intercept at the HTTP boundary. Do not depend on agent internals.

3. **Behavior over text**
   Test meaning, structure, and decisions — not exact strings.

4. **Human-approved correctness**
   The system never guesses what is “right”.

5. **Simple engineering**
   Avoid premature abstractions and “enterprise” patterns.

---

## 7. What is a “trace”?

A **trace** is a structured record of one or more LLM interactions.

A trace includes:

* Provider (OpenAI, Anthropic, etc.)
* Model
* Request messages
* Tool calls / function calls
* Responses (including streaming chunks)
* Timing & metadata
* Trace version (`TRACE_VERSION`)

Traces are:

* Files on disk
* Diffable
* Replayable
* Versioned

Traces are **artifacts**, not logs.

---

## 8. What is a “baseline”?

A **baseline** is an approved trace converted into a **behavioral contract**.

It answers:

> “This behavior is correct and must not change unintentionally.”

A baseline may assert:

* Required concepts must appear
* Output must match a schema
* Tools must (or must not) be called
* Order of actions must be preserved
* Unsafe content must not appear

Baselines are stored as **YAML** and committed to Git.

---

## 9. What is a “regression” in this system?

A regression occurs when:

* A new run
* Violates an existing baseline
* Even if the system still “works”

This includes:

* Missing concepts
* Changed tool usage
* Structural output changes
* Safety regressions
* Agent decision drift

**No crash is required for failure.**

---

## 10. Typical developer workflow

### Local development

1. Run the app/agent using TraceForge proxy
2. TraceForge captures behavior
3. Developer inspects trace in UI or CLI
4. Developer approves correct behavior
5. Baseline YAML is generated
6. Baseline is committed to Git

### CI workflow

1. Tests run using baselines
2. VCR mode replays responses (no live API calls)
3. If behavior changes → test fails
4. PR is blocked until behavior is reviewed

---

## 11. VCR mode (why it exists)

VCR mode exists to make CI:

* Deterministic
* Cheap
* Fast
* Contributor-friendly

Modes:

* `off` – normal live behavior
* `record` – record provider responses
* `replay` – replay from cassettes
* `auto` – record if missing, replay otherwise

Cassettes are JSON files stored in:

```
.ai-tests/cassettes/
```

---

## 12. Security model (important for trust)

### Redaction

Before traces are written to disk:

* API keys are masked
* Authorization headers are removed
* PII (emails, phones, SSNs, cards) is masked

### Retention

* Old traces are deleted by age
* Disk usage is capped by size
* Older traces are compressed
* Cleanup runs automatically

Security is **default-on**, not optional.

---

## 13. Repository structure (mental map)

```
packages/
  shared/     → schemas, types, constants
  proxy/      → HTTP interception & capture
  cli/        → command-line interface
  web/        → UI for trace inspection
  vscode/     → editor integration
docs/
  spec/       → trace & baseline formats
  qa/         → testing & VCR docs
  security/   → redaction & security policies
  ops/        → retention, CI, runbooks
examples/
  demo-app/   → first-win example
```

---

## 14. How to contribute safely

Contributors should:

* Start with docs or examples
* Add tests for any logic change
* Avoid architectural refactors
* Keep changes small and reviewable
* Respect local-first and simplicity constraints

Good contribution areas:

* New assertion types
* Better error messages
* Docs & examples
* Tests for edge cases

---

## 15. What “success” looks like for this product

Success is **not**:

* Number of features
* Fancy dashboards
* Hype

Success is:

* Teams trusting CI failures
* Developers afraid to remove it
* Silent regressions caught early
* The tool becoming “boring infrastructure”

---

## 16. Long-term intent (without commitment)

TraceForge is designed to remain:

* Small
* Dependable
* Foundational

Future growth should happen **around** the core, not **inside** it.

The core should always:

> Capture → baseline → detect regressions

---

## 17. One sentence to remember

> **TraceForge.baseline makes AI behavior explicit, testable, and safe to change — without trying to understand or control the AI itself.**