/**
 * Risk Scoring Engine for TraceForge
 * Automatically classifies changes between traces by severity
 */

import { cosineSimilarity, getDefaultEmbeddingService } from './embeddings.js';
import type { DriftResult } from './semantic-drift.js';
import type { CriticAnalysis } from './critic-agent.js';

// Type definitions (avoid circular import)
interface TraceMetadata {
  duration_ms: number;
  tokens_used?: number;
  [key: string]: any;
}

/**
 * Risk factors analyzed when comparing two traces
 */
export interface RiskFactors {
  // Content changes
  length_delta: number;           // % change in response length
  semantic_similarity: number;    // 0-1 cosine similarity
  word_overlap: number;           // Jaccard similarity (0-1)
  
  // Behavior changes
  tone_shift: number;             // Sentiment delta (-1 to 1)
  format_change: boolean;         // Structure changed (JSON → text)
  
  // Safety signals
  policy_violations: string[];    // Matched forbidden patterns
  confidence_drop?: number;       // Model confidence delta
  hallucination_risk?: number;    // 0-1 estimated risk (future)
  
  // Metadata changes
  latency_delta?: number;         // % change in response time
  token_delta?: number;           // % change in token usage
}

/**
 * Risk classification result
 */
export interface RiskScore {
  category: 'cosmetic' | 'semantic' | 'safety';
  severity: number;               // 1-10 scale
  factors: RiskFactors;
  recommendation: 'approve' | 'review' | 'block';
  explanation: string;
  confidence: number;             // 0-1 confidence in classification
}

/**
 * Extract text content from LLM response
 */
function extractResponseText(response: any | null): string {
  if (!response || !response.choices || response.choices.length === 0) {
    return '';
  }

  const choice = response.choices[0];
  
  // Chat completion format
  if (choice.message?.content) {
    return choice.message.content;
  }
  
  // Legacy completion format
  if (choice.text) {
    return choice.text;
  }
  
  return '';
}

/**
 * Calculate percentage change between two numbers
 */
