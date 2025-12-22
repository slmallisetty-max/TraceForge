# CLI Reference

Complete command-line reference for the TraceForge CLI tool.

## Installation

The CLI is included in the monorepo:

```bash
npx pnpm --filter @traceforge/cli start <command>
```

Or install globally (future):
```bash
npm install -g @traceforge/cli
traceforge <command>
```

---

## Commands Overview

| Command | Description |
|---------|-------------|
| `init` | Initialize TraceForge in current directory |
| `start` | Start proxy and web services |
| `trace list` | List all captured traces |
| `trace view <id>` | View a specific trace |
| `test list` | List all tests |
| `test create-from-trace <id>` | Create test from trace |
| `test run [file]` | Run tests |
| `vcr status` | Show VCR mode status |
| `vcr list` | List all cassettes |
| `vcr clean` | Delete all cassettes |

---

## `init` - Initialize Project

Initialize TraceForge configuration in the current directory.

```bash
npx pnpm --filter @traceforge/cli start init
```

**What it does:**
- Creates `.ai-tests/` directory
- Creates `config.yaml` with defaults
- Creates `traces/` and `tests/` subdirectories

**Example output:**
```
✅ Created .ai-tests/ directory
✅ Created config.yaml
✅ Created traces/ directory
✅ Created tests/ directory

🎉 TraceForge initialized! Run 'start' to begin.
```

---

## `start` - Start Services

Start the proxy server and web UI.

```bash
npx pnpm --filter @traceforge/cli start start
```

**Options:**
- `--proxy-only` - Start only the proxy server
- `--web-only` - Start only the web UI
- `--port <number>` - Override proxy port (default: 8787)

**Example:**
```bash
# Start both services
npx pnpm --filter @traceforge/cli start start

# Start only proxy
npx pnpm --filter @traceforge/cli start start --proxy-only
```

---

## `trace` - Trace Management

### `trace list`

List all captured traces with filtering options.

```bash
npx pnpm --filter @traceforge/cli start trace list [options]
```

**Options:**
- `--filter <text>` - Filter by model, endpoint, or content
- `--limit <number>` - Limit results (default: 50)
- `--json` - Output as JSON
- `--status <status>` - Filter by status: `success` | `error`
- `--since <date>` - Show traces since date (YYYY-MM-DD)

**Example:**
```bash
# List all traces
npx pnpm --filter @traceforge/cli start trace list

# Filter by model
npx pnpm --filter @traceforge/cli start trace list --filter "gpt-4"

# Show only errors
npx pnpm --filter @traceforge/cli start trace list --status error
```

**Output:**
```
ID                                   Timestamp            Model      Status  Duration
abc123...                            2025-12-22 14:30:15  gpt-4      success 1234ms
def456...                            2025-12-22 14:31:20  claude-3   success 2100ms

Total: 2 traces
```

### `trace view <id>`

View detailed information about a specific trace.

```bash
npx pnpm --filter @traceforge/cli start trace view <trace-id>
```

**Options:**
- `--json` - Output as JSON
- `--no-color` - Disable color output

**Example:**
```bash
npx pnpm --filter @traceforge/cli start trace view abc123
```

---

## `test` - Test Management

### `test list`

List all test files.

```bash
npx pnpm --filter @traceforge/cli start test list
```

**Output:**
```
Name                    File                  Assertions
test-chat-completion    chat-test.yaml        3
test-embeddings         embed-test.yaml       2

Total: 2 tests
```

### `test create-from-trace <id>`

Create a test from an existing trace.

```bash
npx pnpm --filter @traceforge/cli start test create-from-trace <trace-id> [options]
```

**Options:**
- `--name <name>` - Test name (default: auto-generated)
- `--output <file>` - Output file path (default: `.ai-tests/tests/<name>.yaml`)
- `--assertions <types>` - Comma-separated assertion types to include

**Example:**
```bash
# Basic usage
npx pnpm --filter @traceforge/cli start test create-from-trace abc123

# With custom name
npx pnpm --filter @traceforge/cli start test create-from-trace abc123 --name my-test

# Specific assertions
npx pnpm --filter @traceforge/cli start test create-from-trace abc123 --assertions exact,latency
```

### `test run [file]`

Run one or all tests.

```bash
npx pnpm --filter @traceforge/cli start test run [file] [options]
```

