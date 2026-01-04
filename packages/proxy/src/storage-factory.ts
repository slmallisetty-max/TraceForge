import type { StorageBackend } from "@traceforge/shared";
import { StorageManager } from "@traceforge/shared";
import { SQLiteStorageBackend } from "./storage-sqlite.js";
import { FileStorageBackend } from "./storage-file.js";

export type StorageType = "sqlite" | "file";

/**
 * Create a simple storage backend
 */
export function createStorageBackend(type?: StorageType): StorageBackend {
  const storageType =
    type || (process.env.TRACEFORGE_STORAGE_BACKEND as StorageType) || "file";

  switch (storageType) {
    case "sqlite":
      const dbPath = process.env.TRACEFORGE_SQLITE_PATH;
      return new SQLiteStorageBackend(dbPath);

    case "file":
    default:
      return new FileStorageBackend();
  }
}

/**
 * Create storage manager with fallback support
 * Example: Primary SQLite with file-based fallback
 */
export function createStorageWithFallback(): StorageBackend {
  const enableFallback = process.env.TRACEFORGE_STORAGE_FALLBACK === "true";

  if (!enableFallback) {
    // Simple backend without fallback
    return createStorageBackend();
  }

  // Create storage manager with fallback
  const primaryType =
    (process.env.TRACEFORGE_STORAGE_BACKEND as StorageType) || "file";
  const fallbackType: StorageType =
    primaryType === "sqlite" ? "file" : "sqlite";

  const primary = createStorageBackend(primaryType);
  const fallback = createStorageBackend(fallbackType);

  return new StorageManager({
    primary,
    fallbacks: [fallback],
    retryAttempts: parseInt(
      process.env.TRACEFORGE_STORAGE_RETRY_ATTEMPTS || "3"
    ),
    retryDelay: parseInt(process.env.TRACEFORGE_STORAGE_RETRY_DELAY || "1000"),
  });
}
