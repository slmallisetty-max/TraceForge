import type { StorageBackend } from "@traceforge/shared";
export type StorageType = "sqlite" | "file";
/**
 * Create a simple storage backend
 */
export declare function createStorageBackend(type?: StorageType): StorageBackend;
/**
 * Create storage manager with fallback support
 * Example: Primary SQLite with file-based fallback
 */
export declare function createStorageWithFallback(): StorageBackend;
//# sourceMappingURL=storage-factory.d.ts.map