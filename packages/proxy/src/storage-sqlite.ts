import Database from "better-sqlite3";
import { resolve } from "path";
import type { Trace, Test, StorageBackend, ListOptions } from "@traceforge/shared";
import { redactTrace } from "./redaction.js";

export class SQLiteStorageBackend implements StorageBackend {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || resolve(process.cwd(), ".ai-tests/traces.db");
    this.db = new Database(path);
    this.initSchema();
  }

  private initSchema() {
    // Create traces table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        request JSON NOT NULL,
        response JSON,
        metadata JSON NOT NULL,
        schema_version TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      
      CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_traces_model ON traces(json_extract(metadata, '$.model'));
      CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(json_extract(metadata, '$.status'));
      CREATE INDEX IF NOT EXISTS idx_traces_created ON traces(created_at DESC);
    `);

    // Create tests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trace_id TEXT,
        request JSON NOT NULL,
        assertions JSON NOT NULL,
        created_at TEXT NOT NULL,
        fixtures JSON,
        tags JSON,
        timeout INTEGER,
        policy_contracts JSON
      );
      
      CREATE INDEX IF NOT EXISTS idx_tests_name ON tests(name);
      CREATE INDEX IF NOT EXISTS idx_tests_created ON tests(created_at DESC);
    `);
  }

  async saveTrace(trace: Trace): Promise<void> {
    // Redact before saving
    const redacted = redactTrace(trace);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO traces (id, timestamp, endpoint, request, response, metadata, schema_version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      redacted.id,
      redacted.timestamp,
      redacted.endpoint,
      JSON.stringify(redacted.request),
      redacted.response ? JSON.stringify(redacted.response) : null,
      JSON.stringify(redacted.metadata),
      redacted.schema_version || "1.0.0"
    );
  }

  async getTrace(id: string): Promise<Trace | null> {
    const stmt = this.db.prepare("SELECT * FROM traces WHERE id = ?");
    const row: any = stmt.get(id);

    if (!row) return null;

    return {
      id: row.id,
      timestamp: row.timestamp,
      endpoint: row.endpoint,
      request: JSON.parse(row.request),
      response: row.response ? JSON.parse(row.response) : null,
      metadata: JSON.parse(row.metadata),
      schema_version: row.schema_version,
    };
  }

  async listTraces(options: ListOptions = {}): Promise<Trace[]> {
    const {
      limit = 100,
      offset = 0,
      sortBy = "timestamp",
      sortOrder = "desc",
      filter = {},
    } = options;

    let query = "SELECT * FROM traces WHERE 1=1";
    const params: any[] = [];

    // Apply filters
    if (filter.model) {
      query += ' AND json_extract(metadata, "$.model") = ?';
      params.push(filter.model);
    }

    if (filter.status) {
      query += ' AND json_extract(metadata, "$.status") = ?';
      params.push(filter.status);
    }

    if (filter.dateFrom) {
      query += " AND timestamp >= ?";
      params.push(filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query += " AND timestamp <= ?";
      params.push(filter.dateTo.toISOString());
    }

    // Apply sorting
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const rows: any[] = stmt.all(...params);

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      endpoint: row.endpoint,
      request: JSON.parse(row.request),
      response: row.response ? JSON.parse(row.response) : null,
      metadata: JSON.parse(row.metadata),
      schema_version: row.schema_version,
    }));
  }

  async deleteTrace(id: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM traces WHERE id = ?");
    stmt.run(id);
  }

  async countTraces(): Promise<number> {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM traces");
    const row: any = stmt.get();
    return row.count;
  }

  async cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number> {
    let deleted = 0;

    // Delete by age
    if (maxAgeSeconds) {
      const cutoff = Date.now() / 1000 - maxAgeSeconds;
      const stmt = this.db.prepare("DELETE FROM traces WHERE created_at < ?");
      const result = stmt.run(cutoff);
      deleted += result.changes;
    }

    // Delete by count (keep only newest N)
    if (maxCount) {
      const stmt = this.db.prepare(`
        DELETE FROM traces WHERE id IN (
          SELECT id FROM traces 
          ORDER BY created_at DESC 
          LIMIT -1 OFFSET ?
        )
      `);
      const result = stmt.run(maxCount);
      deleted += result.changes;
    }

    // Vacuum to reclaim space
    if (deleted > 0) {
      this.db.exec("VACUUM");
    }

    return deleted;
  }

  async saveTest(test: Test): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tests (id, name, description, trace_id, request, assertions, created_at, fixtures, tags, timeout, policy_contracts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      test.id,
      test.name,
      test.description || null,
      test.trace_id || null,
      JSON.stringify(test.request),
      JSON.stringify(test.assertions),
      test.created_at,
      test.fixtures ? JSON.stringify(test.fixtures) : null,
      test.tags ? JSON.stringify(test.tags) : null,
      test.timeout || null,
      test.policy_contracts ? JSON.stringify(test.policy_contracts) : null
    );
  }

  async getTest(id: string): Promise<Test | null> {
    const stmt = this.db.prepare("SELECT * FROM tests WHERE id = ?");
    const row: any = stmt.get(id);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trace_id: row.trace_id,
      request: JSON.parse(row.request),
      assertions: JSON.parse(row.assertions),
      created_at: row.created_at,
      fixtures: row.fixtures ? JSON.parse(row.fixtures) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      timeout: row.timeout,
      policy_contracts: row.policy_contracts
        ? JSON.parse(row.policy_contracts)
        : undefined,
    };
  }

  async listTests(options: ListOptions = {}): Promise<Test[]> {
    const { limit = 100, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT * FROM tests 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);

    const rows: any[] = stmt.all(limit, offset);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      trace_id: row.trace_id,
      request: JSON.parse(row.request),
      assertions: JSON.parse(row.assertions),
      created_at: row.created_at,
      fixtures: row.fixtures ? JSON.parse(row.fixtures) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      timeout: row.timeout,
      policy_contracts: row.policy_contracts
        ? JSON.parse(row.policy_contracts)
        : undefined,
    }));
  }

  async deleteTest(id: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM tests WHERE id = ?");
    stmt.run(id);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
