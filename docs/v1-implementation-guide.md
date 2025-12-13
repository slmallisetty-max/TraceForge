# TraceForge V1 Implementation Guide

**Goal:** Build a working MVP in 4-6 weeks that captures LLM traffic, visualizes traces, creates tests, and runs them locally.

---

# Overview

This guide provides a step-by-step plan to implement TraceForge V1 from scratch.

## What We're Building

A local AI debugging platform with:
- **Proxy Server** (Fastify on port 8787) - Intercepts LLM calls
- **Storage System** - Saves traces as JSON files
- **Web UI** (Fastify + React on port 3001) - Browse and inspect traces
- **CLI Tool** - Run tests from terminal
- **Shared Types** - Common TypeScript interfaces

## Tech Stack

- **Runtime:** Node.js LTS + TypeScript
- **Proxy & API:** Fastify v4
- **Frontend:** React 18 + Vite + TailwindCSS
- **CLI:** Commander.js
- **Storage:** Filesystem (JSON/YAML)
- **Monorepo:** pnpm workspaces

---

# Project Structure

```
traceforge/
├── packages/
│   ├── shared/          # Shared TypeScript types & schemas
│   ├── proxy/           # LLM proxy server (port 8787)
│   ├── cli/             # Command-line tool
│   └── web/             # Fastify API + React UI (port 3001)
├── examples/
│   └── demo-app/        # Sample app for testing
├── docs/
├── package.json         # Root workspace config
└── pnpm-workspace.yaml
```

---

# Implementation Roadmap

## Phase 0: Project Setup (~2-3 days)

**Goal:** Initialize monorepo with TypeScript configuration

### Tasks

1. **Initialize project**
   ```bash
   mkdir traceforge
   cd traceforge
   pnpm init
   ```

2. **Configure pnpm workspace**
   - Create `pnpm-workspace.yaml`
   - Set up root `package.json` with workspace dependencies

3. **Set up TypeScript**
   - Root `tsconfig.json` with strict mode
   - Shared compiler options for all packages

4. **Create package scaffolding**
   - `packages/shared/`
   - `packages/proxy/`
   - `packages/cli/`
   - `packages/web/`

5. **Set up development tools**
   - ESLint + Prettier
   - Git + `.gitignore`
   - README with quick start

### Deliverable
✅ Working monorepo with TypeScript compilation

---

## Phase 1: Shared Package (~1 week)

**Goal:** Define core types and schemas used across all packages

### Core Types to Define

```typescript
// Trace structure
interface Trace {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  endpoint: string;              // e.g., "/v1/chat/completions"
  request: LLMRequest;
  response: LLMResponse;
  metadata: TraceMetadata;
}

interface TraceMetadata {
  duration_ms: number;
  tokens_used?: number;
  model?: string;
  status: 'success' | 'error';
  error?: string;
}

// Test structure
interface Test {
  id: string;
  name: string;
  request: LLMRequest;
  assertions: Assertion[];
}

interface Assertion {
  type: 'exact' | 'contains' | 'not_contains';
  value: string;
}

// Config structure
interface Config {
  upstream_url: string;
  api_key_env_var: string;
  save_traces: boolean;
  proxy_port: number;
}
```

### Tasks

1. **Create type definitions** (`packages/shared/src/types.ts`)
   - Trace, Test, Config interfaces
   - Request/Response types for OpenAI endpoints

2. **Add Zod schemas** (`packages/shared/src/schema.ts`)
   - Runtime validation schemas
   - Use for request/response validation

3. **Export everything** (`packages/shared/src/index.ts`)

4. **Build configuration**
   - Configure TypeScript to emit declarations
   - Test that types can be imported

### Deliverable
✅ `@traceforge/shared` package with types and schemas

---

## Phase 2: Local LLM Proxy (~1.5 weeks)

**Goal:** Working Fastify server that intercepts and logs LLM calls

### Architecture

```
Client App → Proxy (8787) → OpenAI API
                ↓
           Save Trace
```

### Implementation Steps

