// Zod schemas for runtime validation
import { z } from 'zod';

// Schema version - increment when making breaking changes
export const TRACE_SCHEMA_VERSION = '1.0.0';

// Chat message schema
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.string(),
  name: z.string().optional(),
});

// LLM Request schema
export const LLMRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema).optional(),
  prompt: z.union([z.string(), z.array(z.string())]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  stream: z.boolean().optional(),
  n: z.number().positive().optional(),
}).passthrough();

// Usage schema
export const UsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

// Choice schema
export const ChoiceSchema = z.object({
  index: z.number(),
  message: ChatMessageSchema.optional(),
  text: z.string().optional(),
  finish_reason: z.string(),
});

// LLM Response schema
export const LLMResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChoiceSchema),
  usage: UsageSchema.optional(),
});

// Trace metadata schema
export const TraceMetadataSchema = z.object({
  duration_ms: z.number(),
  tokens_used: z.number().optional(),
  model: z.string().optional(),
  status: z.enum(['success', 'error']),
  error: z.string().optional(),
});

// Trace schema
export const TraceSchema = z.object({
  schema_version: z.string().default(TRACE_SCHEMA_VERSION),
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  endpoint: z.string(),
  request: LLMRequestSchema,
  response: LLMResponseSchema.nullable(),
  metadata: TraceMetadataSchema,
});

// Assertion schema
export const AssertionSchema = z.object({
  type: z.enum(['exact', 'contains', 'not_contains', 'regex']),
  field: z.string().optional(),
  value: z.string(),
});

// Test schema
export const TestSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  trace_id: z.string().uuid().optional(),
  request: LLMRequestSchema,
  assertions: z.array(AssertionSchema),
  created_at: z.string().datetime(),
});

// Config schema
export const ConfigSchema = z.object({
  upstream_url: z.string().url(),
  api_key_env_var: z.string(),
  save_traces: z.boolean(),
  proxy_port: z.number().positive(),
  web_port: z.number().positive().optional(),
  max_trace_retention: z.number().positive().optional(),
  redact_fields: z.array(z.string()).optional(),
});

// Embedding schemas
export const EmbeddingRequestSchema = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
  user: z.string().optional(),
});

export const EmbeddingDataSchema = z.object({
  object: z.string(),
  embedding: z.array(z.number()),
  index: z.number(),
});

export const EmbeddingResponseSchema = z.object({
  object: z.string(),
  data: z.array(EmbeddingDataSchema),
  model: z.string(),
  usage: UsageSchema,
});
