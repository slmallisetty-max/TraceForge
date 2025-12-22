import { describe, it, expect } from 'vitest';
import {
  ChatMessageSchema,
  LLMRequestSchema,
  LLMResponseSchema,
  TraceSchema,
  ConfigSchema,
  EmbeddingRequestSchema,
  TRACE_SCHEMA_VERSION,
} from '../src/schema';

describe('Schema Validation', () => {
  describe('ChatMessageSchema', () => {
    it('should validate valid chat message', () => {
      const validMessage = {
        role: 'user',
        content: 'Hello, world!',
      };

      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should validate message with optional name', () => {
      const messageWithName = {
        role: 'function',
        content: 'Function result',
        name: 'get_weather',
      };

      expect(() => ChatMessageSchema.parse(messageWithName)).not.toThrow();
    });

    it('should reject invalid role', () => {
      const invalidMessage = {
        role: 'invalid_role',
        content: 'Test',
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject missing content', () => {
      const invalidMessage = {
        role: 'user',
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });
  });

  describe('LLMRequestSchema', () => {
    it('should validate chat completion request', () => {
      const validRequest = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.7,
        max_tokens: 100,
      };

      expect(() => LLMRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate completion request with prompt', () => {
      const validRequest = {
        model: 'gpt-3.5-turbo-instruct',
        prompt: 'Once upon a time',
        temperature: 0.5,
      };

      expect(() => LLMRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate request with array prompt', () => {
      const validRequest = {
        model: 'gpt-4',
        prompt: ['Prompt 1', 'Prompt 2'],
      };

      expect(() => LLMRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject invalid temperature', () => {
      const invalidRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 3.0, // Too high
      };

      expect(() => LLMRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject negative max_tokens', () => {
      const invalidRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: -10,
      };

      expect(() => LLMRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should accept stream parameter', () => {
      const validRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      };

      expect(() => LLMRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should allow passthrough for additional fields', () => {
      const requestWithExtra = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        custom_field: 'custom_value',
      };

      const parsed = LLMRequestSchema.parse(requestWithExtra);
      expect((parsed as any).custom_field).toBe('custom_value');
    });
  });

  describe('LLMResponseSchema', () => {
    it('should validate complete response', () => {
      const validResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      expect(() => LLMResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('should allow optional usage', () => {
      const responseWithoutUsage = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
      };

      expect(() => LLMResponseSchema.parse(responseWithoutUsage)).not.toThrow();
    });

    it('should allow empty choices array for streaming', () => {
      // Streaming responses may have empty choices initially
      const responseWithoutChoices = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
        choices: [],
      };

      expect(() => LLMResponseSchema.parse(responseWithoutChoices)).not.toThrow();
    });
  });

  describe('TraceSchema', () => {
    it('should validate complete trace', () => {
      const validTrace = {
        schema_version: TRACE_SCHEMA_VERSION,
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2025-01-01T12:00:00.000Z',
        endpoint: '/v1/chat/completions',
        request: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        response: {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hi!' },
              finish_reason: 'stop',
            },
          ],
        },
        metadata: {
          duration_ms: 1200,
          tokens_used: 20,
          model: 'gpt-4',
          status: 'success',
        },
      };

      expect(() => TraceSchema.parse(validTrace)).not.toThrow();
    });

    it('should add default schema version', () => {
      const traceWithoutVersion = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2025-01-01T12:00:00.000Z',
        endpoint: '/v1/chat/completions',
        request: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        },
        response: null,
        metadata: {
          duration_ms: 1200,
          status: 'error',
          error: 'Timeout',
        },
      };

      const parsed = TraceSchema.parse(traceWithoutVersion);
      expect(parsed.schema_version).toBe(TRACE_SCHEMA_VERSION);
    });

    it('should allow null response for error traces', () => {
      const errorTrace = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2025-01-01T12:00:00.000Z',
        endpoint: '/v1/chat/completions',
        request: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        },
        response: null,
        metadata: {
          duration_ms: 5000,
          status: 'error',
          error: 'Request timeout',
        },
      };

      expect(() => TraceSchema.parse(errorTrace)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalidTrace = {
        id: 'not-a-uuid',
        timestamp: '2025-01-01T12:00:00.000Z',
        endpoint: '/v1/chat/completions',
        request: { model: 'gpt-4', messages: [] },
        response: null,
        metadata: { duration_ms: 100, status: 'success' },
      };

      expect(() => TraceSchema.parse(invalidTrace)).toThrow();
    });

    it('should reject invalid timestamp', () => {
      const invalidTrace = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 'not-a-datetime',
        endpoint: '/v1/chat/completions',
        request: { model: 'gpt-4', messages: [] },
        response: null,
        metadata: { duration_ms: 100, status: 'success' },
      };

      expect(() => TraceSchema.parse(invalidTrace)).toThrow();
    });
  });

  describe('ConfigSchema', () => {
    it('should validate complete config', () => {
      const validConfig = {
        upstream_url: 'https://api.openai.com',
        api_key_env_var: 'OPENAI_API_KEY',
        save_traces: true,
        proxy_port: 8787,
        web_port: 3000,
        max_trace_retention: 30,
        redact_fields: ['password', 'api_key'],
      };

      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid URL', () => {
      const invalidConfig = {
        upstream_url: 'not-a-url',
        api_key_env_var: 'API_KEY',
        save_traces: true,
        proxy_port: 8787,
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid port', () => {
      const invalidConfig = {
        upstream_url: 'https://api.example.com',
        api_key_env_var: 'API_KEY',
        save_traces: true,
        proxy_port: -1,
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should accept optional fields', () => {
      const minimalConfig = {
        upstream_url: 'https://api.openai.com',
        api_key_env_var: 'OPENAI_API_KEY',
        save_traces: true,
        proxy_port: 8787,
      };

      expect(() => ConfigSchema.parse(minimalConfig)).not.toThrow();
    });
  });

  describe('EmbeddingRequestSchema', () => {
    it('should validate request with string input', () => {
      const validRequest = {
        model: 'text-embedding-ada-002',
        input: 'Hello, world!',
      };

      expect(() => EmbeddingRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate request with array input', () => {
      const validRequest = {
        model: 'text-embedding-ada-002',
        input: ['First text', 'Second text'],
      };

      expect(() => EmbeddingRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should accept optional user field', () => {
      const validRequest = {
        model: 'text-embedding-ada-002',
        input: 'Test',
        user: 'user-123',
      };

      expect(() => EmbeddingRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject missing model', () => {
      const invalidRequest = {
        input: 'Test',
      };

      expect(() => EmbeddingRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject missing input', () => {
      const invalidRequest = {
        model: 'text-embedding-ada-002',
      };

      expect(() => EmbeddingRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});
