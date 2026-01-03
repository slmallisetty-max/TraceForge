export interface EmbeddingService {
    generateEmbedding(text: string): Promise<number[]>;
    generateEmbeddings(texts: string[]): Promise<number[][]>;
}
/**
 * OpenAI Embedding Service
 * Uses text-embedding-3-small for cost-effectiveness
 */
export declare class OpenAIEmbeddingService implements EmbeddingService {
    private apiKey;
    private baseUrl;
    private model;
    constructor(apiKey: string, baseUrl?: string, model?: string);
    generateEmbedding(text: string): Promise<number[]>;
    generateEmbeddings(texts: string[]): Promise<number[][]>;
}
/**
 * Cached Embedding Service
 * Caches embeddings to disk for deterministic replay
 */
export declare class CachedEmbeddingService implements EmbeddingService {
    private upstream;
    private cacheDir;
    private cache;
    constructor(upstream: EmbeddingService, cacheDir?: string);
    generateEmbedding(text: string): Promise<number[]>;
    generateEmbeddings(texts: string[]): Promise<number[][]>;
    private hashText;
    private loadFromDisk;
    private saveToDisk;
}
/**
 * Calculate cosine similarity between two embeddings
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between 0 and 1 (1 = identical)
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Get default embedding service from environment
 * Checks for OPENAI_API_KEY and uses OpenAI service
 */
export declare function getDefaultEmbeddingService(useCache?: boolean): EmbeddingService;
//# sourceMappingURL=embeddings.d.ts.map