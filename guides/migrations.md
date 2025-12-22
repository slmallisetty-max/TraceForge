# Schema Migrations

Guide to TraceForge schema versioning and migration process.

---

## Overview

TraceForge uses semantic versioning for schema changes. When trace or test file formats evolve, the schema version increments. Migrations ensure backward compatibility.

**Current Schema Version:** `1.0.0`

**Migration Support:**
- ✅ Backward compatibility maintained
- ✅ Automatic migration on load
- ✅ Non-destructive (original files preserved)
- ✅ Validation before/after migration

---

## Schema Versioning

### Version Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes (incompatible structure)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes, documentation

### Version Storage

**In trace files:**
```json
{
  "schemaVersion": "1.0.0",
  "id": "trace-123",
  "timestamp": "2025-01-15T10:30:00Z",
  ...
}
```

**In test files:**
```yaml
schemaVersion: "1.0.0"
tests:
  - name: "Test 1"
    ...
```

---

## Migration Process

### Automatic Migration

Migrations run automatically when:
1. Loading trace files with old schema versions
2. Loading test files with old schema versions
3. Running tests against old cassettes

**Example:**
```bash
# Load old trace (schema 0.9.0)
$ npx pnpm --filter @traceforge/cli start trace view old-trace-id

# Output:
⚠️  Migrating trace from schema 0.9.0 → 1.0.0
✅ Migration complete
📝 Trace details...
```

### Manual Migration

Force migration of all files:

```bash
# Migrate all traces
npx pnpm --filter @traceforge/cli start migrate traces

# Migrate all tests
npx pnpm --filter @traceforge/cli start migrate tests

# Migrate everything
npx pnpm --filter @traceforge/cli start migrate all
```

**Options:**
- `--dry-run` - Preview changes without modifying files
- `--backup` - Create backup before migration (default: true)
- `--force` - Migrate even if already current version

---

## Migration History

### Schema 1.0.0 (Current)

**Released:** 2025-01-15  
**Changes:** Initial stable release

**Trace format:**
- Added `provider` field (openai, anthropic, gemini, ollama)
- Standardized timestamp format (ISO 8601)
- Added `latency` field (milliseconds)
- Added `status` field (success, error)

**Test format:**
- Added `schemaVersion` field
- Standardized assertion types (8 types)
- Added `weight` support for assertions
- Added `tags` for test organization

### Schema 0.9.0 (Beta)

**Released:** 2024-12-01  
**Changes:** Pre-release version

**Deprecated fields:**
- `providerType` → `provider` (renamed)
- `timestamp` format (Unix epoch → ISO 8601)
- `duration` → `latency` (renamed)

**Migration from 0.9.0 to 1.0.0:**
1. Rename `providerType` to `provider`
2. Convert Unix timestamps to ISO 8601
3. Rename `duration` to `latency`
4. Add `status` field (derived from error presence)

---

## Writing Migrations

Migrations are defined in [`packages/shared/src/migrations.ts`](../packages/shared/src/migrations.ts).

### Migration Structure

```typescript
export interface Migration {
  from: string;        // Source version
  to: string;          // Target version
  description: string; // Human-readable description
  migrate: (data: any) => any;  // Migration function
  validate?: (data: any) => boolean;  // Post-migration validation
}
```

### Example Migration

```typescript
const migration_0_9_to_1_0: Migration = {
  from: '0.9.0',
  to: '1.0.0',
  description: 'Migrate from beta schema to v1.0.0',
  
  migrate: (data: any) => {
    // Rename providerType to provider
    if (data.providerType) {
      data.provider = data.providerType;
      delete data.providerType;
    }
    
    // Convert Unix timestamp to ISO 8601
    if (typeof data.timestamp === 'number') {
      data.timestamp = new Date(data.timestamp * 1000).toISOString();
    }
    
    // Rename duration to latency
    if (data.duration !== undefined) {
      data.latency = data.duration;
      delete data.duration;
    }
    
    // Add status field
    if (!data.status) {
      data.status = data.error ? 'error' : 'success';
    }
    
    // Update schema version
    data.schemaVersion = '1.0.0';
    
    return data;
  },
  
  validate: (data: any) => {
    // Ensure required fields exist
    return !!(
      data.provider &&
      data.timestamp &&
      data.latency !== undefined &&
      data.status &&
      data.schemaVersion === '1.0.0'
    );
  }
};
```

### Registering Migrations

```typescript
// packages/shared/src/migrations.ts
export const traceMigrations: Migration[] = [
  migration_0_9_to_1_0,
  // future migrations...
];

export const testMigrations: Migration[] = [
  // test file migrations...
];
```

### Migration Chain

For multi-version migrations, the system chains migrations:

```
0.9.0 → 0.9.5 → 1.0.0
      ↑       ↑
   migration migration
```

**Example:**
```typescript
// Migrate from 0.9.0 to 1.0.0
// Automatically applies: 0.9.0→0.9.5, then 0.9.5→1.0.0
const migratedData = applyMigrations(oldData, '0.9.0', '1.0.0');
```

---

## Migration API

### `applyMigrations()`

Apply migration chain to data.

```typescript
import { applyMigrations } from '@traceforge/shared';

const oldTrace = {
  schemaVersion: '0.9.0',
  providerType: 'openai',
  timestamp: 1702300800,
  duration: 1234,
  // ...
};

const newTrace = applyMigrations(oldTrace, 'trace');
// → { schemaVersion: '1.0.0', provider: 'openai', ... }
```