**Options:**
- `--json` - Output results as JSON
- `--junit <path>` - Generate JUnit XML report
- `--parallel` - Run tests in parallel (default: true)
- `--sequential` - Run tests sequentially
- `--concurrency <number>` - Max parallel tests (default: 5)
- `--watch` - Watch mode - rerun on file changes
- `--tag <tags...>` - Run tests with specific tags
- `--no-progress` - Disable progress bar
- `--timeout <ms>` - Test timeout in milliseconds (default: 30000)

**Examples:**
```bash
# Run all tests
npx pnpm --filter @traceforge/cli start test run

# Run specific test
npx pnpm --filter @traceforge/cli start test run my-test.yaml

# Parallel with concurrency
npx pnpm --filter @traceforge/cli start test run --parallel --concurrency 10

# Watch mode
npx pnpm --filter @traceforge/cli start test run --watch

# Generate JUnit XML
npx pnpm --filter @traceforge/cli start test run --junit results.xml

# Filter by tags
npx pnpm --filter @traceforge/cli start test run --tag smoke integration

# With VCR replay
TRACEFORGE_VCR_MODE=replay npx pnpm --filter @traceforge/cli start test run
```

**Output:**
```
Running 3 tests in parallel (concurrency: 5)...

✓ test-chat-completion (1.2s)
✓ test-embeddings (0.8s)
✗ test-error-case (2.1s)

Results:
  Passed: 2
  Failed: 1
  Duration: 2.1s
```

---

## `vcr` - VCR Mode Commands

### `vcr status`

Show current VCR mode configuration and statistics.

```bash
npx pnpm --filter @traceforge/cli start vcr status
```

**Output:**
```
VCR Mode: auto
Match Mode: fuzzy
Cassettes Directory: .ai-tests/cassettes/

Statistics:
  Total Cassettes: 45
  By Provider:
    - openai: 30
    - anthropic: 10
    - gemini: 5
  Disk Usage: 2.3 MB
```

### `vcr list`

List all recorded cassettes.

```bash
npx pnpm --filter @traceforge/cli start vcr list [options]
```

**Options:**
- `--provider <name>` - Filter by provider (openai, anthropic, gemini)
- `--json` - Output as JSON

**Example:**
```bash
# List all cassettes
npx pnpm --filter @traceforge/cli start vcr list

# Filter by provider
npx pnpm --filter @traceforge/cli start vcr list --provider openai
```

**Output:**
```
Provider  Signature                                 Size    Created
openai    a1b2c3d4e5f6...                          45 KB   2025-12-22 14:30
anthropic f6e5d4c3b2a1...                          67 KB   2025-12-22 14:35

Total: 2 cassettes
```

### `vcr clean`

Delete all cassettes.

```bash
npx pnpm --filter @traceforge/cli start vcr clean [options]
```

**Options:**
- `--yes` - Skip confirmation prompt
- `--provider <name>` - Delete only specific provider's cassettes

**Example:**
```bash
# Clean all (with prompt)
npx pnpm --filter @traceforge/cli start vcr clean

# Clean all (skip prompt)
npx pnpm --filter @traceforge/cli start vcr clean --yes

# Clean specific provider
npx pnpm --filter @traceforge/cli start vcr clean --provider openai --yes
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Test failure |
| 4 | Network error |
| 5 | File system error |

---

## Environment Variables

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete list.

**Common variables:**
- `TRACEFORGE_VCR_MODE` - VCR mode: `off` | `record` | `replay` | `auto`
- `TRACEFORGE_CONFIG_DIR` - Config directory (default: `.ai-tests`)
- `TRACEFORGE_TRACES_DIR` - Traces directory (default: `.ai-tests/traces`)
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GEMINI_API_KEY` - Google Gemini API key

---

## Error Messages

### "API key not found"
```
Error: API key not found in environment variable: OPENAI_API_KEY
```
**Solution**: Set the required API key environment variable.

### "Config file not found"
```
Error: Config file not found: .ai-tests/config.yaml
```
**Solution**: Run `npx pnpm --filter @traceforge/cli start init` to initialize.

### "Trace not found"
```
Error: Trace not found: abc123
```
**Solution**: Verify the trace ID using `trace list`.

---

## Related Documentation

- [Getting Started](./getting-started.md) - Quick start guide
- [Test Format](./baseline-format.md) - Test file structure
- [Assertions](./assertions.md) - Assertion types reference
- [VCR Usage](./VCR_USAGE.md) - VCR mode guide
