# Getting Started with TraceForge

**TraceForge is the execution record & replay layer for AI systems.**

This guide shows you how to:

1. Record AI executions
2. Create verification rules
3. Enforce reproducibility in CI

---

## Quick Start

### 1. Install Dependencies

```bash
npx pnpm install
```

### 2. Start the Replay Engine

```bash
npx pnpm dev
```

This starts:

- Replay Engine (port 8787) - Intercepts AI calls
- Execution Inspector (port 5173) - Browse execution history

### 3. Configure Your Application

Point your app to the replay engine:

```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=your-key
```

### 4. Record Your First Execution

```bash
# Enable recording mode
export TRACEFORGE_VCR_MODE=record

# Run your application
npm start
```

Execution snapshots are saved to `.ai-tests/cassettes/`

---

## Core Workflow

### Step 1: Record Execution Snapshots

```bash
TRACEFORGE_VCR_MODE=record npm start
```

All AI interactions are captured with full request/response data.

### Step 2: Create Verification Rules

```bash
npx pnpm --filter @traceforge/cli start test create-from-trace <trace-id>
```

This generates a `.yaml` test file with assertions.

### Step 3: Verify Locally

```bash
TRACEFORGE_VCR_MODE=replay npm test
```

Tests replay from snapshots (no live API calls).

### Step 4: Commit Snapshots

```bash
git add .ai-tests/
git commit -m "Add execution snapshots for feature X"
```

### Step 5: Enforce in CI

```yaml
# .github/workflows/ci.yml
env:
  TRACEFORGE_VCR_MODE: strict # ← Hard fail on missing snapshots

steps:
  - run: npm test
```

Now your CI **cannot pass** without committed execution snapshots.

---

## Features Now Active

### ✅ Automatic Redaction

Traces automatically redact:

- API keys and tokens
- Authorization headers
- Email addresses
- Phone numbers
- Credit card numbers
- SSNs

**No configuration needed** - it's secure by default!

### ✅ Pre-commit Protection

Git will block commits containing:

- `.ai-tests/traces/` files
- Any `trace-*.json` files
- Files matching `*.trace.json`

To commit traces intentionally (not recommended):

```bash
git commit --no-verify
```

### ✅ Schema Versioning

All new traces include:

```json
{
  "schema_version": "1.0.0",
  ...
}
```

Old traces are automatically migrated when read.

### ✅ CI/CD Pipeline

Push to GitHub to trigger:

- Linting and type checking
- Build verification
- Unit tests
- Integration smoke test
- Multi-platform testing (Ubuntu, Windows, macOS)

## Testing the Features

### Test Automatic Redaction

1. Start the proxy:

   ```bash
   npx pnpm dev
   ```

2. Make a request with sensitive data:

   ```bash
   curl -X POST http://localhost:8787/v1/chat/completions \
     -H "Authorization: Bearer sk-test-my-secret-key" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gpt-4",
       "messages": [
         {"role": "user", "content": "Test with email: user@example.com"}
       ]
     }'
   ```

3. Check the saved trace:

   ```bash
   cat .ai-tests/traces/*.json
   ```

   You should see:

   - `"authorization": "[REDACTED]"`
   - Email replaced with `[REDACTED]`

### Test Pre-commit Hook

1. Try to stage a trace file:

   ```bash
   git add .ai-tests/traces/*.json
   ```

2. Try to commit:

   ```bash
   git commit -m "test commit"
   ```

3. You should see a warning and the commit should be blocked.

### Test Schema Versioning

```typescript
import { migrateTrace, needsMigration } from "@traceforge/shared";

// Load an old trace
const oldTrace = require("./.ai-tests/traces/old-trace.json");

// Check if it needs migration
if (needsMigration(oldTrace)) {
  console.log("Trace needs migration");

  // Migrate it
  const { trace, result } = migrateTrace(oldTrace);

  console.log("Migrated from", result.originalVersion, "to", result.newVersion);
  console.log("Warnings:", result.warnings);
}
```

## Configuration

