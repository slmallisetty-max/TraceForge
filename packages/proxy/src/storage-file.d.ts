import type { Trace, Test, StorageBackend, ListOptions, SessionMetadata } from "@traceforge/shared";
export declare class FileStorageBackend implements StorageBackend {
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
    close(): Promise<void>;
    listTracesBySession(sessionId: string): Promise<Trace[]>;
    getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>;
}
export declare class TraceStorage {
    static saveTrace(trace: Trace): Promise<void>;
    static countTraces(): Promise<number>;
    static cleanup(maxAgeSeconds?: number, maxCount?: number): Promise<number>;
}
//# sourceMappingURL=storage-file.d.ts.map