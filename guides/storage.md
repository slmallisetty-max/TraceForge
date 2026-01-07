# Storage Guide

TraceForge supports multiple storage backends for traces and tests. This guide covers storage configuration, full-text search, and performance considerations.

## Storage Backends

### File Storage (Default)

The file-based storage backend stores each trace as a separate JSON file in `.ai-tests/traces/`.

**Pros:**
- Simple and reliable
- Human-readable format
- Easy to inspect and debug
- No database setup required

**Cons:**
- Slower for large trace volumes (>1000 traces)
- No full-text search capabilities
- Limited querying options

**Configuration:**
```bash
TRACEFORGE_STORAGE_BACKEND=file
```

### SQLite Storage

The SQLite storage backend uses a single database file for all traces, enabling advanced features like full-text search.

**Pros:**
- Fast queries with indexing
- Full-text search with FTS5
- Efficient for large trace volumes
- Automatic index maintenance

**Cons:**
- Requires better-sqlite3 native module
- Binary database format (not human-readable)

**Configuration:**
```bash
TRACEFORGE_STORAGE_BACKEND=sqlite
TRACEFORGE_SQLITE_PATH=.ai-tests/traces.db
TRACEFORGE_FTS5_ENABLED=true
```

## Full-Text Search

TraceForge supports lightning-fast full-text search across all traces using SQLite FTS5. This enables you to quickly find traces containing specific keywords, error messages, or API interactions.

### Prerequisites

Full-text search requires the SQLite storage backend:

```bash
# .env
TRACEFORGE_STORAGE_BACKEND=sqlite
TRACEFORGE_FTS5_ENABLED=true
```

### Search Query Syntax

#### Simple Search

Search for a single keyword across all trace content:

```bash
traceforge trace search "authentication"
```

#### Boolean Operators

Combine search terms with AND, OR, and NOT:

```bash
# AND operator (implicit)
traceforge trace search "user login"

# OR operator
traceforge trace search "error OR failure"

# NOT operator
traceforge trace search "authentication NOT success"

# Combined
traceforge trace search "(authentication OR authorization) AND error"
```

#### Phrase Queries

Search for exact phrases using quotes:

```bash
traceforge trace search '"invalid credentials"'
traceforge trace search '"rate limit exceeded"'
```

#### Special Characters

Terms with special characters (like hyphens) are automatically quoted:

```bash
# Automatically searches for exact phrase
traceforge trace search "gpt-4"
traceforge trace search "claude-3-opus"
```

### Filters

Narrow search results with additional filters:

```bash
# Filter by model
traceforge trace search "error" --model gpt-4

# Filter by status
traceforge trace search "timeout" --status error

# Limit results
traceforge trace search "authentication" --limit 10

# Combine filters
traceforge trace search "error" --model gpt-4 --status error --limit 20
```

### CLI Usage

```bash
# Basic search
traceforge trace search "authentication error"

# Search with filters
traceforge trace search "error" --model gpt-4 --status error

# Limit results
traceforge trace search "timeout" --limit 5
```

### Programmatic Usage

```typescript
import { SQLiteStorageBackend } from '@traceforge/proxy/storage-sqlite';

const storage = new SQLiteStorageBackend();

// Search for traces
const results = await storage.searchTraces('authentication error', {
  limit: 50,
  offset: 0,
  filterModel: 'gpt-4',
  filterStatus: 'error'
});

// Count total results
const total = await storage.countSearchResults('authentication');

// Get search suggestions (autocomplete)
const suggestions = await storage.getSearchSuggestions('gpt');
// Returns: ['gpt-4', 'gpt-3.5-turbo']
```

### Web UI Search

The TraceForge web UI includes a search interface:

1. Navigate to the search page
2. Enter your search query
3. View matching traces with relevance ranking
4. Click on a trace to view details

### Search Performance

FTS5 is highly optimized for search performance:

