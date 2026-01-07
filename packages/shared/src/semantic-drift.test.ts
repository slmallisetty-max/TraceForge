import { describe, it, expect } from 'vitest';
import { calculateSemanticDrift, batchDriftAnalysis, calculateAggregateDrift } from './semantic-drift.js';
import type { Trace } from './types.js';

// Helper function to create test traces
function createTrace(content: string, model: string = 'gpt-4'): Trace {
  return {
    id: 'test-trace-' + Math.random(),
    timestamp: new Date().toISOString(),
    endpoint: '/v1/chat/completions',
    request: {
      model,
      messages: [
        {
          role: 'user',
          content: 'Test prompt'
        }
      ],
      temperature: 0.7
    },
    response: {
      id: 'resp-' + Math.random(),
      object: 'chat.completion',
      created: Date.now(),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    },
    metadata: {
      duration_ms: 1000,
      model,
      status: 'success' as const
    }
  };
}

describe('Semantic Drift Detection', () => {
  it('detects identical responses', async () => {
    const baseline = createTrace('Hello world');
    const current = createTrace('Hello world');

    const drift = await calculateSemanticDrift(baseline, current);

    expect(drift.similarity).toBeGreaterThan(0.99);
    expect(drift.isDrift).toBe(false);
  });

  it('detects paraphrases as similar', async () => {
    const baseline = createTrace('The capital of France is Paris');
    const current = createTrace('Paris is the capital city of France');

    const drift = await calculateSemanticDrift(baseline, current);

    expect(drift.similarity).toBeGreaterThan(0.85);
    expect(drift.similarity).toBeLessThan(0.99);
  });

  it('detects critical changes', async () => {
    const baseline = createTrace('I cannot help with illegal activities');
    const current = createTrace('Here is how to hack systems');

    const drift = await calculateSemanticDrift(baseline, current);

    expect(drift.similarity).toBeLessThan(0.5);
    expect(drift.isDrift).toBe(true);
  });

  it('respects custom threshold', async () => {
    const baseline = createTrace('The weather is nice today');
    const current = createTrace('It is a beautiful day');

    const driftDefault = await calculateSemanticDrift(baseline, current);
    const driftStrict = await calculateSemanticDrift(baseline, current, { threshold: 0.95 });

    expect(driftDefault.isDrift).toBe(false);
    expect(driftStrict.isDrift).toBe(true);
  });

  it('handles empty responses', async () => {
    const baseline = createTrace('');
    const current = createTrace('');

    await expect(calculateSemanticDrift(baseline, current)).rejects.toThrow('Both traces must have response content');
  });

  it('batch analysis works correctly', async () => {
    const pairs = [
      {
        baseline: createTrace('Hello world'),
        current: createTrace('Hello world')
      },
      {
        baseline: createTrace('The capital of France is Paris'),
        current: createTrace('Paris is the capital city of France')
      }
    ];

    const results = await batchDriftAnalysis(pairs);

    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThan(0.99);
    expect(results[1].similarity).toBeGreaterThan(0.85);
  });

  it('calculates aggregate drift correctly', () => {
    const results = [
      {
        similarity: 0.95,
        isDrift: false,
        threshold: 0.90,
        baselineText: 'test1',
        currentText: 'test1'
      },
      {
        similarity: 0.85,
        isDrift: true,
        threshold: 0.90,
        baselineText: 'test2',
        currentText: 'test2 modified'
      },
      {
        similarity: 0.92,
        isDrift: false,
        threshold: 0.90,
        baselineText: 'test3',
        currentText: 'test3'
      }
    ];

    const aggregate = calculateAggregateDrift(results);

    expect(aggregate.avgSimilarity).toBeCloseTo(0.906, 2);
    expect(aggregate.driftCount).toBe(1);
    expect(aggregate.driftPercentage).toBeCloseTo(33.33, 1);
    expect(aggregate.minSimilarity).toBe(0.85);
    expect(aggregate.maxSimilarity).toBe(0.95);
  });

  it('handles empty result set', () => {
    const aggregate = calculateAggregateDrift([]);

    expect(aggregate.avgSimilarity).toBe(1.0);
    expect(aggregate.driftCount).toBe(0);
    expect(aggregate.driftPercentage).toBe(0);
    expect(aggregate.minSimilarity).toBe(1.0);
    expect(aggregate.maxSimilarity).toBe(1.0);
  });
});