1. **Basic Fastify server** (`packages/proxy/src/index.ts`)
   - Initialize Fastify with CORS
   - Health check endpoint `/health`
   - Start server on port 8787

2. **Configuration loader** (`packages/proxy/src/config.ts`)
   - Read `.ai-tests/config.yaml`
   - Load API key from environment variable
   - Provide defaults

3. **Storage module** (`packages/proxy/src/storage.ts`)
   - Create `.ai-tests/traces/` directory
   - Function to save trace as JSON
   - Ensure sorted keys for git-friendly diffs

4. **Implement `/v1/chat/completions` handler**
   - Parse incoming request
   - Forward to OpenAI
   - Capture response
   - Save trace
   - Return response to client

5. **Implement `/v1/completions` handler**
   - Similar to chat/completions
   - Different request/response structure

6. **Implement `/v1/embeddings` handler**
   - Handle embedding requests
   - Capture vector responses

7. **Error handling**
   - Catch network errors
   - Log errors in traces
   - Return OpenAI-compatible error responses

8. **Add timing and token tracking**
   - Measure request duration
   - Extract token counts from responses

### Key Dependencies

```json
{
  "fastify": "^4.25.2",
  "@fastify/cors": "^8.4.2",
  "dotenv": "^16.3.1",
  "uuid": "^9.0.1",
  "yaml": "^2.3.4"
}
```

### Deliverable
✅ Working proxy that captures all LLM traffic

**Test it:**
```bash
# Start proxy
cd packages/proxy
pnpm start

# Point app to proxy
export OPENAI_BASE_URL=http://localhost:8787/v1
node your-app.js

# Check traces
ls .ai-tests/traces/
```

---

## Phase 3: CLI Tool (~1 week)

**Goal:** Command-line interface for managing traces and running tests

### Commands to Implement

```bash
ai-debug init              # Create .ai-tests/ folder
ai-debug trace list        # List all traces
ai-debug trace view <id>   # View trace details
ai-debug test list         # List all tests
ai-debug test run [id]     # Run one or all tests
ai-debug test create-from-trace <trace-id>  # Convert trace to test
```

### Implementation Steps

1. **CLI framework setup** (`packages/cli/src/index.ts`)
   - Use Commander.js
   - Define command structure
   - Add version and help

2. **Init command** (`packages/cli/src/commands/init.ts`)
   - Create `.ai-tests/` directory structure
   - Generate default `config.yaml`

3. **Trace commands** (`packages/cli/src/commands/trace.ts`)
   - List: Read all trace files, display table
   - View: Load single trace, pretty print JSON

4. **Test commands** (`packages/cli/src/commands/test.ts`)
   - List: Show all test files
   - Run: Execute tests, compare outputs
   - Create: Convert trace to YAML test format

5. **Test runner logic**
   - Load test YAML
   - Make API call (via proxy or direct)
   - Run assertions
   - Display PASS/FAIL with colors

6. **Output formatting**
   - Use `chalk` for colors
   - Table formatting for lists
   - JSON output mode (`--json` flag)

### Key Dependencies

```json
{
  "commander": "^11.1.0",
  "yaml": "^2.3.4",
  "chalk": "^5.3.0",
  "cli-table3": "^0.6.3"
}
```

### Deliverable
✅ Working CLI tool for trace management and testing

---

## Phase 4: Web UI Backend (Fastify API) (~3 days)

**Goal:** API server that serves trace data and handles test creation

### API Endpoints

```
GET  /api/traces           → List all traces
GET  /api/traces/:id       → Get single trace
POST /api/tests            → Create test from trace
GET  /api/config           → Get current config
GET  /                     → Serve React frontend
```

### Implementation Steps

1. **Fastify server setup** (`packages/web/server/index.ts`)
   - Initialize Fastify on port 3001
   - Add CORS for development
   - Register `@fastify/static` for React build

2. **Trace routes** (`packages/web/server/routes/traces.ts`)
   - GET `/api/traces`: Read `.ai-tests/traces/`, return JSON array
   - GET `/api/traces/:id`: Read specific trace file

