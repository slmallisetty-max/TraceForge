# MVP Deletion Candidates

## Purpose

This document lists features and components that do **NOT** directly serve the MVP goal:

> **"If AI behavior changes without explicit approval, the build must fail."**

These are not bad features—they're just **not part of the MVP**. They can be added later once the core product (CI failure) is proven.

---

## Rule of Thumb

**If deleting it makes you uncomfortable = good sign it should be deferred.**

The MVP must be so minimal that it's almost embarrassing to ship. If it feels "complete," it's too big.

---

## Components to Defer (Not Delete Yet)

### 1. Web Dashboard (`packages/web/`)

**Status:** Defer to post-MVP  
**Reason:** Dashboard is for browsing traces and comparing diffs. MVP is CLI-only.

**What to keep:**
- None of this is needed for MVP

**What to defer:**
- ❌ React UI for browsing traces
- ❌ Trace comparison view
- ❌ Risk scoring visualization
- ❌ Live trace streaming
- ❌ Search and filtering
- ❌ User authentication
- ❌ API server for web UI

**Justification:**
CI failure output is text-based. No UI needed to block builds.

---

### 2. VS Code Extension (`packages/vscode-extension/`)

**Status:** Defer to post-MVP  
**Reason:** Editor integration is nice-to-have, not required for CI blocking.

**What to keep:**
- None of this is needed for MVP

**What to defer:**
- ❌ VS Code sidebar for traces
- ❌ Inline test running
- ❌ YAML snippets
- ❌ Status bar integration
- ❌ Auto-refresh on changes

**Justification:**
Developers can run `traceforge check` from terminal. Extension is convenience, not necessity.

---

### 3. Risk Scoring System

**Status:** Simplify dramatically  
**Reason:** MVP is exact match only. No ML, no semantic analysis, no scoring.

**What to keep:**
- ✅ Exact string comparison (changed vs unchanged)
- ✅ Simple categorization (breaking vs non-breaking)

**What to defer:**
- ❌ Semantic similarity (embeddings, ML)
- ❌ Numeric risk scores (1-10 scale)
- ❌ Drift thresholds (0.85 similarity, etc.)
- ❌ Risk policies (YAML-based rules)
- ❌ Critic agent analysis
- ❌ Risk reports and summaries

**Justification:**
Changed = changed. No need to quantify "how much" it changed. MVP is binary: approve or block.

---

### 4. Multiple Storage Backends

**Status:** File-only for MVP  
**Reason:** Keep it simple. Files in git = easy, SQLite = complexity.

**What to keep:**
- ✅ File-based JSON storage (`.ai-snapshots/`)
- ✅ Git integration (commit snapshots)

**What to defer:**
- ❌ SQLite backend
- ❌ PostgreSQL backend
- ❌ In-memory storage
- ❌ Cloud storage (S3, GCS)
- ❌ Storage migration tools

**Justification:**
For MVP scale (<100 snapshots), files are sufficient and git-friendly.

---

### 5. Semantic Assertions

**Status:** Defer to post-MVP  
**Reason:** MVP is snapshot comparison, not runtime assertions.

**What to keep:**
- ✅ Exact output matching

**What to defer:**
- ❌ Semantic similarity assertions
- ❌ JSON schema validation
- ❌ Regex pattern matching
- ❌ Contradiction detection
- ❌ Toxicity checking
- ❌ PII detection
- ❌ Performance assertions (latency, tokens)

**Justification:**
MVP compares snapshots from baseline vs current. Assertions are for live test runs, which is a different feature.

---

### 6. VCR Proxy Server (`packages/proxy/`)

**Status:** Keep minimal version  
**Reason:** Needed for capturing snapshots, but strip down to essentials.

**What to keep:**
- ✅ Basic HTTP proxy to LLM providers
- ✅ Request/response recording to JSON
- ✅ Replay from snapshots (for tests)
- ✅ Multi-provider support (OpenAI, Anthropic)

