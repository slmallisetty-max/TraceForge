# Contributing to TraceForge

Thank you for your interest in contributing to TraceForge! This guide will help you get started.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Code Style](#code-style)
8. [Submitting Changes](#submitting-changes)
9. [Adding Features](#adding-features)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone, regardless of experience level, gender identity, sexual orientation, disability, personal appearance, race, ethnicity, age, religion, or nationality.

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other contributors

**Unacceptable behavior:**
- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git
- A code editor (VS Code recommended)

### Quick Start

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/traceforge.git
cd traceforge

# Add upstream remote
git remote add upstream https://github.com/original/traceforge.git

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

---

## Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo.

### 2. Build Packages

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/proxy
pnpm build

# Watch mode for development
pnpm build:watch
```

### 3. Run in Development Mode

**Terminal 1: Proxy**
```bash
cd packages/proxy
pnpm dev  # Runs with tsx watch mode
```

**Terminal 2: Web UI**
```bash
cd packages/web
pnpm dev  # Runs Vite dev server
```

**Terminal 3: Backend API**
```bash
cd packages/web
pnpm server:dev  # Runs Express with tsx watch
```

### 4. Set Up Environment Variables

Create `.env` in project root:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

---

## Project Structure

```
traceforge/
├── packages/
│   ├── shared/          # Common types and utilities
│   │   ├── src/
│   │   │   ├── types.ts      # TypeScript interfaces
│   │   │   ├── schema.ts     # Zod schemas
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── proxy/           # LLM interceptor proxy
│   │   ├── src/
│   │   │   ├── index.ts           # Server entry
│   │   │   ├── config.ts          # Config loader
│   │   │   ├── storage.ts         # Trace storage
│   │   │   ├── provider-detector.ts
│   │   │   └── handlers/          # Provider handlers
│   │   └── package.json
│   │
│   ├── cli/             # Command-line tool
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/          # CLI commands
│   │   │   └── utils/             # Utilities
│   │   └── package.json
│   │
│   ├── web/             # Web UI and API
│   │   ├── src/                   # React frontend
│   │   │   ├── App.tsx
│   │   │   └── components/
│   │   ├── server/                # Express backend
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── vscode-extension/  # VS Code integration
│       ├── src/
│       │   ├── extension.ts
│       │   └── providers/
│       └── package.json
│
├── docs/                # Documentation
├── examples/            # Example applications
└── package.json         # Root package
```

### Package Dependencies

```
shared ──┐
         ├──> proxy
         ├──> cli
         ├──> web
         └──> vscode-extension
```

The `shared` package must be built first as other packages depend on it.

---

## Development Workflow

### 1. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-new-feature

# Or bug fix branch
git checkout -b fix/issue-123
```

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes

### 2. Make Changes

Edit code in your preferred editor. We recommend VS Code with these extensions:

- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Error Lens** - Inline errors

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/proxy
pnpm test

# Run linter
pnpm lint

# Type check
pnpm type-check
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new provider support for XYZ"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(proxy): add support for Cohere provider

Add handler for Cohere API with request/response transformation
and integration with existing provider detection system.

Closes #123
```

```
fix(cli): handle missing config file gracefully

Previously crashed with ENOENT when config.yaml missing.
Now shows helpful error message and suggests running init.

Fixes #456
```

---

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration

# These test:
# - Proxy capturing traces
# - CLI commands
# - API endpoints
# - End-to-end workflows
```

### Manual Testing

```bash
# Start all services
pnpm dev

# Test proxy
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'

# Test API
curl http://localhost:3001/api/traces

# Test CLI
cd packages/cli
node dist/index.js trace list
```

---

## Code Style

### TypeScript Style Guide

```typescript
// Use explicit types
function processTrace(trace: Trace): ProcessedTrace {
  return { ...trace, processed: true };
}

// Use interfaces for objects
interface TraceMetadata {
  id: string;
  timestamp: Date;
  provider: ProviderType;
}

// Use type for unions/aliases
type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama';

// Use async/await over promises
async function fetchTrace(id: string): Promise<Trace> {
  const trace = await storage.loadTrace(id);
  return trace;
}

// Use descriptive names
const isValidTrace = (trace: Trace) => trace.id && trace.provider;

// Add JSDoc for public APIs
/**
 * Loads a trace from storage by ID
 * @param id - The trace ID
 * @returns Promise resolving to the trace
 * @throws Error if trace not found
 */
async function loadTrace(id: string): Promise<Trace> {
  // ...
}
```

### React Component Style

```typescript
// Use functional components
export function TraceList({ traces }: TraceListProps) {
  const [selected, setSelected] = useState<string | null>(null);
  
  return (
    <div className="trace-list">
      {traces.map(trace => (
        <TraceCard
          key={trace.id}
          trace={trace}
          selected={selected === trace.id}
          onSelect={() => setSelected(trace.id)}
        />
      ))}
    </div>
  );
}

// Use TypeScript for props
interface TraceListProps {
  traces: Trace[];
  onSelect?: (id: string) => void;
}
```

### Formatting

We use Prettier with these settings:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

Format code:

```bash
pnpm format

# Check formatting
pnpm format:check
```

---

## Submitting Changes

### 1. Push to Your Fork

```bash
git push origin feature/my-new-feature
```

### 2. Create Pull Request

1. Go to https://github.com/YOUR_USERNAME/traceforge
2. Click "New Pull Request"
3. Select your branch
4. Fill in the template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### 3. Code Review

- Be responsive to feedback
- Make requested changes
- Push updates to same branch
- PR will auto-update

### 4. Merge

Once approved, maintainers will merge your PR!

---

## Adding Features

### Adding a New Provider

**1. Create Handler**

`packages/proxy/src/handlers/my-provider.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LLMRequest, Trace } from '@traceforge/shared';

export async function myProviderHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = request.body as LLMRequest;
  const startTime = Date.now();
  
  // Transform request to provider format
  const providerRequest = transformRequest(body);
  
  // Call provider API
  const response = await fetch(PROVIDER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(providerRequest)
  });
  
  const data = await response.json();
  
  // Transform back to OpenAI format
  const normalized = normalizeResponse(data);
  
  // Save trace
  const trace: Trace = {
    id: generateId(),
    provider: 'my-provider',
    model: body.model,
    timestamp: new Date().toISOString(),
    status: response.status,
    duration: Date.now() - startTime,
    request: body,
    response: normalized,
    tokens: extractTokens(normalized)
  };
  
  await storage.saveTrace(trace);
  
  return reply.send(normalized);
}

function transformRequest(request: LLMRequest) {
  // Convert to provider format
}

function normalizeResponse(response: any) {
  // Convert to OpenAI format
}
```

**2. Update Provider Detector**

`packages/proxy/src/provider-detector.ts`:

```typescript
detectProvider(model: string): ProviderType {
  // Add detection logic
  if (model.startsWith('my-provider-')) {
    return 'my-provider';
  }
  // ...
}
```

**3. Register Route**

`packages/proxy/src/index.ts`:

```typescript
import { myProviderHandler } from './handlers/my-provider';

server.post('/v1/my-provider/*', myProviderHandler);
```

**4. Add Tests**

`packages/proxy/src/handlers/__tests__/my-provider.test.ts`:

```typescript
describe('myProviderHandler', () => {
  it('should transform request correctly', async () => {
    // Test implementation
  });
  
  it('should normalize response', async () => {
    // Test implementation
  });
});
```

**5. Update Documentation**

- Add to [API Reference](API-REFERENCE.md)
- Add to [v2-phase-8-multi-provider.md](v2-phase-8-multi-provider.md)
- Update [index.md](index.md) provider list

### Adding a New Assertion Type

**1. Add Type Definition**

`packages/shared/src/types.ts`:

```typescript
export interface MyCustomAssertion extends BaseAssertion {
  type: 'my_custom';
  param1: string;
  param2: number;
}

export type Assertion = 
  | EqualsAssertion
  | ContentContainsAssertion
  | MyCustomAssertion  // Add here
  | ...;
```

**2. Add Zod Schema**

`packages/shared/src/schema.ts`:

```typescript
const myCustomAssertionSchema = z.object({
  type: z.literal('my_custom'),
  param1: z.string(),
  param2: z.number()
});

export const assertionSchema = z.union([
  equalsAssertionSchema,
  contentContainsAssertionSchema,
  myCustomAssertionSchema,  // Add here
  // ...
]);
```

**3. Implement Assertion Logic**

`packages/cli/src/utils/assertions.ts`:

```typescript
async runAssertion(
  assertion: Assertion,
  response: LLMResponse,
  metadata: TestMetadata
): Promise<AssertionResult> {
  switch (assertion.type) {
    case 'my_custom':
      return this.assertMyCustom(assertion, response);
    // ...
  }
}

private assertMyCustom(
  assertion: MyCustomAssertion,
  response: LLMResponse
): AssertionResult {
  // Your logic here
  const passed = /* ... */;
  
  return {
    type: 'my_custom',
    passed,
    message: passed ? 'Success' : 'Failed',
    expected: assertion.param1,
    actual: /* ... */
  };
}
```

**4. Add Tests**

`packages/cli/src/utils/__tests__/assertions.test.ts`:

```typescript
describe('MyCustomAssertion', () => {
  it('should pass when condition met', () => {
    const assertion: MyCustomAssertion = {
      type: 'my_custom',
      param1: 'value',
      param2: 123
    };
    
    const result = assertionEngine.assertMyCustom(assertion, response);
    expect(result.passed).toBe(true);
  });
});
```

**5. Update Documentation**

- Add to [API Reference](API-REFERENCE.md#assertion-types)
- Add example to [TUTORIALS.md](TUTORIALS.md)

### Adding a CLI Command

**1. Create Command File**

`packages/cli/src/commands/my-command.ts`:

```typescript
import { Command } from 'commander';

export function createMyCommand() {
  return new Command('my-command')
    .description('Description of my command')
    .argument('<arg>', 'Required argument')
    .option('-o, --option <value>', 'Optional flag')
    .action(async (arg, options) => {
      // Command implementation
      console.log(`Running with ${arg} and ${options.option}`);
    });
}
```

**2. Register Command**

`packages/cli/src/index.ts`:

```typescript
import { createMyCommand } from './commands/my-command';

program.addCommand(createMyCommand());
```

**3. Add Tests**

```typescript
describe('my-command', () => {
  it('should execute successfully', async () => {
    const result = await execCommand('my-command test-arg');
    expect(result.exitCode).toBe(0);
  });
});
```

**4. Update Documentation**

Add to [API Reference](API-REFERENCE.md#cli-commands)

---

## Getting Help

- **Questions**: [GitHub Discussions](https://github.com/your-org/traceforge/discussions)
- **Bugs**: [GitHub Issues](https://github.com/your-org/traceforge/issues)
- **Chat**: Join our Discord (link in README)

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Invited to join core team (for regular contributors)

Thank you for contributing to TraceForge! 🎉
