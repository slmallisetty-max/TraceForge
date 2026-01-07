import { writeFile, mkdir, readdir, stat, unlink, readFile, rename, } from "fs/promises";
import { resolve } from "path";
import { existsSync } from "fs";
import { storageLogger } from "@traceforge/shared";
import { redactTrace } from "./redaction.js";
import { storageCircuitBreaker } from "./storage-metrics.js";
// Allow custom trace directory via environment variable
const TRACES_DIR = resolve(process.cwd(), process.env.TRACEFORGE_TRACES_DIR || ".ai-tests/traces");
const TESTS_DIR = resolve(process.cwd(), process.env.TRACEFORGE_TESTS_DIR || ".ai-tests/tests");
export class FileStorageBackend {
    async saveTrace(trace) {
        // Check circuit breaker before attempting save
        if (storageCircuitBreaker.isOpen()) {
            const error = new Error("Storage circuit breaker is open - too many consecutive failures. " +
                "Trace saving is temporarily disabled to prevent cascading failures.");
            storageLogger.error({ error: error.message }, "Circuit breaker open");
            throw error;
        }
        try {
            // Ensure directory exists
            if (!existsSync(TRACES_DIR)) {
                await mkdir(TRACES_DIR, { recursive: true });
            }
            // Add schema version if missing
            if (!trace.schema_version) {
                trace.schema_version = "1.0.0";
            }
            // Redact sensitive data before saving
            const redactedTrace = redactTrace(trace);
            // Create filename with timestamp and ID
            const timestamp = new Date(trace.timestamp)
                .toISOString()
                .replace(/[:.]/g, "-");
            const filename = `${timestamp}_${trace.id}.json`;
            const filepath = resolve(TRACES_DIR, filename);
            // Sort keys for git-friendly diffs
            const sortedTrace = sortKeys(redactedTrace);
            // Write to temp file first, then atomic rename to prevent race conditions
            const tempFilepath = `${filepath}.tmp.${Date.now()}`;
            await writeFile(tempFilepath, JSON.stringify(sortedTrace, null, 2), "utf-8");
            // Atomic rename - guaranteed by OS to be safe for concurrent writes
            await rename(tempFilepath, filepath);
            // Record success
            storageCircuitBreaker.recordSuccess();
        }
        catch (error) {
            // Record failure with circuit breaker
            const errorObj = error instanceof Error ? error : new Error(String(error));
            storageCircuitBreaker.recordFailure();
            // Log detailed error
            storageLogger.error({
                traceId: trace.id,
                error: errorObj.message,
                consecutiveFailures: storageCircuitBreaker.getMetrics().consecutiveFailures,
                circuitOpen: storageCircuitBreaker.getMetrics().circuitOpen,
            }, "Failed to save trace");
            // Re-throw to let caller handle (don't silently fail)
            throw errorObj;
        }
    }
    async getTrace(id) {
        try {
            if (!existsSync(TRACES_DIR)) {
                return null;
            }
            const files = await readdir(TRACES_DIR);
            const traceFile = files.find((f) => f.includes(id));
            if (!traceFile) {
                return null;
            }
            const content = await readFile(resolve(TRACES_DIR, traceFile), "utf-8");
            return JSON.parse(content);
        }
        catch (error) {
            storageLogger.error({ error, id }, "Failed to get trace");
            return null;
        }
    }
    async listTraces(options = {}) {
        try {
            if (!existsSync(TRACES_DIR)) {
                return [];
            }
            const { limit = 100, offset = 0, sortOrder = "desc" } = options;
            const files = await readdir(TRACES_DIR);
            const traceFiles = files.filter((f) => f.endsWith(".json"));
            // Get file stats for sorting
            const fileStats = await Promise.all(traceFiles.map(async (filename) => {
                const filepath = resolve(TRACES_DIR, filename);
                const stats = await stat(filepath);
                return {
                    filename,
                    filepath,
                    mtime: stats.mtime.getTime(),
                };
            }));
            // Sort by modification time
            fileStats.sort((a, b) => sortOrder === "desc" ? b.mtime - a.mtime : a.mtime - b.mtime);
            // Apply pagination
            const paginatedFiles = fileStats.slice(offset, offset + limit);
            // Read and parse traces
            const traces = await Promise.all(paginatedFiles.map(async (file) => {
                const content = await readFile(file.filepath, "utf-8");
                return JSON.parse(content);
            }));
            return traces;
        }
        catch (error) {
            storageLogger.error({ error }, "Failed to list traces");
            return [];
        }
    }
    async deleteTrace(id) {
        try {
            if (!existsSync(TRACES_DIR)) {
                return;
            }
            const files = await readdir(TRACES_DIR);
            const traceFile = files.find((f) => f.includes(id));
            if (traceFile) {
                await unlink(resolve(TRACES_DIR, traceFile));
            }
        }
        catch (error) {
            storageLogger.error({ error, id }, "Failed to delete trace");
            throw error;
        }
    }
    async countTraces() {
        try {
            if (!existsSync(TRACES_DIR)) {
                return 0;
            }
            const files = await readdir(TRACES_DIR);
            return files.filter((f) => f.endsWith(".json")).length;
        }
        catch (error) {
            storageLogger.error({ error }, "Failed to count traces");
            return 0;
        }
    }
    async cleanup(maxAgeSeconds, maxCount) {
        try {
            if (!existsSync(TRACES_DIR)) {
                return 0;
            }
            const files = await readdir(TRACES_DIR);
            const traceFiles = files.filter((f) => f.endsWith(".json"));
            if (traceFiles.length === 0) {
                return 0;
            }
            // Get file stats with timestamps
            const fileStats = await Promise.all(traceFiles.map(async (filename) => {
                const filepath = resolve(TRACES_DIR, filename);
                const stats = await stat(filepath);
                return {
                    filename,
                    filepath,
                    mtime: stats.mtime.getTime(),
                };
            }));
            // Sort by modification time (newest first)
            fileStats.sort((a, b) => b.mtime - a.mtime);
            const toDelete = [];
            // Delete by age
            if (maxAgeSeconds) {
                const cutoffTime = Date.now() - maxAgeSeconds * 1000;
                for (const file of fileStats) {
                    if (file.mtime < cutoffTime) {
                        toDelete.push(file.filepath);
                    }
                }
            }
            // Delete by count (keep only newest N)
            if (maxCount && fileStats.length > maxCount) {
                const excess = fileStats.slice(maxCount);
                for (const file of excess) {
                    if (!toDelete.includes(file.filepath)) {
                        toDelete.push(file.filepath);
                    }
                }
            }
            // Perform deletions
            await Promise.all(toDelete.map((filepath) => unlink(filepath)));
            return toDelete.length;
        }
        catch (error) {
            storageLogger.error({ error }, "Failed to cleanup traces");
            throw error;
        }
    }
    async saveTest(test) {
        try {
            // Ensure directory exists
            if (!existsSync(TESTS_DIR)) {
                await mkdir(TESTS_DIR, { recursive: true });
            }
            const filename = `${test.name
                .replace(/[^a-z0-9]/gi, "-")
                .toLowerCase()}_${test.id}.json`;
            const filepath = resolve(TESTS_DIR, filename);
            await writeFile(filepath, JSON.stringify(test, null, 2), "utf-8");
        }
        catch (error) {
            storageLogger.error({ error, testId: test.id }, "Failed to save test");
            throw error;
        }
    }
    async getTest(id) {
        try {
            if (!existsSync(TESTS_DIR)) {
                return null;
            }
            const files = await readdir(TESTS_DIR);
            const testFile = files.find((f) => f.includes(id));
            if (!testFile) {
                return null;
            }
            const content = await readFile(resolve(TESTS_DIR, testFile), "utf-8");
            return JSON.parse(content);
        }
        catch (error) {
            storageLogger.error({ error, id }, "Failed to get test");
            return null;
        }
    }
    async listTests(options = {}) {
        try {
            if (!existsSync(TESTS_DIR)) {
                return [];
            }
            const { limit = 100, offset = 0 } = options;
            const files = await readdir(TESTS_DIR);
            const testFiles = files.filter((f) => f.endsWith(".json"));
            // Apply pagination
            const paginatedFiles = testFiles.slice(offset, offset + limit);
            // Read and parse tests
            const tests = await Promise.all(paginatedFiles.map(async (filename) => {
                const content = await readFile(resolve(TESTS_DIR, filename), "utf-8");
                return JSON.parse(content);
            }));
            return tests;
        }
        catch (error) {
            storageLogger.error({ error }, "Failed to list tests");
            return [];
        }
    }
    async deleteTest(id) {
        try {
            if (!existsSync(TESTS_DIR)) {
                return;
            }
            const files = await readdir(TESTS_DIR);
            const testFile = files.find((f) => f.includes(id));
            if (testFile) {
                await unlink(resolve(TESTS_DIR, testFile));
            }
        }
        catch (error) {
            storageLogger.error({ error, id }, "Failed to delete test");
            throw error;
        }
    }
    async close() {
        // No cleanup needed for file-based storage
    }
    async listTracesBySession(sessionId) {
        try {
            if (!existsSync(TRACES_DIR)) {
                return [];
            }
            const files = await readdir(TRACES_DIR);
            const traceFiles = files.filter((f) => f.endsWith(".json"));
            // Read all traces and filter by session_id
            const traces = [];
            for (const filename of traceFiles) {
                const filepath = resolve(TRACES_DIR, filename);
                const content = await readFile(filepath, "utf-8");
                const trace = JSON.parse(content);
                if (trace.session_id === sessionId) {
                    traces.push(trace);
                }
            }
            // Sort by step_index
            traces.sort((a, b) => (a.step_index || 0) - (b.step_index || 0));
            return traces;
        }
        catch (error) {
            storageLogger.error({ error, sessionId }, "Failed to list traces by session");
            return [];
        }
    }
    async getSessionMetadata(sessionId) {
        try {
            const traces = await this.listTracesBySession(sessionId);
            if (traces.length === 0) {
                return null;
            }
            // Calculate metadata from traces
            const startTime = traces[0].timestamp;
            const endTime = traces[traces.length - 1].timestamp;
            const startMs = new Date(startTime).getTime();
            const endMs = new Date(endTime).getTime();
            const durationMs = endMs - startMs;
            const modelsSet = new Set();
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
                total_steps: traces.length,
                start_time: startTime,
                end_time: endTime,
                duration_ms: durationMs,
                models_used: Array.from(modelsSet),
                total_tokens: totalTokens > 0 ? totalTokens : undefined,
                status,
            };
        }
        catch (error) {
            storageLogger.error({ error, sessionId }, "Failed to get session metadata");
            return null;
        }
    }
}
// Recursively sort object keys for consistent output
function sortKeys(obj) {
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
        return obj;
    }
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
}
// Legacy export for backwards compatibility
export class TraceStorage {
    static async saveTrace(trace) {
        const backend = new FileStorageBackend();
        return backend.saveTrace(trace);
    }
    static async countTraces() {
        const backend = new FileStorageBackend();
        return backend.countTraces();
    }
    static async cleanup(maxAgeSeconds, maxCount) {
        const backend = new FileStorageBackend();
        return backend.cleanup(maxAgeSeconds, maxCount);
    }
}
//# sourceMappingURL=storage-file.js.map