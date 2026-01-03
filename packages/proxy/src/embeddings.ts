import type { EmbeddingRequest, EmbeddingResponse } from '@traceforge/shared';
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';

export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * OpenAI Embedding Service
 * Uses text-embedding-3-small for cost-effectiveness
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1',
    private model: string = 'text-embedding-3-small'
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Validate inputs
    if (!texts || texts.length === 0) {
      throw new Error('Cannot generate embeddings for empty text array');
    }

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    // Filter out empty strings and warn
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    if (validTexts.length < texts.length) {
      console.warn(`Warning: ${texts.length - validTexts.length} empty text(s) filtered out from embedding request`);
    }

    if (validTexts.length === 0) {
      throw new Error('All texts are empty, cannot generate embeddings');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: validTexts,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        
        // Parse error message for common issues
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Check OPENAI_API_KEY environment variable.');
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Invalid request to OpenAI API: ${errorBody}`);
        } else {
          throw new Error(`Embedding API error (${response.status}): ${response.statusText} - ${errorBody}`);
        }
      }

      const data = await response.json() as EmbeddingResponse;
      
      if (!data.data || data.data.length === 0) {
        throw new Error('OpenAI API returned no embeddings');
      }

      return data.data.map(d => d.embedding);
    } catch (error: any) {
      // Enhance network errors
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to OpenAI API at ${this.baseUrl}. Check network connection.`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`Cannot resolve OpenAI API host. Check base URL: ${this.baseUrl}`);
      }
      throw error;
    }
  }
}

/**
 * Cached Embedding Service
 * Caches embeddings to disk for deterministic replay
 */
export class CachedEmbeddingService implements EmbeddingService {
  private cache: Map<string, number[]> = new Map();
  
  constructor(
    private upstream: EmbeddingService,
    private cacheDir: string = '.ai-tests/embeddings'
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const hash = this.hashText(text);
    
    // Check memory cache
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    // Check disk cache
    const cached = await this.loadFromDisk(hash);
    if (cached) {
      this.cache.set(hash, cached);
      return cached;
    }

    // Generate new embedding
    const embedding = await this.upstream.generateEmbedding(text);
    
    // Save to cache
    this.cache.set(hash, embedding);
    await this.saveToDisk(hash, embedding);
    
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.generateEmbedding(t)));
  }

  private hashText(text: string): string {
    // Use SHA-256 for cache key
    return createHash('sha256').update(text).digest('hex');
  }

  private async loadFromDisk(hash: string): Promise<number[] | null> {
    try {
      const cachePath = resolve(this.cacheDir, `${hash}.json`);
      if (!existsSync(cachePath)) {
        return null;
      }
      
      const content = await readFile(cachePath, 'utf-8');
      const data = JSON.parse(content);
      return data.embedding;
    } catch (error) {
      // Cache miss or read error
      return null;
    }
  }

  private async saveToDisk(hash: string, embedding: number[]): Promise<void> {
    try {
      // Ensure cache directory exists
      if (!existsSync(this.cacheDir)) {
        await mkdir(this.cacheDir, { recursive: true });
      }
      
      const cachePath = resolve(this.cacheDir, `${hash}.json`);
      const data = {
        embedding,
        cached_at: new Date().toISOString(),
      };
      
      await writeFile(cachePath, JSON.stringify(data), 'utf-8');
    } catch (error) {
      // Fail silently on cache write errors
      console.warn('Failed to cache embedding:', error);
    }
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * 
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between 0 and 1 (1 = identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embeddings must have same dimension (got ${a.length} and ${b.length})`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  // Handle zero vectors
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Get default embedding service from environment
 * Checks for OPENAI_API_KEY and uses OpenAI service
 */
export function getDefaultEmbeddingService(useCache: boolean = true): EmbeddingService {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set. Required for semantic assertions.');
  }
  
  const baseService = new OpenAIEmbeddingService(apiKey);
  
  if (useCache) {
    return new CachedEmbeddingService(baseService);
  }
  
  return baseService;
}
