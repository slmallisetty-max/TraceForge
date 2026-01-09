# Deletion Candidates

This document identifies features that don't serve the core **CAPTURE → DIFF → FAIL** function.

---

## Core Principle

**Rule:** If it doesn't serve the deploy gate function, delete it or quarantine it.

The MVP transforms TraceForge into a tool that:
1. **Captures** AI behavior as snapshots
2. **Diffs** current behavior against snapshots
3. **Fails** CI when behavior changes without approval

Everything else is scope creep.

---

## High Priority: Delete Now

These features actively distract from the core mission:

### 1. Web UI (`packages/web/`)
**What it does:** Browser-based interface for exploring traces, comparing diffs, viewing timelines

**Why delete:**
- The product is the CI failure, not a dashboard
- Adds maintenance burden
- Tempts users to "review in UI" instead of in code review
- Web server is unnecessary infrastructure

**Keep instead:**
- CLI-only output (terminal is the UI)
- Git diffs for reviewing changes

**Action:** Delete entire `packages/web/` directory

---

### 2. VS Code Extension (`packages/vscode-extension/`)
**What it does:** Inline trace viewing, test running, snippets

**Why delete:**
- Nice-to-have, not core to the gate
- Adds maintenance burden for a secondary interface
- Core workflow is `git diff .ai-snapshots/`

**Action:** Delete entire `packages/vscode-extension/` directory

---

### 3. Deployment Infrastructure (`deploy/`)
**What it does:** Kubernetes configs, Docker Compose files, cloud deployment scripts

**Why delete:**
- MVP is a local-first tool
- Proxy runs locally (`localhost:8787`)
- No cloud hosting for MVP
- Complexity without value

**Keep instead:**
- Simple Dockerfile for local development only
- Docker Compose for local proxy + examples

**Action:** Delete deployment manifests, keep minimal local dev setup

---

### 4. Extensive Documentation (`guides/`)
**What it does:** 15+ guide files explaining features

**Why delete most:**
- Most features won't exist in MVP
- README should be enough for MVP
- Documentation debt grows faster than code

**Keep only:**
- `VCR_QUICK_REFERENCE.md` - Core to the gate
- `CI_ENFORCEMENT.md` - Core to the gate

**Delete:**
- `getting-started.md` - Redundant with README
- `ENTERPRISE.md` - Not MVP scope
- `session-tracking.md` - Not core
- `storage.md` - File storage only for MVP
- `assertions.md` - Too many assertion types
- `SEMANTIC_ASSERTIONS_QUICK_START.md` - Semantic assertions are complex
- `migrations.md` - No migrations in MVP
- `API.md` - No web API in MVP
- `baseline-format.md` - Use SNAPSHOT_FORMAT.md instead
- `trace-format.md` - Simplify to snapshot format only
- `design/` - Internal docs, not user-facing

**Action:** Delete all guides except the two keepers

---

### 5. Authentication System (`docs/GDPR_CCPA_COMPLIANCE.md`, auth code)
**What it does:** Multi-user auth, GDPR compliance, data privacy

**Why delete:**
- MVP is local-first, single-user
- No cloud service = no auth needed
- No user data = no GDPR concerns

**Action:** Delete compliance docs and any auth-related code

---

### 6. Risk Scoring UI Components
**What it does:** Visual risk scores, charts, dashboards

**Why delete:**
- Risk scoring is useful, but UI for it is not
- CLI output is sufficient
- Reduces maintenance burden

**Keep instead:**
- CLI text output for risk scores
- Exit codes for CI (pass/fail)

**Action:** Remove UI components, keep CLI risk scoring

---

### 7. Dashboard Components
**What it does:** Trace timelines, aggregate metrics, analytics

**Why delete:**
- Optimization for debugging, not for the gate
- Users should review in code review, not dashboards
- Dashboards tempt "monitoring" instead of "blocking"

**Action:** Delete all dashboard code

---

### 8. Multi-Storage Backend Abstractions
**What it does:** SQLite, PostgreSQL, file storage, cloud storage adapters

**Why simplify:**
- File storage is enough for MVP
- Git-committable JSON is the core model
- Database adds complexity without value for the gate

**Keep:**
- File storage only (`.ai-snapshots/`)

**Delete:**
- SQLite backend (`storage-sqlite.ts`, `storage-sqlite.test.ts`)
- Storage factory abstractions
- PostgreSQL references
- Cloud storage adapters

**Action:** Simplify to file storage only

---

## Medium Priority: Quarantine

These features might be useful later but distract from MVP:

### 1. Assertion Types (8 of 11)
**What they do:** Semantic similarity, contradiction detection, JSON schema, regex, etc.

**Why quarantine:**
- Only need hash-based matching for MVP gate
- Semantic assertions require embeddings (extra complexity)
- Most assertions optimize for testing, not for blocking

**Keep:**
- `equals` - Exact match
- `hash-match` - Hash-based verification (core to gate)

