# Contributing to TraceForge

Thank you for your interest in contributing to TraceForge! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Communication](#communication)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **pnpm** 8+
- **Git**
- **OpenAI API Key** (for testing AI features)

### Finding Ways to Contribute

1. **Good First Issues** - Look for issues labeled [`good first issue`](https://github.com/slmallisetty/TraceForge.baseline/labels/good%20first%20issue)
2. **Help Wanted** - Check issues labeled [`help wanted`](https://github.com/slmallisetty/TraceForge.baseline/labels/help%20wanted)
3. **Documentation** - Improvements to docs are always welcome
4. **Bug Reports** - Report bugs using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
5. **Feature Requests** - Suggest features using our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/TraceForge.baseline.git
cd TraceForge.baseline

# Add upstream remote
git remote add upstream https://github.com/slmallisetty/TraceForge.baseline.git
```

### 2. Install Dependencies

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### 3. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your API keys
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 4. Start Development Services

```bash
# Start all services (proxy + API + UI)
pnpm dev
```

This will start:
- 🔵 Proxy: http://localhost:8787
- 🟣 API: http://localhost:3001
- 🟢 UI: http://localhost:5173

## Development Workflow

### 1. Create a Branch

```bash
# Update your fork
git checkout develop
git pull upstream develop

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test improvements
- `refactor/` - Code refactoring
- `chore/` - Build/tooling changes

### 2. Make Changes

- Write clear, concise commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test

# Run specific package tests
pnpm --filter @traceforge/proxy test
pnpm --filter @traceforge/cli test
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(proxy): add support for new AI provider"
git commit -m "fix(cli): resolve cassette loading issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(proxy): add tests for VCR mode"
```

**Commit Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting)
- `chore:` - Build/tooling changes
- `perf:` - Performance improvements

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Go to GitHub and create a Pull Request from your fork to upstream/develop
```

## Coding Standards

### TypeScript

- Use **TypeScript strict mode** (already enabled)
- Provide explicit type annotations for function parameters and return types
- Avoid `any` types; use `unknown` or proper types
- Use Zod schemas for runtime validation

```typescript
// Good ✅
function processTrace(trace: Trace): ProcessedTrace {
  return { ...trace, processed: true };
}

// Bad ❌
function processTrace(trace: any) {
  return trace;
}
```

### Code Style

- Use **ESLint** and **Prettier** (configured in project)
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line objects/arrays

```typescript
// Run linting
pnpm lint

// Auto-fix issues
pnpm lint --fix
```

### File Organization

```
packages/
├── shared/       # Shared types, schemas, utilities
├── proxy/        # Proxy server
├── cli/          # Command-line interface
├── web/          # Web UI (API + React)
└── vscode-extension/  # VS Code extension
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `vcr-manager.ts`)
- **Classes**: `PascalCase` (e.g., `VCRManager`)
- **Functions**: `camelCase` (e.g., `recordTrace`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`)
- **Interfaces/Types**: `PascalCase` (e.g., `TraceConfig`)

## Testing Guidelines

### Writing Tests

- Place tests next to source files: `feature.ts` → `feature.test.ts`
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

```typescript
import { describe, it, expect } from 'vitest';

describe('VCRManager', () => {
  it('should record trace in record mode', () => {
    // Arrange
    const vcr = new VCRManager({ mode: 'record' });
    const trace = createMockTrace();
    
    // Act
    const result = vcr.recordTrace(trace);
    
    // Assert
    expect(result.success).toBe(true);
  });
});
```

### Test Coverage

- Aim for **70%+ coverage** on new code
- Focus on critical paths and edge cases
- Test error handling

```bash
# Run tests with coverage
pnpm test --coverage
```

### Integration Tests

- Use VCR mode to replay API responses
- Test against committed cassettes
- Avoid live API calls in CI

## Submitting Changes

### Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using `Closes #123` or `Fixes #456`
3. **Request review** from maintainers
4. **Address feedback** promptly
5. **Keep PR focused** - one feature/fix per PR

### PR Checklist

Before submitting:
- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with `develop`
- [ ] CI checks passing
- [ ] Self-review completed

### Review Process

- Maintainers will review within 2-3 business days
- Address feedback in new commits (don't force push during review)
- Once approved, maintainers will merge

## Issue Guidelines

### Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md):
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs/screenshots

### Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md):
- Clear use case
- Proposed solution
- Alternatives considered
- Additional context

### Asking Questions

Use the [question template](.github/ISSUE_TEMPLATE/question.md):
- Check documentation first
- Provide context for your question
- Include relevant code snippets

## Communication

### Where to Ask Questions

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - General questions, ideas (if enabled)
- **Pull Requests** - Code-specific discussions

### Response Times

- Issues: Typically reviewed within 2-3 days
- PRs: Review within 2-3 business days
- Security issues: Within 24 hours

## Project Structure

```
traceforge/
├── packages/
│   ├── shared/              # Shared TypeScript types & Zod schemas
│   ├── proxy/               # LLM proxy server (Fastify)
│   ├── cli/                 # Command-line tool (Commander.js)
│   ├── web/                 # Web UI (Fastify API + React)
│   └── vscode-extension/    # VS Code extension
├── examples/
│   ├── strict-ci-starter/   # Production CI enforcement example
│   ├── demo-app/            # Demo application
│   └── python-demo/         # Python integration example
├── docs/                    # Technical documentation
├── guides/                  # User guides
└── .github/                 # GitHub configuration
```

## Development Tips

### Running Specific Packages

```bash
# Proxy
pnpm --filter @traceforge/proxy dev

# CLI
pnpm --filter @traceforge/cli start

# Web UI
pnpm --filter @traceforge/web dev
```

### Debugging

```bash
# Enable debug logs
DEBUG=traceforge:* pnpm dev

# VS Code launch configs available in .vscode/launch.json
```

### Common Issues

**pnpm install fails**
- Ensure you have Node.js 18+
- Clear cache: `pnpm store prune`

**Tests failing**
- Check environment variables
- Rebuild: `pnpm build`
- Clear cassettes: `pnpm --filter @traceforge/cli start vcr clean`

**TypeScript errors**
- Run `pnpm typecheck` to see all errors
- Rebuild shared package: `pnpm --filter @traceforge/shared build`

## Recognition

Contributors will be recognized in:
- Release notes
- GitHub contributors page
- Special thanks in documentation (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

**Thank you for contributing to TraceForge!** 🚀

For questions, open an issue or reach out to the maintainers.