// Semantic diff utilities - distinguish format vs meaning changes
// Builds on structural diff to classify changes by semantic importance

import type { DiffChange } from "./diff";

export interface SemanticDiffResult {
  formatChanges: DiffChange[]; // Low importance: whitespace, order
  semanticChanges: DiffChange[]; // High importance: meaning drift
  similarity: number; // Semantic similarity (0-1)
  recommendation: "accept" | "review" | "reject";
}

/**
 * Classify diff changes by semantic importance
 * Uses heuristics to identify format-only changes vs meaning changes
 */
export function classifySemanticImportance(
  changes: DiffChange[]
): SemanticDiffResult {
  const formatChanges: DiffChange[] = [];
  const semanticChanges: DiffChange[] = [];

  for (const change of changes) {
    if (isFormatOnlyChange(change)) {
      formatChanges.push(change);
    } else {
      semanticChanges.push(change);
    }
  }

  // Calculate semantic similarity score
  const totalChanges = changes.length;
  const meaningfulChanges = semanticChanges.length;
  const similarity =
    totalChanges > 0 ? 1 - meaningfulChanges / totalChanges : 1.0;

  // Recommendation based on semantic changes
  let recommendation: "accept" | "review" | "reject";
  if (semanticChanges.length === 0) {
    recommendation = "accept";
  } else if (semanticChanges.length <= 2 && similarity > 0.8) {
    recommendation = "review";
  } else {
    recommendation = "reject";
  }

  return {
    formatChanges,
    semanticChanges,
    similarity,
    recommendation,
  };
}

/**
 * Determine if a change is format-only (low importance)
 */
function isFormatOnlyChange(change: DiffChange): boolean {
  const { path, from, to } = change;

  // Metadata changes are usually format-only
  if (path.startsWith("metadata.") && !path.includes("model")) {
    return true;
  }

  // Timestamp changes
  if (path.includes("timestamp") || path.includes("created")) {
    return true;
  }

  // ID changes (UUIDs)
  if (path === "id" || path.endsWith(".id")) {
    return true;
  }

  // String comparison for content changes
  if (typeof from === "string" && typeof to === "string") {
    return isEquivalentText(from, to);
  }

  return false;
}

/**
 * Check if two text strings are semantically equivalent
 * Uses simple heuristics: normalized whitespace, punctuation, case
 */
function isEquivalentText(text1: string, text2: string): boolean {
  const normalize = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/[.,!?;:]/g, "") // Remove punctuation
      .trim();
  };

  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);

  // If normalized versions match, it's format-only
  if (normalized1 === normalized2) {
    return true;
  }

  // Check word overlap (>80% = likely format change)
  const words1 = new Set(normalized1.split(" "));
  const words2 = new Set(normalized2.split(" "));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  const wordOverlap = intersection.size / union.size;
  return wordOverlap > 0.8;
}

/**
 * Highlight word-level differences in text content
 * Returns array of segments with change type
 */
export interface TextSegment {
  text: string;
  type: "unchanged" | "removed" | "added";
}

export function highlightTextDifferences(
  text1: string,
  text2: string
): { segments1: TextSegment[]; segments2: TextSegment[] } {
  const words1 = text1.split(/(\s+)/);
  const words2 = text2.split(/(\s+)/);

  // Simple word-level diff using longest common subsequence
  const segments1: TextSegment[] = [];
  const segments2: TextSegment[] = [];

  // Simplified implementation - marks all words as changed if different
  // For production, use a proper diff algorithm like Myers
  const set1 = new Set(words1.filter((w) => w.trim()));
  const set2 = new Set(words2.filter((w) => w.trim()));

  for (const word of words1) {
    if (word.trim() === "") {
      segments1.push({ text: word, type: "unchanged" });
    } else if (set2.has(word)) {
      segments1.push({ text: word, type: "unchanged" });
    } else {
      segments1.push({ text: word, type: "removed" });
    }
  }

  for (const word of words2) {
    if (word.trim() === "") {
      segments2.push({ text: word, type: "unchanged" });
    } else if (set1.has(word)) {
      segments2.push({ text: word, type: "unchanged" });
    } else {
      segments2.push({ text: word, type: "added" });
    }
  }

  return { segments1, segments2 };
}

/**
 * Extract assistant message content for comparison
 */
export function extractResponseContent(response: any): string | null {
  try {
    // Handle OpenAI format
    if (response?.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }
    // Handle text completion format
    if (response?.choices?.[0]?.text) {
      return response.choices[0].text;
    }
  } catch {
    return null;
  }
  return null;
}
