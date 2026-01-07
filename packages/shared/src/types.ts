// Core types for TraceForge

export interface Trace {
  schema_version?: string; // Schema version for migrations
  id: string; // UUID
  timestamp: string; // ISO 8601
  endpoint: string; // e.g., "/v1/chat/completions"
  request: LLMRequest;
  response: LLMResponse | null;
  metadata: TraceMetadata;
  // Session tracking fields (v0.5.0+)
  session_id?: string; // Groups related traces into a session
  step_index?: number; // Sequential order within the session (0-based)
  parent_trace_id?: string; // For hierarchical agent relationships
  state_snapshot?: Record<string, any>; // Environment/tool state at this step
  // DAG step tracking (v0.6.0+)
  step_id?: string; // Unique identifier for this step (supports branching)
  parent_step_id?: string; // Parent step in DAG (supports fan-out/fan-in)
  // Organizational scope (v0.6.0+)
  organization_id?: string; // Organization owning this trace
  service_id?: string; // Service/team within organization
}

export interface TraceMetadata {
  duration_ms: number;
  tokens_used?: number;
  model?: string;
  status: "success" | "error";
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
  seed?: number; // OpenAI seed for deterministic outputs
  [key: string]: unknown;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function";
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
  timeout?: number; // Test timeout in milliseconds
  policy_contracts?: string[]; // Policy IDs to enforce
}

export interface TestFixtures {
  setup?: string[]; // Commands to run before test
  teardown?: string[]; // Commands to run after test
  env?: Record<string, string>; // Environment variables
}

export type AssertionType =
  | "exact"
  | "contains"
  | "not_contains"
  | "regex"
  | "json_path"
  | "fuzzy_match"
  | "token_count"
  | "latency"
  // Semantic assertions (2026 Q1)
  | "semantic"
  | "semantic-contradiction"
  | "semantic-intent"
  | "policy";

export interface Assertion {
  type: AssertionType;
  field?: string; // JSON path to field (e.g., "choices.0.message.content")
  value?: any; // Expected value for exact, contains, json_path
  pattern?: string; // Regex pattern for regex type
  path?: string; // JSONPath expression for json_path type
  threshold?: number; // Similarity threshold for fuzzy_match (0-1) or semantic (0-1)
  min?: number; // Minimum value for token_count or latency
  max?: number; // Maximum value for token_count or latency
  description?: string; // Human-readable description

  // Semantic assertion fields (2026 Q1)
  expected?: string; // Expected text (for semantic)
  forbidden?: string[]; // Forbidden meanings (for semantic-contradiction)
  expected_intent?: string; // Expected intent label (for semantic-intent)
  confidence_threshold?: number; // Confidence minimum (0-1)
  embedding_model?: string; // Override embedding model
  use_cache?: boolean; // Use cached embeddings (default: true)

  // Policy assertion fields (2026 Q1)
  policies?: string[]; // Policy names to enforce
  fail_on_severity?: "low" | "medium" | "high" | "critical"; // Minimum severity to fail
  tags?: string[]; // Tags for policy matching
}

export interface TestResult {
  test_id: string;
  passed: boolean;
  assertions: AssertionResult[];
  response: LLMResponse | null;
  error?: string;
  duration_ms: number;
  timestamp: string;
  policy_violations?: any[]; // Policy violations if policies enabled
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual?: any;
  expected?: any;
  message?: string;
  error?: string;
}

// CI Gating types (2026 Q1)
export interface QualityGateResult {
  passed: boolean; // Overall gate pass/fail
  test_results: TestResult[]; // All test results
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  pass_rate: number; // 0-100
  policy_violations_count: number;
  max_risk_severity: number; // Highest risk severity found
  gate_failures: GateFailure[]; // Specific gate failures
  timestamp: string;
  duration_ms: number;
}

export interface GateFailure {
  gate: string; // Which gate failed
  reason: string; // Why it failed
  threshold?: number; // Expected threshold
  actual?: number; // Actual value
  severity: "critical" | "high" | "medium" | "low";
}

// VCR types
export type VCRMode = "off" | "record" | "replay" | "auto" | "strict";
export type VCRMatchMode = "exact" | "fuzzy";

export interface VCRConfig {
  mode: VCRMode;
  match_mode: VCRMatchMode;
  cassettes_dir: string;
  signature_secret?: string; // Secret for HMAC cassette signatures
}

export interface Cassette {
  cassette_version: string;
  provider: string;
  request: LLMRequest;
  response: {
    status: number;
    headers: Record<string, string>;
    body: LLMResponse | { error: any };
  };
  recorded_at: string;
  signature?: string; // HMAC signature for integrity verification
}

// Configuration
export interface Config {
  upstream_url: string;
  api_key_env_var: string;
  save_traces: boolean;
  proxy_port: number;
  web_port?: number;
  max_trace_retention?: number; // days
  redact_fields?: string[];
  providers?: ProviderConfig[];
  vcr?: VCRConfig;
  embedding?: EmbeddingConfig; // 2026 Q1: Semantic assertions
  risk_scoring?: RiskScoringConfig; // 2026 Q1: Risk scoring
  policies?: PolicyConfig; // 2026 Q1: Policy contracts
  ci_gating?: CIGatingConfig; // 2026 Q1: CI quality gates
}

export interface RiskScoringConfig {
  enabled?: boolean; // Default: true
  fail_on?: "safety" | "semantic" | "cosmetic" | "never"; // Default: 'safety'
  min_severity?: number; // 1-10, fail if severity >= this. Default: 8
  allow_cosmetic?: boolean; // Allow cosmetic changes without review. Default: true
  require_approval_for?: ("safety" | "semantic")[]; // Default: ['safety']
  auto_approve_below?: number; // Auto-approve if severity < this. Default: 4
}

export interface PolicyConfig {
  enabled?: boolean; // Default: true
  contracts?: string[]; // Policy contract IDs to apply
  fail_on?: "critical" | "high" | "medium" | "low" | "never"; // Default: 'critical'
  custom_contracts?: string; // Path to custom policy contracts file
}

export interface CIGatingConfig {
  enabled?: boolean; // Default: true in CI
  fail_on_test_failure?: boolean; // Default: true
  fail_on_policy_violations?: boolean; // Default: true
  fail_on_risk_threshold?: boolean; // Default: true
  max_risk_severity?: number; // 1-10, fail if any test >= this. Default: 8
  min_pass_rate?: number; // 0-100, fail if pass rate < this. Default: 90
  require_baselines?: boolean; // Fail if tests have no baseline. Default: false
  generate_badge?: boolean; // Generate status badge. Default: true
  badge_path?: string; // Badge output path. Default: .ai-tests/badge.svg
  summary_path?: string; // Summary output path. Default: .ai-tests/summary.md
}

export interface EmbeddingConfig {
  provider: "openai" | "anthropic" | "local";
  model?: string; // e.g., 'text-embedding-3-small'
  api_key_env_var?: string; // Default: OPENAI_API_KEY
  base_url?: string; // Custom endpoint
  cache_enabled?: boolean; // Default: true
  cache_dir?: string; // Default: .ai-tests/embeddings
}

export type ProviderType = "openai" | "anthropic" | "gemini" | "ollama";

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
  delta_ms?: number; // Time since previous chunk
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

// Session Metadata (v0.5.0+)
export interface SessionMetadata {
  session_id: string;
  total_steps: number;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  models_used: string[];
  total_tokens?: number;
  status: "in_progress" | "completed" | "failed";
}