**What to defer:**
- ❌ Advanced VCR modes (auto, strict enforcement)
- ❌ Cassette matching strategies
- ❌ Request deduplication
- ❌ Streaming response handling
- ❌ Circuit breakers and retries
- ❌ Metrics and monitoring
- ❌ Rate limiting
- ❌ Authentication proxy

**Justification:**
For MVP, just need basic record/replay. Advanced VCR features are nice but not required to detect changes.

---

### 7. CI Risk Analysis (`ci check` command with risk scoring)

**Status:** Replace with simpler `check` command  
**Reason:** Current implementation has semantic drift, critic agents, and risk scoring. MVP doesn't need this complexity.

**What to keep:**
- ✅ Basic snapshot comparison
- ✅ Exit code 0/1 based on changes
- ✅ Diff output

**What to defer:**
- ❌ Semantic drift calculation (embeddings)
- ❌ Critic agent analysis
- ❌ Risk score computation
- ❌ JUnit XML reports
- ❌ JSON output format
- ❌ Risk policies and thresholds

**Justification:**
Replace existing `ci check` with new `traceforge check` that's just diff + block. No ML, no scoring.

---

### 8. Test Runner (`test run` command)

**Status:** Simplify or defer  
**Reason:** MVP is about comparing snapshots, not running tests.

