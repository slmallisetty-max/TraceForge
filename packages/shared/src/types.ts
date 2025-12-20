// Core types for TraceForge

export interface Trace {
  schema_version?: string;       // Schema version for migrations
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  endpoint: string;              // e.g., "/v1/chat/completions"
  request: LLMRequest;
  response: LLMResponse | null;
  metadata: TraceMetadata;
}

export interface TraceMetadata {
  duration_ms: number;
  tokens_used?: number;
  model?: string;
  status: 'success' | 'error';
  error?: string;
}

// OpenAI-compatible request types
export interface LLMRequest {
  model: string;
  messages?: ChatMessage[];
  prompt?: string | string[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  n?: number;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

// OpenAI-compatible response types
export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage?: Usage;
}

export interface Choice {
  index: number;
  message?: ChatMessage;
  text?: string;
  finish_reason: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Test structure
export interface Test {
  id: string;
  name: string;
  description?: string;
  trace_id?: string;
  request: LLMRequest;
  assertions: Assertion[];
  created_at: string;
  fixtures?: TestFixtures;
  tags?: string[];
  timeout?: number;  // Test timeout in milliseconds
}

export interface TestFixtures {
  setup?: string[];    // Commands to run before test
  teardown?: string[]; // Commands to run after test
  env?: Record<string, string>; // Environment variables
}

export type AssertionType = 
  | 'exact'
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'json_path'
  | 'fuzzy_match'
  | 'token_count'
  | 'latency';

export interface Assertion {
  type: AssertionType;
  field?: string;       // JSON path to field (e.g., "choices.0.message.content")
  value?: any;          // Expected value for exact, contains, json_path
  pattern?: string;     // Regex pattern for regex type
  path?: string;        // JSONPath expression for json_path type
  threshold?: number;   // Similarity threshold for fuzzy_match (0-1)
  min?: number;         // Minimum value for token_count or latency
  max?: number;         // Maximum value for token_count or latency
  description?: string; // Human-readable description
}

export interface TestResult {
  test_id: string;
  passed: boolean;
  assertions: AssertionResult[];
  response: LLMResponse | null;
  error?: string;
  duration_ms: number;
  timestamp: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual?: any;
  expected?: any;
  message?: string;
  error?: string;
}

// Configuration
export interface Config {
  upstream_url: string;
  api_key_env_var: string;
  save_traces: boolean;
  proxy_port: number;
  web_port?: number;
  max_trace_retention?: number;  // days
  redact_fields?: string[];
  providers?: ProviderConfig[];
}

export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  base_url: string;
  api_key_env_var?: string;
  enabled?: boolean;
  default?: boolean;
}

// Embedding types
export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
}

export interface EmbeddingResponse {
  object: string;
  data: EmbeddingData[];
  model: string;
  usage: Usage;
}

export interface EmbeddingData {
  object: string;
  embedding: number[];
  index: number;
}

// Streaming types
export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
  delta_ms?: number;  // Time since previous chunk
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finish_reason?: string | null;
}

export interface StreamingTrace extends Trace {
  chunks: StreamChunk[];
  total_chunks: number;
  stream_duration_ms: number;
  first_chunk_latency_ms: number;
}
