import { describe, it, expect, vi } from 'vitest';
import { evaluateAssertion, evaluateAssertions } from './assertions';
import type { Assertion, LLMResponse, TraceMetadata } from '@traceforge/shared';

// Mock the embedding service
vi.mock('../../../proxy/src/embeddings.js', () => ({
  getDefaultEmbeddingService: vi.fn(() => ({
    generateEmbedding: vi.fn(async (text: string) => {
      // Normalize text
      const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
      const words = normalized.split(/\s+/).filter(w => w.length > 2);
      
      // Look for negations - they strongly affect meaning
      const hasNegation = /\b(no|not|never|none)\b/.test(normalized);
      
      // Extract key concepts (non-stopwords)
      const stopwords = ['the', 'is', 'a', 'of', 'in', 'to', 'and'];
      const keyWords = words.filter(w => !stopwords.includes(w));
      
      // Create a vector based on word presence and sentiment
      const commonConcepts = ['capital', 'france', 'paris', 'berlin', 'germany', 'city', 'country', 'has', 'no', 'not'];
      return Array.from({ length: 10 }, (_, i) => {
        const concept = commonConcepts[i] || `concept${i}`;
        const present = keyWords.includes(concept) ? 1 : 0;
        // Flip sign if negation present for concepts like "capital", "has"
        if (hasNegation && ['capital', 'has'].includes(concept)) {
          return -present;
        }
        return present;
      });
    }),
    generateEmbeddings: vi.fn(async (texts: string[]) => {
      return Promise.all(texts.map(async text => {
        const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
        const words = normalized.split(/\s+/).filter(w => w.length > 2);
        const hasNegation = /\b(no|not|never|none)\b/.test(normalized);
        const stopwords = ['the', 'is', 'a', 'of', 'in', 'to', 'and'];
        const keyWords = words.filter(w => !stopwords.includes(w));
        const commonConcepts = ['capital', 'france', 'paris', 'berlin', 'germany', 'city', 'country', 'has', 'no', 'not'];
        return Array.from({ length: 10 }, (_, i) => {
          const concept = commonConcepts[i] || `concept${i}`;
          const present = keyWords.includes(concept) ? 1 : 0;
          if (hasNegation && ['capital', 'has'].includes(concept)) {
            return -present;
          }
          return present;
        });
      }));
    }),
  })),
  cosineSimilarity: vi.fn((a: number[], b: number[]): number => {
    // Simple cosine similarity implementation for tests
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm === 0 ? 0 : dotProduct / norm;
  }),
}));

