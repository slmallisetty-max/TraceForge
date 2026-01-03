import { createHash } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { existsSync } from "fs";

export class EmbeddingCache {
  private cachePath: string;
  private memoryCache: Map<string, number[]> = new Map();

  constructor(cachePath?: string) {
    this.cachePath =
      cachePath || resolve(process.cwd(), ".ai-tests/embeddings-cache");
  }

  private getCacheKey(text: string, model: string): string {
    return createHash("sha256").update(`${model}:${text}`).digest("hex");
  }

  private getCacheFilePath(key: string): string {
    // Store in subdirectories to avoid too many files in one folder
    const prefix = key.substring(0, 2);
    return resolve(this.cachePath, prefix, `${key}.json`);
  }

  async get(text: string, model: string): Promise<number[] | null> {
    const key = this.getCacheKey(text, model);

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    // Check disk cache
    const filePath = this.getCacheFilePath(key);
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      // Store in memory cache
      this.memoryCache.set(key, data.embedding);

      return data.embedding;
    } catch {
      return null;
    }
  }

  async set(text: string, model: string, embedding: number[]): Promise<void> {
    const key = this.getCacheKey(text, model);

    // Store in memory cache
    this.memoryCache.set(key, embedding);

    // Store on disk
    const filePath = this.getCacheFilePath(key);
    const dir = resolve(filePath, "..");

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(
      filePath,
      JSON.stringify({
        text: text.substring(0, 100), // Store truncated text for debugging
        model,
        embedding,
        createdAt: new Date().toISOString(),
      }),
      "utf-8"
    );
  }

  clearMemory() {
    this.memoryCache.clear();
  }
}