**What to keep:**
- ✅ Maybe: basic test execution if needed for snapshot generation
- ✅ YAML test definitions (if they're the source of snapshots)

**What to defer:**
- ❌ Watch mode
- ❌ Parallel execution
- ❌ JUnit reporting
- ❌ Coverage reports
- ❌ Policy enforcement during test runs
- ❌ Progress bars and fancy output

**Justification:**
MVP assumes snapshots already exist (from previous test runs). Focus is on comparison, not execution.

---

### 9. Cloud Deployment Infrastructure

**Status:** Defer entirely  
**Reason:** MVP is local-first and CI-focused. No cloud needed.

**What to defer:**
- ❌ Docker images
- ❌ Kubernetes manifests
- ❌ Cloud deployment guides
- ❌ Multi-tenancy
- ❌ Authentication/authorization
- ❌ Hosted version

**Justification:**
MVP runs in CI pipelines using local files. No cloud infrastructure needed.

---

### 10. Advanced CLI Features

**Status:** Strip down to MVP commands only  
**Reason:** Most CLI commands are for trace browsing and management, not MVP.

**What to keep:**
- ✅ `traceforge check` - Compare snapshots and block CI
- ✅ `traceforge check diff` - Show changes
- ✅ `traceforge check approve` - Approve changes

**What to defer:**
- ❌ `traceforge init` - Project setup wizard
- ❌ `traceforge start` - Start services (if web/proxy deferred)
- ❌ `traceforge trace list` - Browse traces
- ❌ `traceforge trace show` - View trace details
- ❌ `traceforge trace compare` - Compare traces
- ❌ `traceforge vcr list` - VCR cassette management
- ❌ `traceforge vcr validate` - Cassette validation
- ❌ `traceforge vcr clean` - Cassette cleanup
- ❌ `traceforge embeddings` - Embedding cache management

**Justification:**
MVP is just check + approve. Everything else is nice-to-have for debugging but not required to block CI.

---

### 11. Documentation Beyond MVP

**Status:** Update existing, don't add new  
**Reason:** Focus on pain-first README and CI failure spec.

**What to keep:**
- ✅ `README.md` (rewritten for MVP)
- ✅ `docs/MVP_CI_FAILURE.md` (the spec)
- ✅ Basic usage guide

**What to defer:**
- ❌ Architecture deep-dives
- ❌ API reference docs
- ❌ Advanced guides (semantic assertions, etc.)
- ❌ Migration guides (no prior version to migrate from)
- ❌ Troubleshooting guides (build when issues appear)

**Justification:**
MVP docs should be minimal: "Here's the problem, here's the failure, here's how to fix it."

---

### 12. Policy Engine

**Status:** Defer entirely  
**Reason:** MVP is approval-based, not policy-based.

**What to defer:**
- ❌ Policy YAML files
- ❌ Policy validation
- ❌ Policy templates
- ❌ Max latency enforcement
- ❌ Max tokens enforcement
- ❌ Blocked patterns detection
- ❌ Policy inheritance

**Justification:**
Policies automate decisions ("block if X"). MVP requires human approval for every change. Policies come later.

---

### 13. Metrics and Monitoring

**Status:** Defer entirely  
**Reason:** MVP is for CI blocking, not observability.

**What to defer:**
- ❌ Prometheus metrics
- ❌ Grafana dashboards
- ❌ Trace aggregation
- ❌ Performance monitoring
- ❌ Error tracking
- ❌ Usage analytics

**Justification:**
These are for production runtime monitoring. MVP is for pre-deployment blocking.

---

### 14. Multi-Provider Complexity

**Status:** Keep OpenAI only  
**Reason:** One provider is enough to prove the concept.

**What to keep:**
- ✅ OpenAI API compatibility (most common)

**What to defer:**
- ❌ Anthropic Claude support
- ❌ Google Gemini support
- ❌ Ollama local models
- ❌ Azure OpenAI support
- ❌ Provider auto-detection
- ❌ Provider failover

**Justification:**
Adding providers is easy once core is proven. Start with OpenAI, add others post-MVP.

---

### 15. Advanced Git Integration

**Status:** Keep basic only  
**Reason:** MVP needs simple baseline comparison.

**What to keep:**
- ✅ `git show <ref>:.ai-snapshots/` to load baseline
- ✅ `git diff` to compare changes

**What to defer:**
- ❌ Branch comparison strategies
- ❌ Merge conflict resolution
- ❌ Git hooks integration
- ❌ Automatic baseline selection
- ❌ Multi-branch workflows

**Justification:**
MVP uses `main` as baseline, `HEAD` as current. Advanced branch strategies can wait.

---

## Summary: What's In vs Out

### ✅ In Scope for MVP

1. **Snapshot storage** (JSON files in `.ai-snapshots/`)
2. **Snapshot comparison** (exact match, no ML)
3. **CI failure output** (the painful, detailed message)
4. **`traceforge check` command** (main product)
5. **`traceforge check approve` command** (fix the block)
6. **`traceforge check diff` command** (review changes)
7. **GitHub Actions example** (show it working)
8. **Pain-first README** (positioning)
9. **Basic snapshot capture** (record responses)

### ❌ Out of Scope for MVP

1. Web dashboard
2. VS Code extension
3. Risk scoring and ML
4. Multiple storage backends
5. Semantic assertions
6. Advanced VCR features
7. Policy engine
8. Metrics and monitoring
9. Cloud deployment
10. Advanced CLI commands
11. Multi-provider support (beyond OpenAI)
12. Advanced git workflows
13. Test runner (watch, parallel, etc.)
14. Extensive documentation

---

## Decision Framework

When unsure if something belongs in MVP, ask:

1. **Does it help produce the CI failure output?**
   - Yes → In scope
   - No → Defer

2. **Does it make the failure more painful/unavoidable?**
   - Yes → In scope
   - No → Defer

3. **Can MVP work without it?**
   - Yes → Defer
   - No → In scope

4. **Is it for debugging/convenience?**
   - Yes → Defer
   - No → Maybe in scope

**When in doubt, defer it.**

---

## Post-MVP Roadmap (For Later)

Once MVP is proven (people actually use it to block CI), add:

1. **Phase 2**: Web UI for reviewing changes
2. **Phase 3**: Semantic similarity (ML-based comparison)
3. **Phase 4**: Risk scoring and policies
4. **Phase 5**: VS Code extension
5. **Phase 6**: Multi-provider support
6. **Phase 7**: SQLite/Postgres backends
7. **Phase 8**: Cloud-hosted version

But first, prove the core: **CI failure is valuable enough that people will adopt it.**

Everything else is optimization.