### `getMigrationPath()`

Get list of migrations needed.

```typescript
import { getMigrationPath } from '@traceforge/shared';

const path = getMigrationPath('0.9.0', '1.0.0', traceMigrations);
// → [{ from: '0.9.0', to: '1.0.0', ... }]
```

### `validateSchema()`

Validate data against current schema.

```typescript
import { validateSchema } from '@traceforge/shared';

const isValid = validateSchema(data, 'trace');
// → true if valid, false otherwise
```

---

## Best Practices

### 1. Always Increment Version

When modifying schemas:
- Breaking changes → Increment MAJOR
- New fields (optional) → Increment MINOR
- Bug fixes → Increment PATCH

### 2. Write Defensive Migrations

```typescript
migrate: (data: any) => {
  // Check field exists before migrating
  if (data.oldField) {
    data.newField = data.oldField;
    delete data.oldField;
  }
  
  // Provide defaults for new required fields
  data.newRequiredField = data.newRequiredField ?? 'default';
  
  return data;
}
```

### 3. Validate After Migration

```typescript
validate: (data: any) => {
  return (
    data.schemaVersion === '1.0.0' &&
    data.requiredField !== undefined &&
    typeof data.anotherField === 'string'
  );
}
```

### 4. Test Migrations

```typescript
// packages/shared/src/migrations.test.ts
describe('Migration 0.9.0 → 1.0.0', () => {
  it('should migrate providerType to provider', () => {
    const input = {
      schemaVersion: '0.9.0',
      providerType: 'openai'
    };
    
    const output = migration_0_9_to_1_0.migrate(input);
    
    expect(output.provider).toBe('openai');
    expect(output.providerType).toBeUndefined();
  });
  
  it('should convert Unix timestamp to ISO 8601', () => {
    const input = {
      schemaVersion: '0.9.0',
      timestamp: 1702300800
    };
    
    const output = migration_0_9_to_1_0.migrate(input);
    
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

### 5. Document Changes

Update [`docs/trace-format.md`](../docs/trace-format.md) and [`docs/baseline-format.md`](../docs/baseline-format.md) when schema changes.

---

## Handling Migration Failures

### Automatic Rollback

If migration fails, original file is preserved:

```bash
$ npx pnpm --filter @traceforge/cli start migrate traces

⚠️  Migrating trace-123 from 0.9.0 → 1.0.0
❌ Migration failed: Invalid timestamp format
✅ Original file preserved at .ai-tests/traces/trace-123.json.backup
```

### Manual Recovery

```bash
# Restore from backup
cp .ai-tests/traces/trace-123.json.backup .ai-tests/traces/trace-123.json

# Inspect migration error
npx pnpm --filter @traceforge/cli start migrate traces --dry-run --verbose
```

---

## Migration Status Check

### Check Current Versions

```bash
# Show schema versions of all files
npx pnpm --filter @traceforge/cli start migrate status

# Output:
Traces:
  - 45 files at schema 1.0.0 (current)
  - 3 files at schema 0.9.0 (needs migration)

Tests:
  - 10 files at schema 1.0.0 (current)

Cassettes:
  - 30 files at schema 1.0.0 (current)
```

### Migration Report

```bash
# Detailed migration report
npx pnpm --filter @traceforge/cli start migrate report --json

# Output:
{
  "traces": {
    "current": 45,
    "outdated": 3,
    "versions": {
      "1.0.0": 45,
      "0.9.0": 3
    }
  },
  "tests": {
    "current": 10,
    "outdated": 0
  }
}
```

---

## Future Schema Changes

### Planned: Schema 1.1.0

**Target:** Q2 2025

**Proposed changes:**
- Add `cost` field (API cost tracking)
- Add `tokens` object (input/output token counts)
- Add `model_version` (e.g., "gpt-4-0613")

**Migration:**
- Optional fields (backward compatible)
- Default values: `cost: 0`, `tokens: null`, `model_version: null`

### Planned: Schema 2.0.0

**Target:** Q4 2025

**Proposed changes:**
- Separate trace format for streaming vs non-streaming
- Rename `provider` to `integration` (breaking)
- Move assertions to separate file (breaking)

**Migration:**
- Auto-detect streaming traces
- Migrate `provider` → `integration`
- Extract assertions to `.assertions.yaml`

---

## FAQ

**Q: Do I need to manually migrate files?**  
A: No, migrations run automatically when loading files.

**Q: What happens if migration fails?**  
A: Original file is preserved as `.backup`. Check logs for error details.

**Q: Can I skip versions?**  
A: Yes, migrations chain automatically (e.g., 0.9.0 → 0.9.5 → 1.0.0).

**Q: How do I roll back a migration?**  
A: Restore from `.backup` file: `cp file.json.backup file.json`

**Q: Are migrations reversible?**  
A: No, migrations are forward-only. Keep backups for reverting.

**Q: Will old tests still run?**  
A: Yes, tests auto-migrate on load. VCR cassettes also migrate.

---

## Related Documentation

- [Trace Format](./trace-format.md) - Trace file structure
- [Test Format](./baseline-format.md) - Test file structure
- [Schema Types](../packages/shared/src/types.ts) - TypeScript definitions
- [Migration Code](../packages/shared/src/migrations.ts) - Implementation
