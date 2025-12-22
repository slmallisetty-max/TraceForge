import { describe, it, expect } from 'vitest';
import { evaluateAssertion, evaluateAssertions } from './assertions';
import type { Assertion, LLMResponse, TraceMetadata } from '@traceforge/shared';

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
    it('should pass for exact match', () => {
      const assertion: Assertion = {
        type: 'exact',
        value: 'The capital of France is Paris.',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Exact match successful');
    });

    it('should fail for non-exact match', () => {
      const assertion: Assertion = {
        type: 'exact',
        value: 'The capital of Germany is Berlin.',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Expected exact match');
    });

    it('should support custom field paths', () => {
      const assertion: Assertion = {
        type: 'exact',
        field: 'model',
        value: 'gpt-4',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });
  });

  describe('Contains Assertion', () => {
    it('should pass when substring is found', () => {
      const assertion: Assertion = {
        type: 'contains',
        value: 'Paris',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Found "Paris"');
    });

    it('should fail when substring is not found', () => {
      const assertion: Assertion = {
        type: 'contains',
        value: 'Berlin',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Did not find "Berlin"');
    });

    it('should be case-sensitive', () => {
      const assertion: Assertion = {
        type: 'contains',
        value: 'paris', // lowercase
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });
  });

  describe('Not Contains Assertion', () => {
    it('should pass when substring is not found', () => {
      const assertion: Assertion = {
        type: 'not_contains',
        value: 'Berlin',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Correctly does not contain');
    });

    it('should fail when substring is found', () => {
      const assertion: Assertion = {
        type: 'not_contains',
        value: 'Paris',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Unexpectedly found');
    });
  });

  describe('Regex Assertion', () => {
    it('should pass when pattern matches', () => {
      const assertion: Assertion = {
        type: 'regex',
        pattern: 'capital.*France',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('matches regex pattern');
    });

    it('should fail when pattern does not match', () => {
      const assertion: Assertion = {
        type: 'regex',
        pattern: '^Berlin',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('does not match regex pattern');
    });

    it('should handle complex regex patterns', () => {
      const assertion: Assertion = {
        type: 'regex',
        pattern: '[A-Z][a-z]+',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should fail when no pattern is provided', () => {
      const assertion: Assertion = {
        type: 'regex',
        value: 'test',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No pattern provided');
    });
  });

  describe('JSON Path Assertion', () => {
    it('should access nested values', () => {
      const assertion: Assertion = {
        type: 'json_path',
        path: 'choices.0.message.role',
        value: 'assistant',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should handle array indexing', () => {
      const assertion: Assertion = {
        type: 'json_path',
        path: 'choices.0.index',
        value: 0,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should return undefined for invalid paths', () => {
      const assertion: Assertion = {
        type: 'json_path',
        path: 'invalid.path.here',
        value: 'test',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.actual).toBeUndefined();
    });

    it('should fail when no path is provided', () => {
      const assertion: Assertion = {
        type: 'json_path',
        value: 'test',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No path provided');
    });
  });

  describe('Fuzzy Match Assertion', () => {
    it('should pass for very similar strings', () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'The capital of France is Paris',
        threshold: 0.9,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toMatch(/Similarity: \d+\.\d+%/);
    });

    it('should fail for dissimilar strings', () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'Completely different text about Berlin',
        threshold: 0.8,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should use default threshold of 0.8', () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'The capital of France is Paris.',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('threshold: 80%');
    });

    it('should handle identical strings', () => {
      const assertion: Assertion = {
        type: 'fuzzy_match',
        value: 'The capital of France is Paris.',
        threshold: 1.0,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Similarity: 100.0%');
    });
  });

  describe('Token Count Assertion', () => {
    it('should pass when token count is in range', () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 10,
        max: 30,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe(18);
    });

    it('should fail when token count is too low', () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 50,
        max: 100,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should fail when token count is too high', () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 1,
        max: 10,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should handle no maximum', () => {
      const assertion: Assertion = {
        type: 'token_count',
        min: 10,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.expected).toContain('∞');
    });

    it('should use response usage if metadata tokens missing', () => {
      const metadataWithoutTokens: TraceMetadata = {
        ...mockMetadata,
        tokens_used: undefined,
      };

      const assertion: Assertion = {
        type: 'token_count',
        min: 10,
        max: 30,
      };

      const result = evaluateAssertion(assertion, mockResponse, metadataWithoutTokens);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe(18);
    });
  });

  describe('Latency Assertion', () => {
    it('should pass when latency is in range', () => {
      const assertion: Assertion = {
        type: 'latency',
        max: 2000,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe('1200ms');
    });

    it('should fail when latency exceeds maximum', () => {
      const assertion: Assertion = {
        type: 'latency',
        max: 1000,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });

    it('should support minimum latency', () => {
      const assertion: Assertion = {
        type: 'latency',
        min: 1000,
        max: 2000,
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should use default max of 5000ms', () => {
      const assertion: Assertion = {
        type: 'latency',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(true);
      expect(result.expected).toBe('0-5000ms');
    });
  });

  describe('Error Handling', () => {
    it('should handle null response', () => {
      const assertion: Assertion = {
        type: 'exact',
        value: 'test',
      };

      const result = evaluateAssertion(assertion, null, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No response available');
    });

    it('should handle unknown assertion type', () => {
      const assertion: Assertion = {
        type: 'unknown_type' as any,
        value: 'test',
      };

      const result = evaluateAssertion(assertion, mockResponse, mockMetadata);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Unknown assertion type');
    });

    it('should handle empty response', () => {
      const emptyResponse: LLMResponse = {
        ...mockResponse,
        choices: [],
      };

      const assertion: Assertion = {
        type: 'contains',
        value: 'Paris',
      };

      const result = evaluateAssertion(assertion, emptyResponse, mockMetadata);
      expect(result.passed).toBe(false);
    });
  });

  describe('Evaluate Multiple Assertions', () => {
    it('should evaluate all assertions', () => {
      const assertions: Assertion[] = [
        { type: 'contains', value: 'Paris' },
        { type: 'contains', value: 'France' },
        { type: 'not_contains', value: 'Berlin' },
      ];

      const results = evaluateAssertions(assertions, mockResponse, mockMetadata);
      
      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
      expect(results[2].passed).toBe(true);
    });

    it('should include failed assertions', () => {
      const assertions: Assertion[] = [
        { type: 'contains', value: 'Paris' },
        { type: 'contains', value: 'Berlin' },
      ];

      const results = evaluateAssertions(assertions, mockResponse, mockMetadata);
      
      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
    });

    it('should handle empty assertion list', () => {
      const results = evaluateAssertions([], mockResponse, mockMetadata);
      expect(results).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle response with text instead of message', () => {
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

      const result = evaluateAssertion(assertion, textResponse, mockMetadata);
      expect(result.passed).toBe(true);
    });

    it('should handle response without usage', () => {
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
      const result = evaluateAssertion(assertion, responseNoUsage, metadataNoTokens);
      expect(result.passed).toBe(true);
      expect(typeof result.actual).toBe('number');
    });
  });
});