| Trace Count | Search Time |
|-------------|-------------|
| 10,000      | < 10ms      |
| 100,000     | < 50ms      |
| 1,000,000   | < 200ms     |

**Index maintenance:**
- Automatic via triggers (no manual rebuild needed)
- Index size: ~20-30% of database size
- Updates synchronized on INSERT/UPDATE/DELETE

### BM25 Relevance Ranking

Search results are ranked by relevance using the BM25 algorithm:
- More relevant results appear first
- Multiple occurrences increase relevance
- Shorter documents with matches rank higher

Example:
```typescript
// Trace with "error error error error" ranks higher than "error"
const results = await storage.searchTraces('error');
// results[0] contains more "error" mentions
```

### Best Practices

1. **Use specific terms:** "authentication failed" > "error"
2. **Combine filters:** Use model/status filters to narrow results
3. **Phrase queries for exact matches:** Use quotes for multi-word phrases
4. **Boolean operators:** Combine terms with AND/OR/NOT
5. **Test your queries:** Use the CLI to test complex searches

### Searchable Fields

FTS5 indexes the following fields:
- **Request content:** Messages sent to the LLM
- **Response content:** LLM response text
- **Endpoint:** API endpoint (e.g., `/v1/chat/completions`)
- **Model:** LLM model name (e.g., `gpt-4`)

### Migration

When you enable SQLite storage on an existing project with file-based traces, the FTS5 index will be automatically populated during the first migration. No manual intervention required.

```bash
# Switch to SQLite
TRACEFORGE_STORAGE_BACKEND=sqlite

# Start the server (migration runs automatically)
pnpm dev
```

The migration:
1. Creates FTS5 virtual table
2. Sets up automatic triggers
3. Populates index with existing traces
4. All future traces are indexed automatically

## Performance Tips

### SQLite Storage

- Keep database file on SSD for best performance
- Regular VACUUM operations for space reclamation (handled automatically)
- Use appropriate filters to reduce result sets
- Monitor database size with `.ai-tests/traces.db`

### File Storage

- Limit trace count with retention policies
- Use date-based cleanup to remove old traces
- Consider switching to SQLite for >1000 traces

## Storage Migration

### File to SQLite

To migrate from file storage to SQLite:

1. Update configuration:
   ```bash
   TRACEFORGE_STORAGE_BACKEND=sqlite
   ```

2. Restart the server (automatic migration)

3. Verify migration:
   ```bash
   # Check trace count
   traceforge trace list --limit 1
   
   # Test search
   traceforge trace search "test"
   ```

### SQLite to File

SQLite to file migration is not currently supported. If needed, export traces programmatically.

## Troubleshooting

### Search Not Working

**Error:** "Full-text search not supported with current storage backend"

**Solution:** Enable SQLite storage backend:
```bash
TRACEFORGE_STORAGE_BACKEND=sqlite
```

### Native Module Error

**Error:** "Cannot find module 'better-sqlite3'"

**Solution:** Reinstall dependencies:
```bash
pnpm install
pnpm approve-builds  # Approve better-sqlite3 build
```

### Slow Search Performance

**Issue:** Search takes longer than expected

**Solutions:**
1. Check database file location (should be on SSD)
2. Verify FTS5 index exists: `SELECT * FROM sqlite_master WHERE type='table' AND name='traces_fts'`
3. Reduce result set with filters
4. Consider database optimization: `VACUUM` and `ANALYZE`

## Example Searches

```bash
# Find authentication errors
traceforge trace search "authentication error"

# Find GPT-4 failures
traceforge trace search "error" --model gpt-4 --status error

# Find timeout issues
traceforge trace search "timeout OR timed out"

# Find API rate limits
traceforge trace search '"rate limit exceeded"'

# Find specific API calls
traceforge trace search "chat/completions AND gpt-4"

# Boolean search
traceforge trace search "authentication AND (error OR failure)"
```

## API Reference

See [API Documentation](./API.md) for full API details on storage backends and search endpoints.
