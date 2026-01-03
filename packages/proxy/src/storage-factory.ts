import type { StorageBackend } from "@traceforge/shared";
import { SQLiteStorageBackend } from "./storage-sqlite.js";
import { FileStorageBackend } from "./storage-file.js";

export type StorageType = "sqlite" | "file";

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