**Quarantine (comment out, don't delete):**
- `contains`
- `matches` (regex)
- `json-schema`
- `semantic-similarity`
- `semantic-contradiction`
- `max-latency-ms`
- `max-tokens`
- `max-length`

**Action:** Disable 8 assertion types, keep only `equals` and `hash-match`

---

### 2. Semantic Similarity Features
**What it does:** Embedding-based comparison, meaning-based validation

**Why quarantine:**
- Requires OpenAI API calls to compute embeddings
- Adds non-determinism (embedding models change)
- Useful but not core to the gate

**Keep:**
- Simple hash and text diff
- Exit code 1 on mismatch

**Quarantine:**
- Embedding calculation
- Similarity scoring
- Semantic drift analysis

**Action:** Comment out semantic features

---

### 3. Analytics/Metrics Beyond Basic Counts
**What it does:** Prometheus metrics, latency percentiles, cost tracking

**Why quarantine:**
- Optimization for observability, not for blocking
- Adds infrastructure complexity

**Keep:**
- Basic counts (snapshots validated, failures)
- Exit codes

**Quarantine:**
- Prometheus integration
- Advanced metrics
- Cost tracking

**Action:** Remove metrics beyond simple counts

---

### 4. Multi-Provider Abstractions
**What it does:** Support for OpenAI, Anthropic, Google, Ollama, etc.

**Why quarantine:**
- Start with OpenAI only for MVP
- Multi-provider adds test matrix complexity
- Can add back later

**Keep:**
- OpenAI support only

**Quarantine:**
- Anthropic adapter
- Google adapter
- Ollama adapter

**Action:** Start OpenAI-only, add others post-MVP

---

## What MUST Stay

These are **non-negotiable** for the MVP:

### Core Components

1. ✅ **Proxy Server** (`packages/proxy/`)
   - Intercepts LLM calls
   - Records to cassettes
   - Replays in strict mode
   - **This is the capture mechanism**

2. ✅ **Snapshot Storage** (file-based)
   - `.ai-snapshots/` directory
   - Git-committable JSON
   - Deterministic hashing
   - **This is the source of truth**

3. ✅ **Hash-Based Diff Engine**
   - Compare snapshot hashes
   - Detect changes
   - **This is the detection mechanism**

4. ✅ **`traceforge check` Command**
   - CLI command for CI
   - Exit code 1 on drift
   - Painful output format
   - **This is the deploy gate**

5. ✅ **VCR Strict Mode**
   - No live API calls in CI
   - Missing snapshot = hard fail
   - **This enforces the gate**

6. ✅ **Exit Code 1 Logic**
   - Snapshot missing → exit 1
   - Hash mismatch → exit 1
   - Non-deterministic → exit 1
   - **This blocks deployment**

### Core Files

```
traceforge/
├── packages/
│   ├── proxy/              ✅ KEEP (capture)
│   ├── cli/                ✅ KEEP (gate)
│   └── shared/             ✅ KEEP (types)
├── docs/
│   ├── MVP_CI_FAILURE.md   ✅ KEEP (spec)
│   └── SNAPSHOT_FORMAT.md  ✅ KEEP (spec)
├── .github/workflows/
│   └── ai-gate.yml         ✅ KEEP (example)
└── README.md               ✅ KEEP (pain-first)
```

---

## Implementation Strategy

### Phase 1: Document (This File)
- [x] Identify deletion candidates
- [x] Document rationale
- [ ] Get approval from maintainers

### Phase 2: Quarantine (Next PR)
- [ ] Comment out assertion types
- [ ] Disable semantic features
- [ ] Remove metrics beyond basics
- [ ] Limit to OpenAI only

### Phase 3: Delete (Future PR)
- [ ] Delete `packages/web/`
- [ ] Delete `packages/vscode-extension/`
- [ ] Delete `deploy/` (except minimal Docker)
- [ ] Delete most `guides/`
- [ ] Delete auth/compliance docs
- [ ] Delete SQLite backend

### Phase 4: Simplify (Future PR)
- [ ] Collapse proxy to essentials
- [ ] Simplify CLI to `check` command focus
- [ ] Reduce shared package to core types

---

## Success Criteria

After deletion:

- ✅ Project is <1000 LOC (excluding tests)
- ✅ Can explain entire system in 5 minutes
- ✅ One clear user journey: capture → check → approve
- ✅ No features that don't serve the gate

**Goal:** Make it so simple that there's nothing left to take away.

---

## Objections & Responses

### "But the web UI is useful for debugging!"
**Response:** Git diffs are the debugging interface. If you need more, the snapshots aren't descriptive enough.

### "But semantic assertions catch subtle issues!"
**Response:** They also add complexity and non-determinism. Start simple, add back if truly needed.

### "But multi-provider support is a key differentiator!"
**Response:** Start with one provider done well. Multi-provider is a feature, not the core value.

### "But the VS Code extension improves DX!"
**Response:** Terminal is the DX. Extensions are nice-to-have, not need-to-have.

### "But deployment infrastructure shows we're production-ready!"
**Response:** Local-first is the MVP. Cloud deployment comes after the core is solid.

---

## Review Checkpoint

Before deleting anything:

1. ✅ This document is approved by maintainers
2. ✅ Core components are clearly identified
3. ✅ Deletion plan is sequenced (quarantine → delete)
4. ✅ MVP_CI_FAILURE.md and SNAPSHOT_FORMAT.md exist
5. ✅ README rewrite is complete

**Once these are done, start Phase 2: Quarantine.**