3. **Test routes** (`packages/web/server/routes/tests.ts`)
   - POST `/api/tests`: Accept trace ID, create YAML test file

4. **Config route**
   - GET `/api/config`: Return current configuration

5. **Static file serving**
   - Serve React build from `dist/` folder
   - SPA fallback for client-side routing

### Key Dependencies

```json
{
  "fastify": "^4.25.2",
  "@fastify/cors": "^8.4.2",
  "@fastify/static": "^6.12.0"
}
```

### Deliverable
✅ API server ready for frontend integration

---

## Phase 5: Web UI Frontend (React) (~1.5 weeks)

**Goal:** Browser interface for viewing traces and creating tests

### Two Main Views

#### View 1: Trace Timeline (`/`)

**Components:**
- `TraceList.tsx` - Table of all traces
- `TraceRow.tsx` - Single row with click handler
- `SearchBar.tsx` - Filter by model/endpoint

**Features:**
- Fetch traces from `/api/traces`
- Display: timestamp, endpoint, model, status
- Click row → navigate to detail view
- Auto-refresh every 5 seconds

#### View 2: Trace Detail (`/trace/:id`)

**Components:**
- `TraceDetail.tsx` - Main container
- `RequestPanel.tsx` - Show request JSON
- `ResponsePanel.tsx` - Show response JSON
- `MetadataPanel.tsx` - Tokens, duration, status
- `SaveTestButton.tsx` - Create test action

**Features:**
- Fetch trace from `/api/traces/:id`
- Syntax-highlighted JSON
- Copy to clipboard
- "Save as Test" button → POST to `/api/tests`

### Implementation Steps

1. **Project setup** (`packages/web/`)
   - Initialize Vite + React + TypeScript
   - Install TailwindCSS
   - Configure dev server proxy to API (port 3001)

2. **API client** (`packages/web/src/api/client.ts`)
   - Fetch wrappers for all endpoints
   - TypeScript types from `@traceforge/shared`

3. **Routing** (`packages/web/src/App.tsx`)
   - React Router
   - Two routes: `/` and `/trace/:id`

4. **Build trace list view**
   - Fetch data on mount
   - Render table with TailwindCSS
   - Handle loading and error states

5. **Build trace detail view**
   - Fetch trace by ID
   - JSON viewer component
   - Format timestamps and durations

6. **Add "Save as Test" feature**
   - Button with confirmation
   - POST request to create test
   - Show success message

7. **Styling**
   - Dark mode by default
   - Responsive layout
   - Clean, minimal design

### Key Dependencies

```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "react-json-view": "^1.21.3",
  "tailwindcss": "^3.3.0"
}
```

### Deliverable
✅ Working web UI accessible at `http://localhost:3001`

---

## Phase 6: Integration & Testing (~3-5 days)

**Goal:** End-to-end workflow validation

### Testing Scenarios

1. **Proxy captures traces**
   - Start proxy
   - Run demo app that calls OpenAI
   - Verify traces saved to `.ai-tests/traces/`

2. **CLI can read traces**
   - Run `ai-debug trace list`
   - Run `ai-debug trace view <id>`
   - Verify output matches saved traces

3. **Web UI displays traces**
   - Open `http://localhost:3001`
   - Verify traces appear in timeline
   - Click trace → view details

4. **Create test from trace**
   - Click "Save as Test" in web UI
   - Verify YAML file created in `.ai-tests/tests/`
   - Verify test structure is valid

5. **Run tests via CLI**
   - Run `ai-debug test run`
   - Verify assertions pass/fail correctly
   - Test error handling

### Tasks

1. **Create demo application**
   - Simple Node.js script that calls OpenAI
   - Configurable to point to proxy
   - Example in `examples/demo-app/`

2. **Write integration tests**
   - Test proxy endpoints
   - Test CLI commands
   - Test API endpoints

3. **Documentation**
   - Update README with setup instructions
   - Add QUICKSTART.md
   - Document configuration options

