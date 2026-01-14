# TraceForge.baseline — VCR Mode Design & Implementation

## 1. What problem VCR mode solves (context)

TraceForge.baseline needs **deterministic, offline, cost-free testing**.

Without VCR mode:

* CI requires live API keys
* Tests are flaky (LLMs are non-deterministic)
* Tests cannot run without API access
* Costs increase with every test run

**VCR mode solves this by recording real LLM responses once and replaying them later.**

This is **not optional infrastructure** — it is required for:

* CI
* developer experience
* regression enforcement

---

## 2. What VCR mode is (precise definition)

> **VCR mode records real LLM HTTP responses into cassette files and replays them on future requests instead of calling the provider again.**

Key constraints:

* No framework hooks
* No SDK monkey-patching
* No agent semantics
* Works at the **HTTP proxy layer**

---

## 3. Design principles (non-negotiable)

1. **Local-first**
   Cassettes are files on disk.

2. **Framework-agnostic**
   Implemented inside the existing proxy.

3. **Simple matching rules**
   Avoid ML or complex heuristics.

4. **Explicit modes**
   No magic behavior.

5. **Safe by default**
   Never accidentally call live APIs in CI.

---

## 4. High-level architecture

```
Client / Agent
     |
     v
TraceForge Proxy
     |
     |-- VCR Layer (NEW)
     |
     |-- If replay hit → return cassette response
     |-- Else → forward to provider
     |
     v
LLM Provider (OpenAI, Anthropic, etc.)
```

VCR sits **inside the proxy**, before forwarding requests.

---

## 5. Configuration model

### Environment variable (primary)

```
TRACEFORGE_VCR_MODE=off | record | replay | auto
```

Optional:

```
TRACEFORGE_VCR_MATCH=exact | fuzzy
TRACEFORGE_VCR_DIR=.ai-tests/cassettes
```

Defaults:

* `mode = off`
* `match = fuzzy`
* `dir = .ai-tests/cassettes`

---

## 6. VCR modes (exact behavior)

### `off`

* Always forward requests to provider
* No recording
* No replay

Used for:

* live experimentation
* debugging

---

### `record`

* Always forward requests
* Save responses as cassettes

Used for:

* creating new tests
* updating baselines

---

### `replay`

* Never forward requests
* Must find matching cassette
* If not found → **fail fast**

Used for:

* CI
* offline development

---

### `auto`

* If cassette exists → replay
* Else → forward & record

Used for:

* local iteration
* developer onboarding

---

## 7. Cassette format (minimal & explicit)

Each cassette is a **single JSON file**.

### File location

```
.ai-tests/cassettes/{provider}/{hash}.json
```

### Cassette schema

```json
{
  "cassette_version": "1.0",
  "provider": "openai",
  "request": {
    "model": "gpt-4o-mini",
    "messages": [...],
    "tools": [...],
    "temperature": 0.2
  },
  "response": {
    "status": 200,
    "headers": {...},
    "body": {...}
  }
}
```

Important:

* **No secrets** (redaction runs before saving)
* Streaming responses are stored as **final aggregated body**

---

## 8. Request matching strategy

### Step 1: Build request signature

Create a **stable hash** from:

* provider
* model
* messages
* tools (if present)

Ignore:

* timestamps
* request IDs
* headers like Authorization

### Step 2: Match modes

#### `exact`

* All fields must match exactly

#### `fuzzy` (default)

* model + messages + tools
* ignores optional params like `temperature`

This keeps things simple and predictable.

---

## 9. Proxy flow with VCR (pseudo-logic)

```ts
if (vcrMode !== "off") {
  const signature = buildSignature(request)

  if (vcrMode === "replay" || vcrMode === "auto") {
    const cassette = findCassette(signature)
    if (cassette) {
      return cassette.response
    }
    if (vcrMode === "replay") {
      throw new Error("VCR replay miss: no cassette found")
    }
  }
}

const response = forwardToProvider(request)

if (vcrMode === "record" || vcrMode === "auto") {
  saveCassette(signature, request, response)
}

return response
```

No hidden behavior.

---

## 10. Error handling rules (important)

* **Replay miss** → hard failure
  This prevents accidental live calls in CI.

* **Cassette parse error** → fail loudly
  Silent fallback is dangerous.

* **Provider error during record**
  Still record the error response (for regression tests).

---

## 11. Redaction & security integration

Before saving a cassette:

* Run existing `redaction.ts`
* Remove:

  * API keys
  * Authorization headers
  * PII patterns

Cassettes must be:

* safe to commit
* safe to share

---

## 12. CLI integration

Add commands:

```bash
traceforge vcr status
traceforge vcr clean
traceforge vcr list
```

Minimal behavior:

* `status` → show mode and cassette dir
* `clean` → delete all cassettes
* `list` → show cassette count per provider

No UI required initially.

---

## 13. CI integration (mandatory)

### CI rules

* CI must run with:

```
TRACEFORGE_VCR_MODE=replay
```

* CI must **not** require API keys
* Any replay miss → CI fails

This guarantees:

* deterministic tests
* zero cost
* easy testing

---

## 14. Tests required for VCR implementation

### Unit tests

* signature hashing
* cassette save/load
* matching logic

### Integration tests

* record → replay flow
* replay miss failure
* auto mode behavior

### Regression tests

* streaming response handling
* multi-provider behavior

---

## 15. What we intentionally do NOT support

To avoid over-engineering, VCR mode will **not**:

* simulate model randomness
* re-chunk streaming responses
* support partial matching
* mutate requests
* auto-update cassettes silently

Simplicity > cleverness.

---

## 16. Acceptance criteria (definition of done)

VCR mode is considered **complete** when:

* CI runs without API keys
* Contributors can run tests offline
* Replay misses fail fast
* Cassettes are safe to commit
* No framework-specific logic exists
* Code lives entirely inside proxy + shared utils

---

## 17. One-sentence summary (anchor)

> **VCR mode makes AI tests deterministic by recording real LLM responses once and replaying them safely in CI and local development.**

---

## 18. Final guidance to implementers

If you feel tempted to:

* add heuristics
* add ML
* add dashboards
* add orchestration

Stop.

This feature succeeds **because it is boring and strict**.