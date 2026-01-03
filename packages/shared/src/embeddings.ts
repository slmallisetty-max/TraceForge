/**
 * Simple embedding service for shared package
 * Re-exports from proxy package when available
 */

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
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
 * Simple embedding service interface
 */
export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
}

/**
 * OpenAI embedding service using text-embedding-3-small
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  constructor(
    private apiKey: string = process.env.OPENAI_API_KEY || '',
    private model: string = 'text-embedding-3-small',
    private baseUrl: string = 'https://api.openai.com/v1'
  ) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.data[0].embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }
}

let defaultService: EmbeddingService | null = null;

/**
 * Get the default embedding service (singleton)
 */
export function getDefaultEmbeddingService(_useCache: boolean = true): EmbeddingService {
  if (!defaultService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    defaultService = new OpenAIEmbeddingService(apiKey);
  }
  return defaultService;
}

/**
 * Reset the default service (useful for testing)
 */
export function resetDefaultEmbeddingService(): void {
  defaultService = null;
}