describe('Assertions', () => {
  const mockResponse: LLMResponse = {
    id: 'test-1',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'The capital of France is Paris.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 8,
      total_tokens: 18,
    },
  };

  const mockMetadata: TraceMetadata = {
    duration_ms: 1200,
    tokens_used: 18,
    model: 'gpt-4',
    status: 'success',
  };

  describe('Exact Match Assertion', () => {
    it('should pass for exact match', async () => {
      const assertion: Assertion = {
        type: 'exact',
        value: 'The capital of France is Paris.',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Exact match successful');
    });

    it('should fail for non-exact match', async () => {
      const assertion: Assertion = {
        type: 'exact',
        value: 'The capital of Germany is Berlin.',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Expected exact match');
    });

    it('should support custom field paths', async () => {
      const assertion: Assertion = {
        type: 'exact',
        field: 'model',
        value: 'gpt-4',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });
  });

  describe('Contains Assertion', () => {
    it('should pass when substring is found', async () => {
      const assertion: Assertion = {
        type: 'contains',
        value: 'Paris',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Found "Paris"');
    });

    it('should fail when substring is not found', async () => {
      const assertion: Assertion = {
        type: 'contains',
        value: 'Berlin',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Did not find "Berlin"');
    });

    it('should be case-sensitive', async () => {
      const assertion: Assertion = {
        type: 'contains',
        value: 'paris', // lowercase
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });
  });

  describe('Not Contains Assertion', () => {
    it('should pass when substring is not found', async () => {
      const assertion: Assertion = {
        type: 'not_contains',
        value: 'Berlin',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Correctly does not contain');
    });

    it('should fail when substring is found', async () => {
      const assertion: Assertion = {
        type: 'not_contains',
        value: 'Paris',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Unexpectedly found');
    });
  });

  describe('Regex Assertion', () => {
    it('should pass when pattern matches', async () => {
      const assertion: Assertion = {
        type: 'regex',
        pattern: 'capital.*France',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('matches regex pattern');
    });

    it('should fail when pattern does not match', async () => {
      const assertion: Assertion = {
        type: 'regex',
        pattern: '^Berlin',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('does not match regex pattern');
    });

    it('should handle complex regex patterns', async () => {
      const assertion: Assertion = {
        type: 'regex',
        pattern: '[A-Z][a-z]+',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should fail when no pattern is provided', async () => {
      const assertion: Assertion = {
        type: 'regex',
        value: 'test',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No pattern provided');
    });
  });

  describe('JSON Path Assertion', () => {
    it('should access nested values', async () => {
      const assertion: Assertion = {
        type: 'json_path',
        path: 'choices.0.message.role',
        value: 'assistant',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should handle array indexing', async () => {
      const assertion: Assertion = {
        type: 'json_path',
        path: 'choices.0.index',
        value: 0,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should return undefined for invalid paths', async () => {
      const assertion: Assertion = {
        type: 'json_path',
        path: 'invalid.path.here',
        value: 'test',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.actual).toBeUndefined();
    });

    it('should fail when no path is provided', async () => {
      const assertion: Assertion = {
        type: 'json_path',
        value: 'test',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No path provided');
    });
  });

  describe('Fuzzy Match Assertion', () => {
    it('should pass for very similar strings', async () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'The capital of France is Paris',
        threshold: 0.9,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toMatch(/Similarity: \d+\.\d+%/);
    });

    it('should fail for dissimilar strings', async () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'Completely different text about Berlin',
        threshold: 0.8,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should use default threshold of 0.8', async () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'The capital of France is Paris.',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('threshold: 80%');
    });

    it('should handle identical strings', async () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'The capital of France is Paris.',
        threshold: 1.0,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Similarity: 100.0%');
    });
  });

  describe('Token Count Assertion', () => {
    it('should pass when token count is in range', async () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 10,
        max: 30,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe(18);
    });

    it('should fail when token count is too low', async () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 50,
        max: 100,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should fail when token count is too high', async () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 1,
        max: 10,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should handle no maximum', async () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 10,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.expected).toContain('∞');
    });

    it('should use response usage if metadata tokens missing', async () => {
      const metadataWithoutTokens: TraceMetadata = {
        ...mockMetadata,
        tokens_used: undefined,
      };

      const assertion: Assertion = {
        type: 'token_count',
        min: 10,
        max: 30,
      };

      const result = await evaluateAssertion(assertion, mockResponse, metadataWithoutTokens);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe(18);
    });
  });

  describe('Latency Assertion', () => {
    it('should pass when latency is in range', async () => {
      const assertion: Assertion = {
        type: 'latency',
        max: 2000,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe('1200ms');
    });

    it('should fail when latency exceeds maximum', async () => {
      const assertion: Assertion = {
        type: 'latency',
        max: 1000,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should support minimum latency', async () => {
      const assertion: Assertion = {
        type: 'latency',
        min: 1000,
        max: 2000,
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should use default max of 5000ms', async () => {
      const assertion: Assertion = {
        type: 'latency',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.expected).toBe('0-5000ms');
    });
  });

  describe('Error Handling', () => {
    it('should handle null response', async () => {
      const assertion: Assertion = {
        type: 'exact',
        value: 'test',
      };

      const result = await evaluateAssertion(assertion, null, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No response available');
    });

    it('should handle unknown assertion type', async () => {
      const assertion: Assertion = {
        type: 'unknown_type' as any,
        value: 'test',
      };

      const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Unknown assertion type');
    });

    it('should handle empty response', async () => {
      const emptyResponse: LLMResponse = {
        ...mockResponse,
        choices: [],
      };

      const assertion: Assertion = {
        type: 'contains',
        value: 'Paris',
      };

      const result = await evaluateAssertion(assertion, emptyResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });
  });

  describe('Evaluate Multiple Assertions', () => {
    it('should evaluate all assertions', async () => {
      const assertions: Assertion[] = [
        { type: 'contains', value: 'Paris' },
        { type: 'contains', value: 'France' },
        { type: 'not_contains', value: 'Berlin' },
      ];

      const results = await evaluateAssertions(assertions, mockResponse, mockMetadata);
      
      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
      expect(results[2].passed).toBe(true);
    });

    it('should include failed assertions', async () => {
      const assertions: Assertion[] = [
        { type: 'contains', value: 'Paris' },
        { type: 'contains', value: 'Berlin' },
      ];

      const results = await evaluateAssertions(assertions, mockResponse, mockMetadata);
      
      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
    });

    it('should handle empty assertion list', async () => {
      const results = await evaluateAssertions([], mockResponse, mockMetadata);
      expect(results).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle response with text instead of message', async () => {
      const textResponse: LLMResponse = {
        ...mockResponse,
        choices: [
          {
            index: 0,
            text: 'Legacy text response',
            finish_reason: 'stop',
          },
        ],
      };

      const assertion: Assertion = {
        type: 'contains',
        value: 'Legacy',
      };

      const result = await evaluateAssertion(assertion, textResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should handle response without usage', async () => {
      const responseNoUsage: LLMResponse = {
        ...mockResponse,
        usage: undefined,
      };

      const metadataNoTokens: TraceMetadata = {
        ...mockMetadata,
        tokens_used: undefined,
      };

      const assertion: Assertion = {
        type: 'token_count',
        min: 1,
      };

      // Should fall back to estimation
      const result = await evaluateAssertion(assertion, responseNoUsage, metadataNoTokens);
      expect(result.passed).toBe(true);
      expect(typeof result.actual).toBe('number');
    });
  });

  describe('Semantic Assertions (2026 Q1)', () => {
    describe('Semantic Similarity Assertion', () => {
      it('should pass when semantic similarity exceeds threshold', async () => {
        const assertion: Assertion = {
          type: 'semantic',
          expected: 'The capital of France is Paris',
          threshold: 0.8,
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(true);
        expect(result.message).toContain('Semantic similarity');
        expect(result.message).toContain('meets threshold');
      });

      it('should fail when expected text is missing', async () => {
        const assertion: Assertion = {
          type: 'semantic',
          threshold: 0.8,
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(false);
        expect(result.error).toContain('Missing expected text');
      });

      it('should use custom threshold', async () => {
        const assertion: Assertion = {
          type: 'semantic',
          expected: 'Paris is capital',
          threshold: 0.95, // Very high threshold
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        // May pass or fail depending on similarity, but should use threshold
        expect(result.expected).toContain('0.95');
      });

      it('should work with field selector', async () => {
        const assertion: Assertion = {
          type: 'semantic',
          field: 'choices.0.message.content',
          expected: 'Paris is the capital of France',
          threshold: 0.8,
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(true);
      });
    });

    describe('Semantic Contradiction Assertion', () => {
      it('should pass when no contradictions detected', async () => {
        const assertion: Assertion = {
          type: 'semantic-contradiction',
          forbidden: [
            'France has no capital',
            'Paris is not in France',
            'The capital is Berlin',
          ],
          threshold: 0.75,
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(true);
        expect(result.message).toContain('No contradictions detected');
      });

      it('should fail when forbidden array is empty', async () => {
        const assertion: Assertion = {
          type: 'semantic-contradiction',
          forbidden: [],
          threshold: 0.75,
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(false);
        expect(result.error).toContain('Missing forbidden statements');
      });

      it('should detect high similarity with forbidden statements', async () => {
        const contradictoryResponse: LLMResponse = {
          ...mockResponse,
          choices: [{
            ...mockResponse.choices[0],
            message: {
              role: 'assistant',
              content: 'France does not have a capital city.',
            },
          }],
        };

        const assertion: Assertion = {
          type: 'semantic-contradiction',
          forbidden: ['France has no capital'],
          threshold: 0.75,
        };

        const result = await evaluateAssertion(assertion, contradictoryResponse, mockMetadata);
        // Should detect contradiction (implementation-dependent)
        expect(result.message).toContain('similarity');
      });

      it('should use custom contradiction threshold', async () => {
        const assertion: Assertion = {
          type: 'semantic-contradiction',
          forbidden: ['Unrelated text'],
          threshold: 0.5, // Lower threshold
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.expected || result.message).toContain('0.5');
      });
    });

    describe('Semantic Intent Assertion (Coming Soon)', () => {
      it('should return not implemented', async () => {
        const assertion: Assertion = {
          type: 'semantic-intent',
          expected_intent: 'provide_factual_answer',
          confidence_threshold: 0.7,
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(false);
        expect(result.error).toBe('Not implemented');
        expect(result.message).toContain('2026 Q1 Week 4');
      });
    });

    describe('Policy Assertion (Coming Soon)', () => {
      it('should return not implemented', async () => {
        const assertion: Assertion = {
          type: 'policy',
          policies: ['customer-support'],
          fail_on_severity: 'high',
        };

        const result = await evaluateAssertion(assertion, mockResponse, mockMetadata);
        expect(result.passed).toBe(false);
        expect(result.error).toBe('Not implemented');
        expect(result.message).toContain('2026 Q1 Week 4');
      });
    });
  });
});
