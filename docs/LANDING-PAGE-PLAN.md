# TraceForge Landing Page & Developer Documentation Plan

## Executive Summary

This document outlines the plan for creating:
1. **Landing Page** - A comprehensive entry point for TraceForge (index.md)
2. **Developer Documentation** - Complete technical reference for using and extending TraceForge

## Analysis of Current Documentation

### Current State
- **Strengths:**
  - Comprehensive implementation guides (v1, v2)
  - Detailed phase-by-phase completion docs
  - Quick start guide exists
  - Testing guide available
  
- **Gaps:**
  - No single entry point for new users
  - Documentation is scattered
  - No clear developer journey
  - Missing API reference
  - No architecture overview for contributors
  - Limited examples/tutorials

### Target Audience
1. **End Users** - Developers who want to debug AI apps
2. **Contributors** - Developers who want to extend TraceForge
3. **Evaluators** - Decision makers evaluating TraceForge

## Landing Page Structure (index.md)

### Goal
Single entry point that:
- Explains what TraceForge is in 30 seconds
- Shows key features with visuals
- Provides clear next steps
- Links to all relevant documentation

### Sections

#### 1. Hero Section
- **Title**: TraceForge - Local-First AI Debugging Platform
- **Tagline**: Capture, inspect, and test LLM interactions without the cloud
- **Quick Value Props**:
  - 🔍 See every LLM interaction
  - 🧪 Turn traces into deterministic tests
  - 📊 Compare responses across providers
  - 🔒 100% local - no data leaves your machine
  - 🤖 Multi-provider support (OpenAI, Claude, Gemini, Ollama)

#### 2. Quick Start
- 3-step installation
- Copy-paste commands
- "Working in 5 minutes" promise

#### 3. Key Features
Organized by use case:
- **For Debugging**: Trace visualization, streaming support, diff view
- **For Testing**: Advanced assertions, parallel execution, fixtures
- **For Teams**: VS Code extension, analytics dashboard, config editor
- **For Security**: Local-first, no cloud dependencies, data privacy

#### 4. Architecture Overview
- Simple diagram showing proxy → storage → UI flow
- Links to detailed architecture docs

#### 5. Navigation Hub
Clear pathways:
- **"I want to use TraceForge"** → Getting Started Guide
- **"I want to contribute"** → Development Guide
- **"I want to understand how it works"** → Architecture Guide
- **"I need API reference"** → API Documentation

#### 6. Status & Roadmap
- Current version (V2 Complete)
- What's implemented
- Future plans

## Developer Documentation Structure

### 1. Getting Started (`DEV-GETTING-STARTED.md`)

**Purpose**: Take a developer from zero to running first test in 10 minutes

**Contents**:
- Prerequisites checklist
- Installation steps (pnpm, build)
- Configuration (API keys, providers)
- First trace capture walkthrough
- First test creation
- Troubleshooting common issues

### 2. API Reference (`API-REFERENCE.md`)

**Purpose**: Complete technical reference for all APIs

**Contents**:

#### CLI API
- `traceforge init` - Initialize project
- `traceforge trace list` - List traces
- `traceforge trace view <id>` - View trace details
- `traceforge test create-from-trace <id>` - Create test
- `traceforge test run` - Run tests
  - Options: `--parallel`, `--watch`, `--fixture`, `--filter`

#### REST API
- `GET /api/traces` - List traces
- `GET /api/traces/:id` - Get trace
- `GET /api/tests` - List tests
- `POST /api/tests` - Create test
- `GET /api/analytics` - Get analytics data

#### Configuration File Reference
- `.ai-tests/config.yaml` schema
- Provider configuration
- Test patterns
- Assertion types

#### Test File Format
- YAML schema for tests
- All assertion types with examples
- Fixture system
- Tags and metadata

### 3. Architecture Guide (`ARCHITECTURE.md`)

**Purpose**: Deep dive into how TraceForge works

**Contents**:

#### System Components
- **Proxy Server** (packages/proxy)
  - Request interception
  - Provider detection
  - Streaming support
  - Storage integration
  
- **Web UI** (packages/web)
  - React + Vite frontend
  - Express API backend
  - Real-time updates
  - Component architecture
  
- **CLI Tool** (packages/cli)
  - Command structure
  - Test runner
  - Assertion engine
  
- **VS Code Extension** (packages/vscode-extension)
  - Tree view providers
  - Commands
  - Proxy management
  
- **Shared Package** (packages/shared)
  - Type definitions
  - Zod schemas
  - Utilities

#### Data Flow
- Request capture flow
- Streaming capture flow
- Test execution flow
- Multi-provider routing

#### Storage Format
- Trace file structure
- Test file structure
- Directory layout

### 4. Advanced Topics (`ADVANCED.md`)

**Purpose**: Power user features and edge cases