### Custom Redaction Rules

Create or edit `traceforge.config.json`:

```json
{
  "redact_fields": [
    "Authorization",
    "X-API-Key",
    "custom_secret",
    "internal_token"
  ],
  "max_trace_retention": 30,
  "proxy_port": 8787,
  "save_traces": true
}
```

### Disable Redaction (Not Recommended)

In your code:

```typescript
import { Redactor } from "./redaction";

const redactor = new Redactor({ enabled: false });
```

## Troubleshooting

### Pre-commit Hook Not Running

```bash
# Reinstall hooks
rm -rf .husky
npx pnpm prepare

# Make hook executable (Linux/Mac)
chmod +x .husky/pre-commit
```

### Redaction Not Working

```bash
# Rebuild proxy package
cd packages/proxy
npx pnpm build

# Verify redaction module exists
ls dist/redaction.js
```

### CI Failing

Common issues:

- **Linting errors**: Run `npx pnpm lint` locally to fix
- **Type errors**: Run `npx pnpm typecheck` to see issues
- **Build failures**: Run `npx pnpm build` and fix errors

### Old Traces Not Migrating

```bash
# Manually migrate all traces
node scripts/migrate-traces.js  # (you'd need to create this)
```

Or programmatically:

```typescript
import { migrateTraces } from "@traceforge/shared";
import { readdir, readFile, writeFile } from "fs/promises";

const traceDir = ".ai-tests/traces";
const files = await readdir(traceDir);

for (const file of files) {
  if (file.endsWith(".json")) {
    const content = await readFile(`${traceDir}/${file}`, "utf-8");
    const trace = JSON.parse(content);

    const { trace: migrated } = migrateTrace(trace);

    await writeFile(`${traceDir}/${file}`, JSON.stringify(migrated, null, 2));
  }
}
```

## Best Practices

### 1. Review Traces Before Sharing

Even with redaction:

```bash
# Check a trace
cat .ai-tests/traces/latest-trace.json | grep -i "REDACTED"

# Search for potential leaks
rg -i "sk-|password|secret" .ai-tests/traces/
```

### 2. Set Retention Limits

In `traceforge.config.json`:

```json
{
  "max_trace_retention": 30 // Keep traces for 30 days
}
```

### 3. Use Environment Variables

Never hardcode API keys:

```bash
# .env
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key
```

```javascript
// In code
const apiKey = process.env.OPENAI_API_KEY;
```

### 4. Tag Tests Appropriately

```yaml
tests:
  - name: "Critical auth test"
    tags:
      - smoke
      - critical
      - security
```

### 5. Use CI for All PRs

Enable GitHub Actions in repository settings:

- Settings → Actions → Allow all actions

## Documentation Links

- [Trace Format](./trace-format.md) - Complete trace schema
- [Baseline Format](./baseline-format.md) - Test and assertion format
- [Security Policy](../SECURITY.md) - Security best practices
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute

## Getting Help

- **Issues**: Create a GitHub issue with bug report template
- **Questions**: Use the question template
- **Security**: Email security@traceforge.dev (or use private advisory)
- **Contributions**: See CONTRIBUTING.md

## Next Steps

1. **Write Tests**: Create baseline files in `.ai-tests/baselines/`
2. **Run Tests**: Use `npx pnpm --filter @traceforge/cli test`
3. **Review Traces**: Check `.ai-tests/traces/` for captured data
4. **Enable CI**: Push to GitHub and monitor Actions
5. **Document**: Update README with your use cases

## Rollback (If Needed)

If you encounter issues:

```bash
# Remove hooks
rm -rf .husky
npm uninstall husky lint-staged

# Restore old package.json
git checkout HEAD -- package.json

# Rebuild
npx pnpm install
npx pnpm build
```

The redaction and versioning features are in the code, so you'd need to:

- Revert `packages/proxy/src/storage.ts`
- Revert `packages/shared/src/schema.ts`

But we recommend keeping these security features!

---

**Welcome to the hardened TraceForge.baseline!** 🔒🚀
