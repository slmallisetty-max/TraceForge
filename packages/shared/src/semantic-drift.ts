import { getDefaultEmbeddingService, cosineSimilarity } from './embeddings.js';
import type { Trace } from './types.js';

export interface DriftResult {
  similarity: number;
  isDrift: boolean;
  threshold: number;
  baselineText: string;
  currentText: string;
}

export interface DriftAnalysisOptions {
  threshold?: number; // Default: 0.90
  embeddingModel?: string;
}

/**
 * Calculate semantic drift between two traces
 */
export async function calculateSemanticDrift(
  baselineTrace: Trace,
  currentTrace: Trace,
  options: DriftAnalysisOptions = {}
): Promise<DriftResult> {
  const threshold = options.threshold ?? 0.90;

  // Extract response text
  const baselineText = extractResponseText(baselineTrace);
  const currentText = extractResponseText(currentTrace);

  if (!baselineText || !currentText) {
    throw new Error('Both traces must have response content');
  }

  // Get embedding service
  const embeddingService = getDefaultEmbeddingService();

  // Generate embeddings
  const [baselineEmbedding, currentEmbedding] = await Promise.all([
    embeddingService.generateEmbedding(baselineText),
    embeddingService.generateEmbedding(currentText)
  ]);

  // Calculate cosine similarity
  const similarity = cosineSimilarity(baselineEmbedding, currentEmbedding);

  return {
    similarity,
    isDrift: similarity < threshold,
    threshold,
    baselineText,
    currentText
  };
}

/**
 * Batch drift analysis for multiple trace pairs
 */
export async function batchDriftAnalysis(
  tracePairs: Array<{ baseline: Trace; current: Trace }>,
  options: DriftAnalysisOptions = {}
): Promise<DriftResult[]> {
  return Promise.all(
    tracePairs.map(({ baseline, current }) =>
      calculateSemanticDrift(baseline, current, options)
    )
  );
}

/**
 * Extract response text from trace
 */
function extractResponseText(trace: Trace): string | null {
  if (!trace.response) return null;

  // Chat completion format
  if (trace.response.choices?.[0]?.message?.content) {
    return trace.response.choices[0].message.content;
  }

  // Legacy completion format
  if (trace.response.choices?.[0]?.text) {
    return trace.response.choices[0].text;
  }

  return null;
}

/**
 * Calculate aggregate drift score for a test suite
 */
export function calculateAggregateDrift(results: DriftResult[]): {
  avgSimilarity: number;
  driftCount: number;
  driftPercentage: number;
  minSimilarity: number;
  maxSimilarity: number;
} {
  if (results.length === 0) {
    return {
      avgSimilarity: 1.0,
      driftCount: 0,
      driftPercentage: 0,
      minSimilarity: 1.0,
      maxSimilarity: 1.0
    };
  }

  const similarities = results.map(r => r.similarity);
  const driftCount = results.filter(r => r.isDrift).length;

  return {
    avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
    driftCount,
    driftPercentage: (driftCount / results.length) * 100,
    minSimilarity: Math.min(...similarities),
    maxSimilarity: Math.max(...similarities)
  };
}
