# Backup and Restore Procedures

## Overview

This document describes backup and restore procedures for TraceForge data, including both file-based and SQLite storage backends.

## RTO/RPO Targets

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 24 hours

Meeting these targets requires automated backups running at least daily.

## File Storage Backup

### Manual Backup

Create `scripts/backup-traces.sh`:
```bash
#!/bin/bash
BACKUP_DIR="${TRACEFORGE_BACKUP_DIR:-/backups/traceforge}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SOURCE_DIR="${TRACEFORGE_DATA_DIR:-.ai-tests}"

mkdir -p "$BACKUP_DIR"
tar -czf "${BACKUP_DIR}/traces-${TIMESTAMP}.tar.gz" \
  "$SOURCE_DIR/traces" \
  "$SOURCE_DIR/cassettes" \
  "$SOURCE_DIR/tests"

echo "Backup completed: ${BACKUP_DIR}/traces-${TIMESTAMP}.tar.gz"
```

### Automated Backup (Cron)

```bash
# Backup TraceForge data daily at 2 AM
0 2 * * * /path/to/scripts/backup-traces.sh
```

## SQLite Backup

```bash
#!/bin/bash
BACKUP_DIR="${TRACEFORGE_BACKUP_DIR:-/backups/traceforge}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_PATH="${TRACEFORGE_SQLITE_PATH:-.ai-tests/traces.db}"

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/traces-${TIMESTAMP}.db'"
gzip "${BACKUP_DIR}/traces-${TIMESTAMP}.db"
```

## Restore Procedures

### File Storage
```bash
tar -xzf backup-file.tar.gz -C .ai-tests/
```

### SQLite
```bash
gunzip -c backup-file.db.gz > .ai-tests/traces.db
sqlite3 .ai-tests/traces.db "PRAGMA integrity_check;"
```

## Disaster Recovery

### Scenario 1: Accidental Deletion
**RTO:** 15 min | **RPO:** Last backup

1. Stop services
2. Restore from backup
3. Verify integrity
4. Restart services

### Scenario 2: Database Corruption
**RTO:** 30 min | **RPO:** Last backup

1. Stop services
2. Check integrity: `PRAGMA integrity_check`
3. Restore from backup
4. Restart services

---

**Owner:** SRE Team  
**Review:** Quarterly
