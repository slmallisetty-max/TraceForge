import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, OpenAIEmbeddingService, CachedEmbeddingService } from './embeddings.js';
import type { EmbeddingResponse } from '@traceforge/shared';

describe('Embedding Service', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const a = [1, 2, 3, 4];
      const b = [1, 2, 3, 4];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    it('should calculate similarity for typical embeddings', () => {
      // Similar vectors (high cosine similarity)
      const a = [0.1, 0.2, 0.3, 0.4, 0.5];
      const b = [0.11, 0.21, 0.29, 0.41, 0.49];
      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(0.99);
    });

    it('should handle zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should throw error for different dimensions', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(() => cosineSimilarity(a, b)).toThrow('Embeddings must have same dimension');
    });
  });

  describe('OpenAIEmbeddingService', () => {
    let service: OpenAIEmbeddingService;
    const mockApiKey = 'sk-test-key';

    beforeEach(() => {
      service = new OpenAIEmbeddingService(mockApiKey);
      global.fetch = vi.fn();
    });

    it('should generate single embedding', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResponse: EmbeddingResponse = {
        object: 'list',
        data: [
          { object: 'embedding', embedding: mockEmbedding, index: 0 },
        ],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateEmbedding('test text');
      expect(result).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it('should generate multiple embeddings', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      const mockResponse: EmbeddingResponse = {
        object: 'list',
        data: [
          { object: 'embedding', embedding: mockEmbeddings[0], index: 0 },
          { object: 'embedding', embedding: mockEmbeddings[1], index: 1 },
        ],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateEmbeddings(['text 1', 'text 2']);
      expect(result).toEqual(mockEmbeddings);
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      });

      await expect(service.generateEmbedding('test')).rejects.toThrow('Embedding API error');
    });

    it('should use custom base URL and model', async () => {
      const customService = new OpenAIEmbeddingService(
        mockApiKey,
        'https://custom.api.com/v1',
        'custom-model'
      );

      const mockResponse: EmbeddingResponse = {
        object: 'list',
        data: [{ object: 'embedding', embedding: [0.1], index: 0 }],
        model: 'custom-model',
        usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await customService.generateEmbedding('test');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/embeddings',
        expect.anything()
      );
    });
  });

  describe('CachedEmbeddingService', () => {
    let upstreamService: OpenAIEmbeddingService;
    let cachedService: CachedEmbeddingService;
    const mockApiKey = 'sk-test-key';
    const testCacheDir = '/tmp/test-embeddings-cache-' + Date.now();

    beforeEach(() => {
      // Mock fetch before creating services
      global.fetch = vi.fn();
      upstreamService = new OpenAIEmbeddingService(mockApiKey);
      cachedService = new CachedEmbeddingService(upstreamService, testCacheDir);
    });

    it('should cache embeddings in memory', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResponse: EmbeddingResponse = {
        object: 'list',
        data: [{ object: 'embedding', embedding: mockEmbedding, index: 0 }],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - should hit API
      const result1 = await cachedService.generateEmbedding('test text');
      expect(result1).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call with same text - should use cache
      const result2 = await cachedService.generateEmbedding('test text');
      expect(result2).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should generate different embeddings for different texts', async () => {
      const mockEmbedding1 = [0.1, 0.2, 0.3];
      const mockEmbedding2 = [0.4, 0.5, 0.6];

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: 'list',
            data: [{ object: 'embedding', embedding: mockEmbedding1, index: 0 }],
            model: 'text-embedding-3-small',
            usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: 'list',
            data: [{ object: 'embedding', embedding: mockEmbedding2, index: 0 }],
            model: 'text-embedding-3-small',
            usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
          }),
        });

      const result1 = await cachedService.generateEmbedding('text 1');
      const result2 = await cachedService.generateEmbedding('text 2');

      expect(result1).toEqual(mockEmbedding1);
      expect(result2).toEqual(mockEmbedding2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
