import type { Trace, Test } from '@traceforge/shared';

const API_BASE = '/api';

export async function fetchTraces(): Promise<Trace[]> {
  const response = await fetch(`${API_BASE}/traces`);
  if (!response.ok) {
    throw new Error('Failed to fetch traces');
  }
  const data = await response.json();
  return data.traces;
}

export async function fetchTrace(id: string): Promise<Trace> {
  const response = await fetch(`${API_BASE}/traces/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch trace');
  }
  const data = await response.json();
  return data.trace;
}

export async function createTestFromTrace(
  traceId: string,
  name: string,
  description?: string
): Promise<Test> {
  const response = await fetch(`${API_BASE}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ traceId, name, description }),
  });

  if (!response.ok) {
    throw new Error('Failed to create test');
  }

  const data = await response.json();
  return data.test;
}

export async function fetchTests(): Promise<Test[]> {
  const response = await fetch(`${API_BASE}/tests`);
  if (!response.ok) {
    throw new Error('Failed to fetch tests');
  }
  const data = await response.json();
  return data.tests;
}

export interface AnalyticsData {
  overview: {
    total_traces: number;
    total_tests: number;
    traces_last_7_days: number;
    traces_last_24_hours: number;
    success_rate: number;
    streaming_rate: number;
  };
  performance: {
    avg_duration_ms: number;
    avg_tokens: number;
  };
  models: Array<{ model: string; count: number }>;
  endpoints: Array<{ endpoint: string; count: number }>;
  timeline: Array<{
    date: string;
    count: number;
    success: number;
    error: number;
  }>;
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const response = await fetch(`${API_BASE}/analytics`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
}

export interface Config {
  upstream_url: string;
  api_key_env_var: string;
  save_traces: boolean;
  proxy_port: number;
  web_port?: number;
  max_trace_retention?: number;
  redact_fields?: string[];
}

export async function fetchConfig(): Promise<Config> {
  const response = await fetch(`${API_BASE}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
}

export async function updateConfig(config: Config): Promise<{ success: boolean; config: Config }> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update config');
  }

  return response.json();
}
