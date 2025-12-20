# Contributing to TraceForge.baseline

Thank you for your interest in contributing to TraceForge.baseline! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node.js version, etc.)
- Relevant logs or screenshots

### Suggesting Features

We welcome feature suggestions! Please create an issue with:
- Clear use case description
- Why this feature would be useful
- Proposed implementation approach (optional)

### Security Vulnerabilities

**Do not** report security vulnerabilities through public GitHub issues. Please see our [Security Policy](SECURITY.md) for responsible disclosure.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+

### Local Development

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/TraceForge.baseline.git
   cd TraceForge.baseline
   ```

2. **Install dependencies**
   ```bash
   npx pnpm install
   ```

3. **Build all packages**
   ```bash
   npx pnpm build
   ```

4. **Run in development mode**
   ```bash
   npx pnpm dev
   ```

   This starts:
   - Proxy server on port 8787
   - Web UI on port 5173
   - Web API on port 3001

5. **Run tests**
   ```bash
   npx pnpm test
   ```

6. **Type checking**
   ```bash
   npx pnpm typecheck
   ```

7. **Linting**
   ```bash
   npx pnpm lint
   ```

## Project Structure

```
packages/
├── cli/           - Command-line interface
├── proxy/         - Multi-provider proxy server
├── shared/        - Shared types and schemas
├── vscode-extension/ - VS Code extension
└── web/           - React-based web interface
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Prefer explicit types over `any`
- Use Zod schemas for runtime validation

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Commits

- Write clear, descriptive commit messages
- Use conventional commits format:
  ```
  feat: add streaming support for Gemini
  fix: resolve authorization header leak
  docs: update API documentation
  test: add unit tests for redaction
  refactor: simplify provider detection
  ```

### Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and commit them

3. Push to your fork:
   ```bash
   git push origin feat/my-feature
   ```

4. Open a Pull Request with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to any related issues
   - Screenshots for UI changes
   - Test results

5. Respond to review feedback

## Testing Guidelines

- Write tests for new features
- Ensure existing tests pass
- Add integration tests for provider changes
- Test with multiple providers when applicable
- Use mocked responses for CI tests

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update CHANGELOG.md for notable changes
- Add examples for new features

## Sensitive Data & Security

**Important**: When working with traces:

- Never commit real API keys or sensitive data
- Test redaction features thoroughly
- Use mock data in examples
- Be mindful of PII in test traces

## Package-Specific Guidelines

### packages/proxy
- Test with all supported providers
- Ensure streaming works correctly
- Validate redaction of sensitive headers
- Test error handling

### packages/web
- Ensure UI is responsive
- Test with large trace files
- Verify dark mode compatibility
- Check accessibility

### packages/cli
- Update help text for new commands
- Test on Windows, macOS, and Linux
- Ensure JUnit output is valid
- Test watch mode behavior

### packages/vscode-extension
- Follow VS Code extension guidelines
- Test in VS Code stable and insiders
- Update package.json for new commands
- Test TreeView interactions

## Getting Help

- Create an issue for bugs or questions
- Join discussions in GitHub Discussions (if available)
- Check existing issues and documentation first

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- CHANGELOG.md for significant contributions
- README.md acknowledgments section

Thank you for contributing to TraceForge.baseline! 🚀
