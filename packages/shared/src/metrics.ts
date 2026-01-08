// Prometheus Metrics Module for TraceForge
// This module provides observability metrics for the proxy and API servers

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry to register the metrics
export const register = new Registry();

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // Response time buckets in seconds
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// LLM Provider Metrics
export const llmRequestDuration = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'Duration of LLM API requests in seconds',
  labelNames: ['provider', 'model'],
  buckets: [0.5, 1, 2, 5, 10, 30], // LLM calls are typically slower
  registers: [register],
});

export const llmRequestTokens = new Histogram({
  name: 'llm_request_tokens',
  help: 'Number of tokens used in LLM requests',
  labelNames: ['provider', 'model', 'token_type'],
  buckets: [10, 50, 100, 500, 1000, 2000, 4000, 8000],
  registers: [register],
});

export const llmRequestErrors = new Counter({
  name: 'llm_request_errors_total',
  help: 'Total number of LLM request errors',
  labelNames: ['provider', 'model', 'error_type'],
  registers: [register],
});

// VCR Metrics
export const vcrCassetteReads = new Counter({
  name: 'vcr_cassette_reads_total',
  help: 'Total number of cassette reads',
  labelNames: ['mode'],
  registers: [register],
});

export const vcrCassetteWrites = new Counter({
  name: 'vcr_cassette_writes_total',
  help: 'Total number of cassette writes',
  labelNames: ['mode'],
  registers: [register],
});

export const vcrCassetteSize = new Gauge({
  name: 'vcr_cassette_size_bytes',
  help: 'Size of VCR cassette files in bytes',
  labelNames: ['cassette_name'],
  registers: [register],
});

export const vcrCacheMisses = new Counter({
  name: 'vcr_cache_misses_total',
  help: 'Total number of VCR cache misses (cassette not found)',
  registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const dbLockWaitTime = new Histogram({
  name: 'db_lock_wait_time_seconds',
  help: 'Time spent waiting for database locks',
  labelNames: ['table'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Storage Metrics
export const storageSpaceUsed = new Gauge({
  name: 'storage_space_used_bytes',
  help: 'Disk space used by traces and cassettes',
  labelNames: ['storage_type'],
  registers: [register],
});

export const traceCount = new Gauge({
  name: 'traces_total',
  help: 'Total number of traces stored',
  labelNames: ['storage_backend'],
  registers: [register],
});

// System Metrics
export const memoryUsage = new Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage',
  labelNames: ['type'],
  registers: [register],
});

// Update memory metrics periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, usage.rss);
  memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
  memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
  memoryUsage.set({ type: 'external' }, usage.external);
}, 10000); // Update every 10 seconds

// Helper function to record HTTP request metrics
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
) {
  httpRequestDuration
    .labels(method, route, statusCode.toString())
    .observe(durationSeconds);
  httpRequestTotal.labels(method, route, statusCode.toString()).inc();
}

// Helper function to record LLM request metrics
export function recordLLMRequest(
  provider: string,
  model: string,
  durationSeconds: number,
  promptTokens?: number,
  completionTokens?: number
) {
  llmRequestDuration.labels(provider, model).observe(durationSeconds);
  
  if (promptTokens !== undefined) {
    llmRequestTokens.labels(provider, model, 'prompt').observe(promptTokens);
  }
  
  if (completionTokens !== undefined) {
    llmRequestTokens.labels(provider, model, 'completion').observe(completionTokens);
  }
}

// Helper function to record database query metrics
export function recordDatabaseQuery(
  operation: string,
  table: string,
  durationSeconds: number
) {
  dbQueryDuration.labels(operation, table).observe(durationSeconds);
}

// Export metrics in Prometheus format
export async function getMetrics(): Promise<string> {
  return register.metrics();
}
