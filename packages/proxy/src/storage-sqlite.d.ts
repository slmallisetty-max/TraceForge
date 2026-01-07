import type { Trace, Test, StorageBackend, ListOptions, SessionMetadata } from "@traceforge/shared";
export declare class SQLiteStorageBackend implements StorageBackend {
    private db;
    constructor(dbPath?: string);
    private initSchema;
    private runMigrations;
    saveTrace(trace: Trace): Promise<void>;
    getTrace(id: string): Promise<Trace | null>;
    listTraces(options?: ListOptions): Promise<Trace[]>;
    deleteTrace(id: string): Promise<void>;
    countTraces(): Promise<number>;
    cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number>;
    saveTest(test: Test): Promise<void>;
    getTest(id: string): Promise<Test | null>;
    listTests(options?: ListOptions): Promise<Test[]>;
    deleteTest(id: string): Promise<void>;
    listTracesBySession(sessionId: string): Promise<Trace[]>;
    getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>;
    /**
     * Search traces using full-text search
     * @param query Search query (supports FTS5 syntax: AND, OR, NOT, phrase queries)
     * @param options Search options
     * @returns Matching traces ordered by relevance (BM25 ranking)
     */
    searchTraces(query: string, options?: {
        limit?: number;
        offset?: number;
        filterModel?: string;
        filterStatus?: "success" | "error";
    }): Promise<Trace[]>;
    /**
     * Count total search results without fetching all rows
     */
    countSearchResults(query: string): Promise<number>;
    /**
     * Get search suggestions based on partial query
     */
    getSearchSuggestions(prefix: string, limit?: number): Promise<string[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=storage-sqlite.d.ts.map