**Contents**:

#### Multi-Provider Setup
- Configuring multiple providers
- Provider detection logic
- Custom provider endpoints
- Local model integration (Ollama)

#### Advanced Testing
- Custom assertions
- Fuzzy matching strategies
- JSON path queries
- Schema validation
- Fixtures and setup/teardown
- Parallel execution strategies

#### Performance Optimization
- Batch operations
- Large trace files
- Test parallelization
- Caching strategies

#### Integration Patterns
- CI/CD integration
- Docker deployment
- Monorepo setup
- Team collaboration

### 5. Contributing Guide (`CONTRIBUTING.md`)

**Purpose**: Onboard contributors to the codebase

**Contents**:

#### Development Setup
- Fork and clone
- Install dependencies
- Build process
- Running in dev mode

#### Code Structure
- Package organization
- TypeScript conventions
- Testing approach
- Documentation standards

#### Contribution Workflow
- Creating issues
- Branch naming
- Commit messages
- Pull request process
- Code review expectations

#### Adding Features
- New assertion types
- New providers
- UI components
- CLI commands

### 6. Tutorials (`TUTORIALS.md`)

**Purpose**: Practical examples for common use cases

**Contents**:

#### Tutorial 1: First AI Test
- Capture a GPT-4 call
- Create a test
- Run and validate
- Modify and re-run

#### Tutorial 2: Multi-Provider Comparison
- Set up OpenAI, Claude, Gemini
- Send same prompt to all
- Compare results in diff view
- Create comparative tests

#### Tutorial 3: Streaming Response Testing
- Capture streaming response
- Test chunk timing
- Validate incremental content
- Performance assertions

#### Tutorial 4: CI/CD Integration
- Add to GitHub Actions
- Run tests on PR
- Store results
- Fail on regression

#### Tutorial 5: Custom Assertions
- Create fuzzy match test
- Use JSON path queries
- Schema validation
- Complex multi-assertion tests

### 7. Troubleshooting (`TROUBLESHOOTING.md`)

**Purpose**: Solve common problems quickly

**Contents**:

#### Installation Issues
- Node version problems
- pnpm errors
- Build failures

#### Runtime Issues
- Proxy not starting
- Traces not captured
- UI not loading
- API connection errors

#### Testing Issues
- Tests failing unexpectedly
- Assertion errors
- Provider routing issues
- Performance problems

#### Integration Issues
- VS Code extension not working
- API key problems
- Port conflicts
- File permission errors

## Implementation Priority

### Phase 1: Core Documentation (Week 1)
1. ✅ Landing page (index.md)
2. ✅ Getting Started guide
3. ✅ API Reference

### Phase 2: Deep Dives (Week 2)
4. Architecture guide
5. Advanced topics
6. Troubleshooting

### Phase 3: Community (Week 3)
7. Contributing guide
8. Tutorials
9. Examples

## Design Principles

### For All Documentation:
1. **Progressive Disclosure**: Start simple, link to details
2. **Copy-Paste Friendly**: All code blocks should work as-is
3. **Visual Where Helpful**: Diagrams for architecture, screenshots for UI
4. **Searchable**: Clear headings, keywords, cross-references
5. **Maintainable**: Single source of truth, avoid duplication
6. **Accessible**: Clear language, no jargon without explanation

### For Landing Page Specifically:
1. **Scannable**: Use bullets, short paragraphs, clear headings
2. **Action-Oriented**: Every section should have a clear next step
3. **Show Don't Tell**: Code examples over descriptions
4. **Fast Navigation**: Table of contents, quick links
5. **Status Transparency**: Show what works, what's planned

## Success Metrics

A successful landing page + dev docs will:
- ✅ New user can start using TraceForge in < 10 minutes
- ✅ All features are documented with examples
- ✅ Contributors know where to start
- ✅ Troubleshooting covers 80% of common issues
- ✅ Zero questions about "how do I..."

## File Structure

```
docs/
├── index.md                    # Landing page (NEW)
├── DEV-GETTING-STARTED.md      # Getting started (NEW)
├── API-REFERENCE.md            # Complete API docs (NEW)
├── ARCHITECTURE.md             # System architecture (NEW)
├── ADVANCED.md                 # Advanced topics (NEW)
├── CONTRIBUTING.md             # Contribution guide (NEW)
├── TUTORIALS.md                # Step-by-step tutorials (NEW)
├── TROUBLESHOOTING.md          # Common issues (NEW)
├── QUICKSTART.md               # Existing - link from landing
├── TESTING-GUIDE.md            # Existing - reference in docs
└── [implementation docs]       # Keep for historical reference
```

## Next Steps

1. Review and approve this plan
2. Create landing page (index.md)
3. Create developer documentation files
4. Review and iterate
5. Update main README.md to point to docs/index.md