4. **Fix bugs**
   - Address any issues found during testing
   - Improve error messages
   - Handle edge cases

### Deliverable
✅ Fully working V1 MVP with documentation

---

# Development Workflow

## Daily Development

```bash
# Terminal 1: Start proxy
cd packages/proxy
pnpm dev

# Terminal 2: Start web UI API + frontend
cd packages/web
pnpm dev

# Terminal 3: Run demo app
cd examples/demo-app
node index.js

# Terminal 4: Use CLI
cd packages/cli
pnpm start trace list
```

## Building Packages

```bash
# Build all packages
pnpm -r build

# Build specific package
cd packages/shared
pnpm build
```

## Testing

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

# MVP Success Criteria

- ✅ Proxy captures LLM requests and responses
- ✅ Traces saved as JSON files in `.ai-tests/traces/`
- ✅ Web UI displays trace timeline
- ✅ Can view individual trace details
- ✅ Can create test from trace via web UI
- ✅ CLI can list traces and tests
- ✅ CLI can run tests and show PASS/FAIL
- ✅ Works 100% locally (no cloud dependencies)
- ✅ Documentation for setup and usage

---

# Timeline Summary

| Phase | Task | Duration | Cumulative |
|-------|------|----------|------------|
| 0 | Project Setup | 2-3 days | 3 days |
| 1 | Shared Package | 1 week | 10 days |
| 2 | Proxy Server | 1.5 weeks | 21 days |
| 3 | CLI Tool | 1 week | 28 days |
| 4 | API Server | 3 days | 31 days |
| 5 | React Frontend | 1.5 weeks | 42 days |
| 6 | Integration | 3-5 days | 45-47 days |

**Total: 6-7 weeks** for a complete V1 MVP

---

# Key Design Decisions

## 1. Monorepo Structure
- Easier to share types
- Single version control
- Simplified dependency management

## 2. Fastify for Both Proxy and API
- Fast and lightweight
- Good TypeScript support
- Plugin ecosystem
- Consistent across codebase

## 3. Filesystem Storage
- Simple and reliable
- Git-friendly
- No database required
- Easy to backup and share

## 4. YAML for Tests
- Human-readable
- Easy to edit
- Supports comments
- Git diff friendly

## 5. TypeScript Everywhere
- Type safety across packages
- Better IDE support
- Fewer runtime errors

---

# Next Steps After V1

Once V1 is shipped, prioritize:

1. **Streaming support** - Most LLM apps use streaming
2. **Diff view** - Compare traces side-by-side
3. **VS Code extension** - Integrate into developer workflow
4. **More assertions** - Regex, JSON path, fuzzy matching
5. **Multi-provider support** - Anthropic, local models

Refer to [mvp-plan.md](./mvp-plan.md) for V2 and V3 features.

---

# Tips for Success

## Start Simple
- Don't over-engineer Phase 1
- Hard-code values initially
- Add configuration later

## Test Early
- Run the proxy after each feature
- Use a real OpenAI app for testing
- Capture real traces

## Document As You Go
- Update README with each phase
- Add inline code comments
- Keep examples up to date

## Get Feedback
- Share early with potential users
- Test on different projects
- Iterate based on real usage

---

# Common Pitfalls to Avoid

❌ **Over-engineering storage** - Start with simple JSON files
❌ **Perfect UI first** - Ship basic UI, iterate later
❌ **Complex assertions** - Start with exact match only
❌ **Streaming too early** - Add after basic flow works
❌ **No testing** - Build demo app from day 1

---

# Resources

## Documentation to Write
- [ ] README.md - Project overview
- [ ] QUICKSTART.md - 5-minute setup guide
- [ ] CONTRIBUTING.md - For open source
- [ ] API.md - API endpoint reference

## Examples to Create
- [ ] Demo Node.js app
- [ ] Sample config files
- [ ] Example test YAML files

---

# End of Implementation Guide

This guide provides a clear path from zero to working V1 MVP. Follow the phases in order, test continuously, and don't skip documentation. Good luck building TraceForge! 🚀
