import type { Trace, Test, SessionMetadata } from "./types.js";

export interface StorageBackend {
  // Traces
  saveTrace(trace: Trace): Promise<void>;
  getTrace(id: string): Promise<Trace | null>;
  listTraces(options?: ListOptions): Promise<Trace[]>;
  deleteTrace(id: string): Promise<void>;
  countTraces(): Promise<number>;

  // Session queries (v0.5.0+)
  listTracesBySession(sessionId: string): Promise<Trace[]>;
  getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>;

  // Tests
  saveTest(test: Test): Promise<void>;
  getTest(id: string): Promise<Test | null>;
  listTests(options?: ListOptions): Promise<Test[]>;
  deleteTest(id: string): Promise<void>;

  // Maintenance
  cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number>;
  close(): Promise<void>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: "timestamp" | "duration" | "model";
  sortOrder?: "asc" | "desc";
  filter?: {
    model?: string;
    status?: "success" | "error";
    dateFrom?: Date;
    dateTo?: Date;
  };
}
