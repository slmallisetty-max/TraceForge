/**
 * Embedding services for semantic assertions
 * Supports OpenAI and Ollama (local) embeddings
 */

import { EmbeddingCache } from "./embedding-cache.js";

export type EmbeddingProvider = "openai" | "ollama";

export interface EmbeddingServiceConfig {
  provider: EmbeddingProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  cacheEnabled?: boolean;
  cachePath?: string;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimensions don't match: ${a.length} vs ${b.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Embedding service interface
 */
export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getProvider(): EmbeddingProvider;
}

/**
 * OpenAI embedding service using text-embedding-3-small
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  constructor(
    private apiKey: string = process.env.OPENAI_API_KEY || "",
    private model: string = "text-embedding-3-small",
    private baseUrl: string = "https://api.openai.com/v1"
  ) {
    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable."
      );
    }
  }

  getProvider(): EmbeddingProvider {
    return "openai";
  }

  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot generate embedding for empty text");
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data: any = await response.json();
      return data.data[0].embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embed(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}

/**
 * Ollama embedding service using local models
 */
export class OllamaEmbeddingService implements EmbeddingService {
  constructor(
    private model: string = "nomic-embed-text",
    private baseUrl: string = "http://localhost:11434"
  ) {}

  getProvider(): EmbeddingProvider {
    return "ollama";
  }

  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot generate embedding for empty text");
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data: any = await response.json();
      return data.embedding;
    } catch (error: any) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to Ollama at ${this.baseUrl}. ` +
            "Make sure Ollama is running: https://ollama.ai"
        );
      }
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embed(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}

/**
 * Cached embedding service wrapper
 */
export class CachedEmbeddingService implements EmbeddingService {
  constructor(
    private inner: EmbeddingService,
    private cache: EmbeddingCache,
    private model: string
  ) {}

  getProvider(): EmbeddingProvider {
    return this.inner.getProvider();
  }

  async embed(text: string): Promise<number[]> {
    // Try cache first
    const cached = await this.cache.get(text, this.model);
    if (cached) {
      return cached;
    }

    // Generate and cache
    const embedding = await this.inner.embed(text);
    await this.cache.set(text, this.model, embedding);

    return embedding;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embed(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}

let defaultService: EmbeddingService | null = null;
let embeddingCache: EmbeddingCache | null = null;

/**
 * Load embedding configuration from environment
 */
export function loadEmbeddingConfig(): EmbeddingServiceConfig {
  const provider = (process.env.TRACEFORGE_EMBEDDING_PROVIDER ||
    "openai") as EmbeddingProvider;

  return {
    provider,
    model: process.env.TRACEFORGE_EMBEDDING_MODEL,
    baseUrl: process.env.TRACEFORGE_EMBEDDING_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    cacheEnabled: process.env.TRACEFORGE_EMBEDDING_CACHE !== "false",
    cachePath: process.env.TRACEFORGE_EMBEDDING_CACHE_PATH,
  };
}

/**
 * Create embedding service from configuration
 */
export function createEmbeddingService(
  config: EmbeddingServiceConfig
): EmbeddingService {
  switch (config.provider) {
    case "ollama":
      return new OllamaEmbeddingService(
        config.model || "nomic-embed-text",
        config.baseUrl || "http://localhost:11434"
      );

    case "openai":
    default:
      if (!config.apiKey) {
        throw new Error(
          "OPENAI_API_KEY environment variable is required for OpenAI embeddings. " +
            "Alternatively, use Ollama: export TRACEFORGE_EMBEDDING_PROVIDER=ollama"
        );
      }
      return new OpenAIEmbeddingService(
        config.apiKey,
        config.model || "text-embedding-3-small",
        config.baseUrl || "https://api.openai.com/v1"
      );
  }
}

/**
 * Get the default embedding service (singleton)
 */
export function getDefaultEmbeddingService(
  useCache: boolean = true
): EmbeddingService {
  if (!defaultService) {
    const config = loadEmbeddingConfig();
    defaultService = createEmbeddingService(config);

    if (useCache && config.cacheEnabled) {
      embeddingCache = new EmbeddingCache(config.cachePath);
      const model =
        config.model ||
        (config.provider === "ollama"
          ? "nomic-embed-text"
          : "text-embedding-3-small");
      defaultService = new CachedEmbeddingService(
        defaultService,
        embeddingCache,
        model
      );
    }
  }
  return defaultService;
}

/**
 * Reset the default service (useful for testing)
 */
export function resetDefaultEmbeddingService(): void {
  defaultService = null;
  embeddingCache = null;
}