function calculateDelta(baseline: number, current: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Calculate Jaccard similarity (word overlap) between two texts
 */
function calculateWordOverlap(baseline: string, current: string): number {
  const baselineWords = new Set(baseline.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const currentWords = new Set(current.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  
  if (baselineWords.size === 0 && currentWords.size === 0) {
    return 1.0; // Both empty = perfect match
  }
  
  if (baselineWords.size === 0 || currentWords.size === 0) {
    return 0.0; // One empty, one not = no overlap
  }
  
  const intersection = new Set(
    [...baselineWords].filter(w => currentWords.has(w))
  );
  const union = new Set([...baselineWords, ...currentWords]);
  
  return intersection.size / union.size;
}

/**
 * Detect if response format changed (e.g., JSON → plain text)
 */
function detectFormatChange(baseline: string, current: string): boolean {
  const isJSON = (s: string): boolean => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  };
  
  const hasCodeBlock = (s: string): boolean => /```/.test(s);
  const hasList = (s: string): boolean => /^[\s]*[-*]\s/m.test(s);
  const hasNumberedList = (s: string): boolean => /^[\s]*\d+\.\s/m.test(s);
  
  // Check format changes
  if (isJSON(baseline) !== isJSON(current)) return true;
  if (hasCodeBlock(baseline) !== hasCodeBlock(current)) return true;
  if (hasList(baseline) !== hasList(current)) return true;
  if (hasNumberedList(baseline) !== hasNumberedList(current)) return true;
  
  return false;
}

/**
 * Estimate sentiment/tone (-1 to 1)
 * Simple heuristic based on positive/negative word counts
 */
function estimateTone(text: string): number {
  const positiveWords = [
    'good', 'great', 'excellent', 'wonderful', 'fantastic', 'amazing',
    'happy', 'joy', 'love', 'best', 'perfect', 'success', 'helpful',
    'positive', 'beautiful', 'brilliant', 'outstanding'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'sad',
    'angry', 'error', 'fail', 'wrong', 'problem', 'issue', 'difficult',
    'negative', 'poor', 'disappointing', 'unfortunate'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of words) {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  }
  
  const total = positiveCount + negativeCount;
  if (total === 0) return 0;
  
  return (positiveCount - negativeCount) / total;
}

/**
 * Classify risk severity with custom thresholds
 */
function classifyRiskWithThresholds(
  factors: RiskFactors,
  semanticThreshold: number,
  lengthThreshold: number,
  toneThreshold: number
): number {
  let severity = 1;

  // Safety violations → immediate high severity
  if (factors.policy_violations.length > 0) {
    severity = Math.max(severity, 8 + Math.min(factors.policy_violations.length, 2));
  }

  // Semantic similarity → primary indicator (with custom threshold)
  const semanticDiff = 1 - factors.semantic_similarity;
  if (semanticDiff > (1 - 0.4)) {
    severity = Math.max(severity, 9);
  } else if (semanticDiff > (1 - 0.5)) {
    severity = Math.max(severity, 8);
  } else if (semanticDiff > (1 - 0.6)) {
    severity = Math.max(severity, 7);
  } else if (semanticDiff > (1 - 0.7)) {
    severity = Math.max(severity, 6);
  } else if (semanticDiff > (1 - semanticThreshold)) {
    severity = Math.max(severity, 4);
  } else if (semanticDiff > 0.05) {
    severity = Math.max(severity, 2);
  }

  // Format changes → moderate concern
  if (factors.format_change) {
    severity = Math.max(severity, 5);
  }

  // Length changes (with custom threshold)
  const absLengthDelta = Math.abs(factors.length_delta);
  if (absLengthDelta > 1.0) {
    severity = Math.max(severity, 5);
  } else if (absLengthDelta > lengthThreshold) {
    severity = Math.max(severity, 4);
  } else if (absLengthDelta > lengthThreshold / 2) {
    severity = Math.max(severity, 2);
  }

  // Tone shift (with custom threshold)
  if (factors.tone_shift > toneThreshold + 0.2) {
    severity = Math.max(severity, 5);
  } else if (factors.tone_shift > toneThreshold) {
    severity = Math.max(severity, 4);
  }

  // Latency changes
  if (factors.latency_delta && factors.latency_delta > 2.0) {
    severity = Math.max(severity, 4);
  } else if (factors.latency_delta && factors.latency_delta > 1.0) {
    severity = Math.max(severity, 3);
  }

  return Math.min(severity, 10);
}

/**
 * Get risk category from severity score
 */
function getRiskCategory(severity: number): 'cosmetic' | 'semantic' | 'safety' {
  if (severity >= 8) return 'safety';
  if (severity >= 4) return 'semantic';
  return 'cosmetic';
}

/**
 * Get recommendation based on category and factors
 */
function getRecommendation(
  category: 'cosmetic' | 'semantic' | 'safety',
  factors: RiskFactors
): 'approve' | 'review' | 'block' {
  if (category === 'safety') return 'block';
  if (category === 'semantic') return 'review';
  
  // Even cosmetic changes might need review if they're large
  if (Math.abs(factors.length_delta) > 50 || factors.format_change) {
    return 'review';
  }
  
  return 'approve';
}

/**
 * Generate human-readable explanation of risk score
 */
function generateExplanation(
  category: string,
  _severity: number,
  factors: RiskFactors
): string {
  const parts: string[] = [];

  if (factors.policy_violations.length > 0) {
    parts.push(`Policy violations detected: ${factors.policy_violations.join(', ')}`);
  }

  if (factors.semantic_similarity < 0.7) {
    parts.push(`Semantic similarity: ${(factors.semantic_similarity * 100).toFixed(0)}%`);
  }

  if (factors.format_change) {
    parts.push('Response format changed');
  }

  const absLengthDelta = Math.abs(factors.length_delta);
  if (absLengthDelta > 0.25) {
    const direction = factors.length_delta > 0 ? 'longer' : 'shorter';
    parts.push(`Response ${(absLengthDelta * 100).toFixed(0)}% ${direction}`);
  }

  if (factors.tone_shift > 0.3) {
    const direction = factors.tone_shift > 0 ? 'more positive' : 'more negative';
    parts.push(`Tone shifted ${direction}`);
  }

  if (factors.latency_delta && Math.abs(factors.latency_delta) > 0.5) {
    const direction = factors.latency_delta > 0 ? 'slower' : 'faster';
    parts.push(`Latency ${(Math.abs(factors.latency_delta) * 100).toFixed(0)}% ${direction}`);
  }

  if (parts.length === 0) {
    if (category === 'cosmetic') {
      return 'Responses are nearly identical with only minor cosmetic differences.';
    }
    return 'Minor changes detected.';
  }

  return parts.join('. ') + '.';
}

/**
 * Calculate confidence in risk classification
 */
function calculateConfidence(factors: RiskFactors): number {
  let confidence = 1.0;
  
  // Lower confidence if semantic similarity wasn't calculated
  if (factors.semantic_similarity === 0 && factors.word_overlap > 0) {
    confidence *= 0.7; // Using word overlap as proxy
  }
  
  // Lower confidence if tone shift couldn't be measured
  if (factors.tone_shift === 0) {
    confidence *= 0.9;
  }
  
  return confidence;
}

/**
 * Calculate risk score between two traces
 * 
 * @param baselineResponse - Original response text or response object
 * @param currentResponse - New response text or response object
 * @param baselineMetadata - Original trace metadata (optional)
 * @param currentMetadata - New trace metadata (optional)
 * @param options - Optional configuration
 * @returns Risk score with classification and explanation
 */
export async function calculateRiskScore(
  baselineResponse: string | any,
  currentResponse: string | any,
  baselineMetadata?: Partial<TraceMetadata>,
  currentMetadata?: Partial<TraceMetadata>,
  options: {
    policyViolations?: string[];
    policyEvaluationResult?: any;  // PolicyEvaluationResult from policies.ts
    semantic_threshold?: number;
    length_threshold?: number;
    tone_threshold?: number;
    useSemanticSimilarity?: boolean;
  } = {}
): Promise<RiskScore> {
  const {
    policyViolations = [],
    policyEvaluationResult,
    semantic_threshold = 0.85,
    length_threshold = 0.5,
    tone_threshold = 0.4,
    useSemanticSimilarity = true,
  } = options;

  // Extract policy violations if evaluation result provided
  const allPolicyViolations = [...policyViolations];
  if (policyEvaluationResult && policyEvaluationResult.violations) {
    const severityMapping = {
      critical: 'critical-policy',
      high: 'high-policy',
      medium: 'medium-policy',
      low: 'low-policy',
    };
    allPolicyViolations.push(
      ...policyEvaluationResult.violations.map((v: any) => 
        `${severityMapping[v.severity as keyof typeof severityMapping]}: ${v.ruleId}`
      )
    );
  }

  // Extract text from responses
  const baselineText = typeof baselineResponse === 'string' 
    ? baselineResponse 
    : extractResponseText(baselineResponse);
  const currentText = typeof currentResponse === 'string' 
    ? currentResponse 
    : extractResponseText(currentResponse);

  // Get metadata with defaults
  const baseMeta = {
    duration_ms: baselineMetadata?.duration_ms || 0,
    tokens_used: baselineMetadata?.tokens_used || 0,
  };
  const currMeta = {
    duration_ms: currentMetadata?.duration_ms || 0,
    tokens_used: currentMetadata?.tokens_used || 0,
  };

  // Handle empty responses
  if (!baselineText && !currentText) {
    return {
      category: 'cosmetic',
      severity: 1,
      factors: {
        length_delta: 0,
        semantic_similarity: 1.0,
        word_overlap: 1.0,
        tone_shift: 0,
        format_change: false,
        policy_violations: [],
      },
      recommendation: 'approve',
      explanation: 'Both responses are empty',
      confidence: 1.0,
    };
  }

  if (!baselineText || !currentText) {
    const latency_delta = baseMeta.duration_ms > 0 && currMeta.duration_ms > 0
      ? calculateDelta(baseMeta.duration_ms, currMeta.duration_ms)
      : undefined;
    const token_delta = baseMeta.tokens_used > 0 && currMeta.tokens_used > 0
      ? calculateDelta(baseMeta.tokens_used, currMeta.tokens_used)
      : undefined;

    return {
      category: 'safety',
      severity: 10,
      factors: {
        length_delta: !baselineText ? 1.0 : -1.0,
        semantic_similarity: 0,
        word_overlap: 0,
        tone_shift: 0,
        format_change: true,
        policy_violations: ['Response missing'],
        latency_delta,
        token_delta,
      },
      recommendation: 'block',
      explanation: !baselineText ? 'Baseline response is empty' : 'Current response is empty',
      confidence: 1.0,
    };
  }

  // Calculate basic factors
  const length_delta = (currentText.length - baselineText.length) / baselineText.length;
  const word_overlap = calculateWordOverlap(baselineText, currentText);
  const format_change = detectFormatChange(baselineText, currentText);
  const baselineTone = estimateTone(baselineText);
  const currentTone = estimateTone(currentText);
  const tone_shift = Math.abs(currentTone - baselineTone);
  
  const latency_delta = baseMeta.duration_ms > 0 && currMeta.duration_ms > 0
    ? calculateDelta(baseMeta.duration_ms, currMeta.duration_ms) / 100  // Normalize to 0-1
    : undefined;
  const token_delta = baseMeta.tokens_used > 0 && currMeta.tokens_used > 0
    ? calculateDelta(baseMeta.tokens_used, currMeta.tokens_used) / 100  // Normalize to 0-1
    : undefined;

  // Calculate semantic similarity if enabled
  let semantic_similarity = word_overlap; // Default to word overlap

  if (useSemanticSimilarity && baselineText.length > 0 && currentText.length > 0) {
    try {
      const embeddingService = getDefaultEmbeddingService(true);
      const [baselineEmbedding, currentEmbedding] = await Promise.all([
        embeddingService.embed(baselineText),
        embeddingService.embed(currentText),
      ]);
      semantic_similarity = cosineSimilarity(baselineEmbedding, currentEmbedding);
    } catch (error) {
      // Fall back to word overlap if embedding fails
      console.warn('Failed to calculate semantic similarity, using word overlap:', error);
      semantic_similarity = word_overlap;
    }
  }

  // Build risk factors
  const factors: RiskFactors = {
    length_delta,
    semantic_similarity,
    word_overlap,
    tone_shift,
    format_change,
    policy_violations: allPolicyViolations,
    latency_delta,
    token_delta,
  };

  // Classify risk with custom thresholds
  const severity = classifyRiskWithThresholds(
    factors,
    semantic_threshold,
    length_threshold,
    tone_threshold
  );
  const category = getRiskCategory(severity);
  const recommendation = getRecommendation(category, factors);
  const explanation = generateExplanation(category, severity, factors);
  const confidence = calculateConfidence(factors);

  return {
    category,
    severity,
    factors,
    recommendation,
    explanation,
    confidence,
  };
}

/**
 * Format risk score for display
 */
export function formatRiskScore(score: RiskScore): string {
  const categoryEmoji = {
    cosmetic: '🟢',
    semantic: '🟡',
    safety: '🔴',
  };

  const recommendationEmoji = {
    approve: '✅',
    review: '⚠️',
    block: '🚫',
  };

  let output = '';
  output += `${categoryEmoji[score.category]} Risk: ${score.category.toUpperCase()}\n`;
  output += `   Severity: ${score.severity}/10\n`;
  output += `   ${recommendationEmoji[score.recommendation]} Recommendation: ${score.recommendation.toUpperCase()}\n`;
  output += `   Confidence: ${(score.confidence * 100).toFixed(0)}%\n`;
  output += `\n${score.explanation}\n`;
  
  // Include factor details
  output += `\nRisk Factors:\n`;
  output += `   length_delta: ${(score.factors.length_delta * 100).toFixed(1)}%\n`;
  output += `   semantic_similarity: ${(score.factors.semantic_similarity * 100).toFixed(1)}%\n`;
  output += `   word_overlap: ${(score.factors.word_overlap * 100).toFixed(1)}%\n`;
  output += `   tone_shift: ${score.factors.tone_shift.toFixed(2)}\n`;
  output += `   format_change: ${score.factors.format_change}\n`;
  if (score.factors.latency_delta !== undefined) {
    output += `   latency_delta: ${(score.factors.latency_delta * 100).toFixed(1)}%\n`;
  }
  if (score.factors.token_delta !== undefined) {
    output += `   token_delta: ${(score.factors.token_delta * 100).toFixed(1)}%\n`;
  }
  
  return output;
}

// ============================================================================
// CI/CD Risk Guardrails - Additional types and functions
// ============================================================================

export interface CICDRiskScore {
  overall: number; // 0-100
  driftScore: number; // 0-100
  criticScore: number; // 0-100
  level: 'safe' | 'warning' | 'danger' | 'critical';
  shouldBlock: boolean;
}

export interface RiskPolicy {
  driftThreshold: number; // Default: 0.90
  criticThreshold: number; // Default: 80
  blockOnCritical: boolean; // Default: true
  requireManualReview: boolean; // Default: false
}

/**
 * Calculate comprehensive CI/CD risk score
 */
export function calculateCICDRiskScore(
  drift: DriftResult,
  critic: CriticAnalysis,
  policy: RiskPolicy
): CICDRiskScore {
  // Convert drift similarity to risk score (inverse relationship)
  const driftScore = Math.round((1 - drift.similarity) * 100);

  // Critic score based on category and confidence
  const categoryScores = {
    cosmetic: 0,
    semantic: 50,
    critical: 100
  };
  const criticScore = Math.round(categoryScores[critic.category] * critic.confidence);

  // Weighted overall score (drift: 40%, critic: 60%)
  const overall = Math.round(driftScore * 0.4 + criticScore * 0.6);

  // Determine risk level
  let level: CICDRiskScore['level'];
  if (overall >= 80) level = 'critical';
  else if (overall >= 60) level = 'danger';
  else if (overall >= 30) level = 'warning';
  else level = 'safe';

  // Determine if should block deployment
  const shouldBlock =
    (policy.blockOnCritical && critic.category === 'critical') ||
    overall >= policy.criticThreshold ||
    drift.similarity < policy.driftThreshold;

  return {
    overall,
    driftScore,
    criticScore,
    level,
    shouldBlock
  };
}

/**
 * Format CI/CD risk score for display
 */
export function formatCICDRiskScore(score: CICDRiskScore): string {
  const emoji = {
    safe: '✅',
    warning: '⚠️',
    danger: '🚨',
    critical: '🔴'
  };

  return `${emoji[score.level]} Risk: ${score.overall}/100 (${score.level.toUpperCase()})`;
}

/**
 * Generate CI/CD risk report
 */
export function generateRiskReport(
  testName: string,
  drift: DriftResult,
  critic: CriticAnalysis,
  riskScore: CICDRiskScore
): string {
  return `
# Risk Analysis Report: ${testName}

## Overall Risk: ${formatCICDRiskScore(riskScore)}

### Semantic Drift Analysis
- **Similarity**: ${(drift.similarity * 100).toFixed(1)}%
- **Threshold**: ${(drift.threshold * 100).toFixed(1)}%
- **Drift Detected**: ${drift.isDrift ? 'YES' : 'NO'}

### Critic Agent Classification
- **Category**: ${critic.category.toUpperCase()}
- **Confidence**: ${(critic.confidence * 100).toFixed(1)}%
- **Risk Level**: ${critic.riskLevel.toUpperCase()}
- **Reasoning**: ${critic.reasoning}

${
  critic.examples.length > 0
    ? `### Concerning Changes:
${critic.examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}`
    : ''
}

### Decision
${riskScore.shouldBlock ? '🚫 **DEPLOYMENT BLOCKED**' : '✅ **DEPLOYMENT APPROVED**'}

---
*Generated by TraceForge CI/CD Risk Guardrails*
`.trim();
}

