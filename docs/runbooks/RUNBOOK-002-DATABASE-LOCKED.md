# RUNBOOK-002: SQLite Database Locked Error

## Symptoms
- Error: `database is locked`
- Write operations timing out
- Proxy responding slowly or timing out

## Diagnosis

### Check database state
```bash
# Check if database is accessible
sqlite3 .ai-tests/traces.db "SELECT COUNT(*) FROM traces;"

# Check for WAL mode
sqlite3 .ai-tests/traces.db "PRAGMA journal_mode;"

# Check for active connections
lsof .ai-tests/traces.db
```

### Check logs
```bash
grep "database is locked" packages/proxy/logs/error.log
```

## Resolution

### Immediate Fix

#### Option 1: Enable WAL Mode (Recommended)
```bash
sqlite3 .ai-tests/traces.db "PRAGMA journal_mode=WAL;"
sqlite3 .ai-tests/traces.db "PRAGMA journal_mode;" # Verify
```

#### Option 2: Increase Timeout
```bash
# In packages/proxy/src/storage-sqlite.ts
db.pragma('busy_timeout = 5000'); // 5 seconds
```

#### Option 3: Kill Blocking Process
```bash
# Find processes with database open
lsof .ai-tests/traces.db

# Kill if necessary (be careful!)
kill <PID>

# Restart proxy
pnpm --filter @traceforge/proxy start
```

### Long-term Fix

Update `packages/proxy/src/storage-sqlite.ts`:

```typescript
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
```

## Prevention

1. **Always use WAL mode** for concurrent access
2. **Set appropriate timeouts** (5-10 seconds)
3. **Implement connection pooling** for high load
4. **Monitor lock wait times** with metrics

## Verification

```bash
# Check WAL mode is active
sqlite3 .ai-tests/traces.db "PRAGMA journal_mode;"
# Should output: wal

# Run concurrent write test
# See: packages/proxy/src/storage-sqlite.test.ts
pnpm --filter @traceforge/proxy test storage-sqlite
```

## Escalation

If database continues to lock frequently:
1. Check for slow queries (add query logging)
2. Review transaction size (break up large transactions)
3. Consider PostgreSQL migration for very high load
4. Contact: Backend Team

**Severity:** P2 (High)  
**Expected Resolution Time:** < 30 minutes
