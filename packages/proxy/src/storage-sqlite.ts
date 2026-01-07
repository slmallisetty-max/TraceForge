import Database from "better-sqlite3";
import { resolve } from "path";
import type {
  Trace,
  Test,
  StorageBackend,
  ListOptions,
  SessionMetadata,
} from "@traceforge/shared";
import { redactTrace } from "./redaction.js";

export class SQLiteStorageBackend implements StorageBackend {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || resolve(process.cwd(), ".ai-tests/traces.db");
    this.db = new Database(path);
    this.initSchema();
    this.runMigrations();
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
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        session_id TEXT,
        step_index INTEGER,
        parent_trace_id TEXT,
        state_snapshot JSON
      );
      
      CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_traces_model ON traces(json_extract(metadata, '$.model'));
      CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(json_extract(metadata, '$.status'));
      CREATE INDEX IF NOT EXISTS idx_traces_created ON traces(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_session_id ON traces(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_step ON traces(session_id, step_index);
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

    // Create FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS traces_fts USING fts5(
        id UNINDEXED,
        endpoint,
        request_content,
        response_content,
        model
      );
      
      -- Triggers to keep FTS index in sync
      CREATE TRIGGER IF NOT EXISTS traces_fts_insert AFTER INSERT ON traces BEGIN
        INSERT INTO traces_fts(rowid, id, endpoint, request_content, response_content, model)
        VALUES (
          NEW.rowid,
          NEW.id,
          NEW.endpoint,
          json_extract(NEW.request, '$.messages'),
          json_extract(NEW.response, '$.choices[0].message.content'),
          json_extract(NEW.metadata, '$.model')
        );
      END;
      
      CREATE TRIGGER IF NOT EXISTS traces_fts_delete AFTER DELETE ON traces BEGIN
        DELETE FROM traces_fts WHERE rowid = OLD.rowid;
      END;
      
      CREATE TRIGGER IF NOT EXISTS traces_fts_update AFTER UPDATE ON traces BEGIN
        DELETE FROM traces_fts WHERE rowid = OLD.rowid;
        INSERT INTO traces_fts(rowid, id, endpoint, request_content, response_content, model)
        VALUES (
          NEW.rowid,
          NEW.id,
          NEW.endpoint,
          json_extract(NEW.request, '$.messages'),
          json_extract(NEW.response, '$.choices[0].message.content'),
          json_extract(NEW.metadata, '$.model')
        );
      END;
    `);
  }

  private runMigrations() {
    // Check if session columns exist
    const tableInfo = this.db.pragma("table_info(traces)");
    const columnNames = (tableInfo as any[]).map((col) => col.name);

    if (!columnNames.includes("session_id")) {
      // Migration: Adding session tracking columns
      this.db.exec(`
        ALTER TABLE traces ADD COLUMN session_id TEXT;
        ALTER TABLE traces ADD COLUMN step_index INTEGER;
        ALTER TABLE traces ADD COLUMN parent_trace_id TEXT;
        ALTER TABLE traces ADD COLUMN state_snapshot JSON;
        
        CREATE INDEX IF NOT EXISTS idx_session_id ON traces(session_id);
        CREATE INDEX IF NOT EXISTS idx_session_step ON traces(session_id, step_index);
      `);
    }

    // Check if FTS table exists
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='traces_fts'"
      )
      .all();

    if (tables.length === 0) {
      // Create FTS5 table and triggers (same as initSchema)
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS traces_fts USING fts5(
          id UNINDEXED,
          endpoint,
          request_content,
          response_content,
          model
        );
        
        CREATE TRIGGER IF NOT EXISTS traces_fts_insert AFTER INSERT ON traces BEGIN
          INSERT INTO traces_fts(rowid, id, endpoint, request_content, response_content, model)
          VALUES (
            NEW.rowid,
            NEW.id,
            NEW.endpoint,
            json_extract(NEW.request, '$.messages'),
            json_extract(NEW.response, '$.choices[0].message.content'),
            json_extract(NEW.metadata, '$.model')
          );
        END;
        
        CREATE TRIGGER IF NOT EXISTS traces_fts_delete AFTER DELETE ON traces BEGIN
          DELETE FROM traces_fts WHERE rowid = OLD.rowid;
        END;
        
        CREATE TRIGGER IF NOT EXISTS traces_fts_update AFTER UPDATE ON traces BEGIN
          DELETE FROM traces_fts WHERE rowid = OLD.rowid;
          INSERT INTO traces_fts(rowid, id, endpoint, request_content, response_content, model)
          VALUES (
            NEW.rowid,
            NEW.id,
            NEW.endpoint,
            json_extract(NEW.request, '$.messages'),
            json_extract(NEW.response, '$.choices[0].message.content'),
            json_extract(NEW.metadata, '$.model')
          );
        END;
      `);

      // Populate FTS index with existing traces
      this.db.exec(`
        INSERT INTO traces_fts(rowid, id, endpoint, request_content, response_content, model)
        SELECT 
          rowid,
          id,
          endpoint,
          json_extract(request, '$.messages'),
          json_extract(response, '$.choices[0].message.content'),
          json_extract(metadata, '$.model')
        FROM traces
        WHERE response IS NOT NULL;
      `);
    }
  }

  async saveTrace(trace: Trace): Promise<void> {
    // Redact before saving
    const redacted = redactTrace(trace);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO traces (
        id, timestamp, endpoint, request, response, metadata, schema_version,
        session_id, step_index, parent_trace_id, state_snapshot
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      redacted.id,
      redacted.timestamp,
      redacted.endpoint,
      JSON.stringify(redacted.request),
      redacted.response ? JSON.stringify(redacted.response) : null,
      JSON.stringify(redacted.metadata),
      redacted.schema_version || "1.0.0",
      redacted.session_id || null,
      redacted.step_index !== undefined ? redacted.step_index : null,
      redacted.parent_trace_id || null,
      redacted.state_snapshot ? JSON.stringify(redacted.state_snapshot) : null
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
      session_id: row.session_id || undefined,
      step_index: row.step_index !== null ? row.step_index : undefined,
      parent_trace_id: row.parent_trace_id || undefined,
      state_snapshot: row.state_snapshot
        ? JSON.parse(row.state_snapshot)
        : undefined,
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
      query += " AND json_extract(metadata, '$.model') = ?";
      params.push(filter.model);
    }

    if (filter.status) {
      query += " AND json_extract(metadata, '$.status') = ?";
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
      session_id: row.session_id || undefined,
      step_index: row.step_index !== null ? row.step_index : undefined,
      parent_trace_id: row.parent_trace_id || undefined,
      state_snapshot: row.state_snapshot
        ? JSON.parse(row.state_snapshot)
        : undefined,
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

  async listTracesBySession(sessionId: string): Promise<Trace[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM traces 
      WHERE session_id = ? 
      ORDER BY step_index ASC
    `);

    const rows: any[] = stmt.all(sessionId);

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      endpoint: row.endpoint,
      request: JSON.parse(row.request),
      response: row.response ? JSON.parse(row.response) : null,
      metadata: JSON.parse(row.metadata),
      schema_version: row.schema_version,
      session_id: row.session_id || undefined,
      step_index: row.step_index !== null ? row.step_index : undefined,
      parent_trace_id: row.parent_trace_id || undefined,
      state_snapshot: row.state_snapshot
        ? JSON.parse(row.state_snapshot)
        : undefined,
    }));
  }

  async getSessionMetadata(
    sessionId: string
  ): Promise<SessionMetadata | null> {
    const stmt = this.db.prepare(`
      SELECT 
        session_id,
        COUNT(*) as total_steps,
        MIN(timestamp) as start_time,
        MAX(timestamp) as end_time,
        json_extract(metadata, '$.model') as model,
        json_extract(metadata, '$.tokens_used') as tokens,
        json_extract(metadata, '$.status') as status
      FROM traces 
      WHERE session_id = ?
      GROUP BY session_id
    `);

    const row: any = stmt.get(sessionId);

    if (!row) return null;

    // Get all traces to calculate aggregate data
    const traces = await this.listTracesBySession(sessionId);

    const startTime = new Date(row.start_time);
    const endTime = new Date(row.end_time);
    const durationMs = endTime.getTime() - startTime.getTime();

    // Collect unique models
    const modelsSet = new Set<string>();
    let totalTokens = 0;
    let hasError = false;
    let allCompleted = true;

    for (const trace of traces) {
      if (trace.metadata.model) {
        modelsSet.add(trace.metadata.model);
      }
      if (trace.metadata.tokens_used) {
        totalTokens += trace.metadata.tokens_used;
      }
      if (trace.metadata.status === "error") {
        hasError = true;
      }
      if (!trace.response) {
        allCompleted = false;
      }
    }

    const status = hasError
      ? "failed"
      : allCompleted
      ? "completed"
      : "in_progress";

    return {
      session_id: sessionId,
      total_steps: row.total_steps,
      start_time: row.start_time,
      end_time: row.end_time,
      duration_ms: durationMs,
      models_used: Array.from(modelsSet),
      total_tokens: totalTokens > 0 ? totalTokens : undefined,
      status,
    };
  }

  /**
   * Search traces using full-text search
   * @param query Search query (supports FTS5 syntax: AND, OR, NOT, phrase queries)
   * @param options Search options
   * @returns Matching traces ordered by relevance (BM25 ranking)
   */
  async searchTraces(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      filterModel?: string;
      filterStatus?: "success" | "error";
    } = {}
  ): Promise<Trace[]> {
    const { limit = 50, offset = 0, filterModel, filterStatus } = options;

    // Prepare FTS5 query - if query doesn't contain FTS operators, treat as phrase
    // This handles special characters like hyphens in model names (e.g., gpt-4)
    let ftsQuery = query;
    if (
      !query.includes(" AND ") &&
      !query.includes(" OR ") &&
      !query.includes(" NOT ") &&
      !query.startsWith('"')
    ) {
      // Check if query contains special characters that need quoting
      if (/[^a-zA-Z0-9\s]/.test(query)) {
        ftsQuery = `"${query}"`;
      }
    }

    // Build search query
    let sql = `
      SELECT traces.*, 
             bm25(traces_fts) as rank
      FROM traces
      INNER JOIN traces_fts ON traces.rowid = traces_fts.rowid
      WHERE traces_fts MATCH ?
    `;

    const params: any[] = [ftsQuery];

    // Apply additional filters
    if (filterModel) {
      sql += ` AND json_extract(metadata, '$.model') = ?`;
      params.push(filterModel);
    }

    if (filterStatus) {
      sql += ` AND json_extract(metadata, '$.status') = ?`;
      params.push(filterStatus);
    }

    // Order by relevance (BM25 score)
    sql += ` ORDER BY rank LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows: any[] = stmt.all(...params);

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      endpoint: row.endpoint,
      request: JSON.parse(row.request),
      response: row.response ? JSON.parse(row.response) : null,
      metadata: JSON.parse(row.metadata),
      schema_version: row.schema_version,
      session_id: row.session_id || undefined,
      step_index: row.step_index !== null ? row.step_index : undefined,
      parent_trace_id: row.parent_trace_id || undefined,
      state_snapshot: row.state_snapshot
        ? JSON.parse(row.state_snapshot)
        : undefined,
    }));
  }

  /**
   * Count total search results without fetching all rows
   */
  async countSearchResults(query: string): Promise<number> {
    // Prepare FTS5 query - if query doesn't contain FTS operators, treat as phrase
    let ftsQuery = query;
    if (
      !query.includes(" AND ") &&
      !query.includes(" OR ") &&
      !query.includes(" NOT ") &&
      !query.startsWith('"')
    ) {
      // Check if query contains special characters that need quoting
      if (/[^a-zA-Z0-9\s]/.test(query)) {
        ftsQuery = `"${query}"`;
      }
    }

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM traces_fts
      WHERE traces_fts MATCH ?
    `);

    const row: any = stmt.get(ftsQuery);
    return row.count;
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    prefix: string,
    limit: number = 10
  ): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT DISTINCT json_extract(metadata, '$.model') as model
      FROM traces
      WHERE json_extract(metadata, '$.model') LIKE ? || '%'
      LIMIT ?
    `);

    const rows: any[] = stmt.all(prefix, limit);
    return rows.map((r) => r.model).filter((m) => m !== null);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
