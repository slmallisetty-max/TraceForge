import type { Assertion, AssertionResult, LLMResponse, TraceMetadata } from '@traceforge/shared';
import { getDefaultEmbeddingService, cosineSimilarity } from '@traceforge/shared';

/**
 * Extract text content from LLM response
 */
function extractText(response: LLMResponse): string {
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
 * Get value at JSON path using dot notation
 */
function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    // Handle array indexing (e.g., "choices.0.message")
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current?.[key]?.[parseInt(index, 10)];
    } else {
      current = current?.[part];
    }
    
    if (current === undefined) {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Calculate string similarity (Dice coefficient)
 * 
 * ⚠️ LIMITATION: Simple lexical similarity only!
 * 
 * This function uses the Dice coefficient (bigram-based) to measure
 * string similarity. It works well for:
 * - Detecting typos and minor variations
 * - Comparing structured text
 * - Fast approximate matching
 * 
 * It does NOT work well for:
 * - Semantic similarity ("car" vs "automobile")
 * - Different phrasings of the same meaning
 * - Translations or paraphrases
 * - Long texts with different word order
 * 
 * For semantic similarity, consider:
 * 1. Using embedding-based similarity (cosine distance of vectors)
 * 2. LLM-based semantic comparison
 * 3. Domain-specific similarity metrics
 * 
 * Alternative algorithms:
 * - Levenshtein distance: character-level edits
 * - Jaro-Winkler: better for short strings
 * - Cosine similarity: semantic/vector-based
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;
  
  // Create bigrams
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const bigrams1 = getBigrams(str1.toLowerCase());
  const bigrams2 = getBigrams(str2.toLowerCase());
  
  // Calculate intersection
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }
  
  // Dice coefficient: 2 * |intersection| / (|set1| + |set2|)
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Estimate token count (rough approximation)
 * 
 * ⚠️ LIMITATION: This is a rough estimate only!
 * 
 * This function provides a simple heuristic for token counting based on
 * word and character counts. It does NOT use model-specific tokenization.
 * 
 * Actual token counts may vary significantly depending on:
 * - The specific model (GPT-3.5, GPT-4, Claude, etc.)
 * - Language and character set (non-English text)
 * - Special tokens and formatting
 * 
 * For accurate token counts:
 * 1. Use the `usage` field from API responses (when available)
 * 2. Integrate a proper tokenizer library like `tiktoken` for OpenAI models
 * 3. Allow ±20% margin in token_count assertions to account for estimation error
 * 
 * @param text - The text to estimate token count for
 * @returns Estimated token count (±20% accuracy)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: ~1 token per 4 characters for English
  // More accurate would use tiktoken or similar
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  
  // Average of word-based and char-based estimates
  return Math.round((words + chars / 4) / 2);
}

/**
 * Evaluate a single assertion against a response
 */
export async function evaluateAssertion(
  assertion: Assertion,
  response: LLMResponse | null,
  metadata: TraceMetadata
): Promise<AssertionResult> {
  // Handle null response
  if (!response) {
    return {
      assertion,
      passed: false,
      error: 'No response available',
      message: 'Response is null or undefined',
    };
  }

  const responseText = extractText(response);

  try {
    switch (assertion.type) {
      case 'exact': {
        const field = assertion.field || 'choices[0].message.content';
        const actual = assertion.field 
          ? getValueAtPath(response, field)
          : responseText;
        const expected = assertion.value;
        const passed = actual === expected;
        
        return {
          assertion,
          passed,
          actual,
          expected,
          message: passed 
            ? 'Exact match successful'
            : `Expected exact match but got different value`,
        };
      }

      case 'contains': {
        const field = assertion.field || 'choices[0].message.content';
        const actual = assertion.field 
          ? String(getValueAtPath(response, field) || '')
          : responseText;
        const searchValue = String(assertion.value);
        const passed = actual.includes(searchValue);
        
        return {
          assertion,
          passed,
          actual,
          expected: `Contains "${searchValue}"`,
          message: passed
            ? `Found "${searchValue}" in response`
            : `Did not find "${searchValue}" in response`,
        };
      }

      case 'not_contains': {
        const field = assertion.field || 'choices[0].message.content';
        const actual = assertion.field 
          ? String(getValueAtPath(response, field) || '')
          : responseText;
        const searchValue = String(assertion.value);
        const passed = !actual.includes(searchValue);
        
        return {
          assertion,
          passed,
          actual,
          expected: `Does not contain "${searchValue}"`,
          message: passed
            ? `Correctly does not contain "${searchValue}"`
            : `Unexpectedly found "${searchValue}" in response`,
        };
      }

      case 'regex': {
        if (!assertion.pattern) {
          return {
            assertion,
            passed: false,
            error: 'No pattern provided for regex assertion',
            message: 'Missing regex pattern',
          };
        }
        
        const field = assertion.field || 'choices[0].message.content';
        const actual = assertion.field 
          ? String(getValueAtPath(response, field) || '')
          : responseText;
        const regex = new RegExp(assertion.pattern);
        const passed = regex.test(actual);
        
        return {
          assertion,
          passed,
          actual,
          expected: `Matches /${assertion.pattern}/`,
          message: passed
            ? `Response matches regex pattern`
            : `Response does not match regex pattern`,
        };
      }

      case 'json_path': {
        if (!assertion.path) {
          return {
            assertion,
            passed: false,
            error: 'No path provided for json_path assertion',
            message: 'Missing JSONPath expression',
          };
        }
        
        try {
          const actual = getValueAtPath(response, assertion.path);
          const expected = assertion.value;
          const passed = actual === expected;
          
          return {
            assertion,
            passed,
            actual,
            expected,
            message: passed
              ? `JSONPath value matches at ${assertion.path}`
              : `JSONPath value mismatch at ${assertion.path}`,
          };
        } catch (e: any) {
          return {
            assertion,
            passed: false,
            error: e.message,
            message: `Invalid JSONPath: ${assertion.path}`,
          };
        }
      }

      case 'fuzzy_match': {
        const field = assertion.field || 'choices[0].message.content';
        const actual = assertion.field 
          ? String(getValueAtPath(response, field) || '')
          : responseText;
        const expected = String(assertion.value);
        const threshold = assertion.threshold ?? 0.8;
        
        const similarity = calculateSimilarity(actual, expected);
        const passed = similarity >= threshold;
        
        return {
          assertion,
          passed,
          actual,
          expected,
          message: `Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%)`,
        };
      }

      case 'token_count': {
        // Use actual token count from metadata if available
        let tokenCount: number;
        
        if (metadata.tokens_used !== undefined) {
          tokenCount = metadata.tokens_used;
        } else if (response.usage?.total_tokens !== undefined) {
          tokenCount = response.usage.total_tokens;
        } else {
          // Fallback to estimation
          tokenCount = estimateTokenCount(responseText);
        }
        
        const min = assertion.min ?? 0;
        const max = assertion.max ?? Infinity;
        const passed = tokenCount >= min && tokenCount <= max;
        
        return {
          assertion,
          passed,
          actual: tokenCount,
          expected: `${min}-${max === Infinity ? '∞' : max} tokens`,
          message: `Token count: ${tokenCount} (expected: ${min}-${max === Infinity ? '∞' : max})`,
        };
      }

      case 'latency': {
        const duration = metadata.duration_ms;
        const max = assertion.max ?? 5000;
        const min = assertion.min ?? 0;
        const passed = duration >= min && duration <= max;
        
        return {
          assertion,
          passed,
          actual: `${duration}ms`,
          expected: `${min}-${max}ms`,
          message: `Response time: ${duration}ms (expected: ${min}-${max}ms)`,
        };
      }

      case 'semantic': {
        const actual = assertion.field 
          ? String(getValueAtPath(response, assertion.field) || '')
          : responseText;
        const expected = String(assertion.expected || '');
        const threshold = assertion.threshold || 0.8;
        const useCache = assertion.use_cache !== false; // Default true

        if (!expected || expected.trim().length === 0) {
          return {
            assertion,
            passed: false,
            error: 'Missing expected text for semantic assertion',
            message: 'Semantic assertion requires non-empty "expected" field with text to compare against',
          };
        }

        if (!actual || actual.trim().length === 0) {
          return {
            assertion,
            passed: false,
            error: 'Response text is empty',
            message: assertion.field 
              ? `Field "${assertion.field}" is empty or not found in response`
              : 'Response has no content to evaluate',
          };
        }

        try {
          // Get embedding service (from config or environment)
          const embeddingService = getDefaultEmbeddingService(useCache);
          
          // Generate embeddings
          const [actualEmbedding, expectedEmbedding] = await embeddingService.generateEmbeddings([
            actual,
            expected,
          ]);
          
          // Calculate similarity
          const similarity = cosineSimilarity(actualEmbedding, expectedEmbedding);
          const passed = similarity >= threshold;
          
          return {
            assertion,
            passed,
            actual: `"${actual.substring(0, 100)}${actual.length > 100 ? '...' : ''}" (similarity: ${similarity.toFixed(3)})`,
            expected: `"${expected.substring(0, 100)}${expected.length > 100 ? '...' : ''}" (threshold: ${threshold})`,
            message: passed
              ? `✓ Semantic similarity ${similarity.toFixed(3)} meets threshold ${threshold}`
              : `✗ Semantic similarity ${similarity.toFixed(3)} below threshold ${threshold}. Consider lowering threshold or adjusting expected text.`,
          };
        } catch (error: any) {
          // Provide helpful error messages
          let helpText = '';
          if (error.message.includes('API key')) {
            helpText = ' Set OPENAI_API_KEY environment variable to use semantic assertions.';
          } else if (error.message.includes('rate limit')) {
            helpText = ' Wait a moment and try again, or reduce test concurrency.';
          }
          
          return {
            assertion,
            passed: false,
            error: error.message,
            message: `Failed to evaluate semantic assertion: ${error.message}${helpText}`,
          };
        }
      }

      case 'semantic-contradiction': {
        const actual = assertion.field 
          ? String(getValueAtPath(response, assertion.field) || '')
          : responseText;
        const forbidden = assertion.forbidden || [];
        const threshold = assertion.threshold || 0.75; // High similarity = contradiction
        const useCache = assertion.use_cache !== false; // Default true

        if (forbidden.length === 0) {
          return {
            assertion,
            passed: false,
            error: 'Missing forbidden statements',
            message: 'Semantic-contradiction requires non-empty "forbidden" array with statements to avoid',
          };
        }

        if (!actual || actual.trim().length === 0) {
          return {
            assertion,
            passed: false,
            error: 'Response text is empty',
            message: assertion.field 
              ? `Field "${assertion.field}" is empty or not found in response`
              : 'Response has no content to evaluate for contradictions',
          };
        }

        try {
          const embeddingService = getDefaultEmbeddingService(useCache);
          
          // Generate embedding for actual response
          const actualEmbedding = await embeddingService.generateEmbedding(actual);
          
          // Check similarity with each forbidden statement
          const similarities: Array<{ statement: string; similarity: number }> = [];
          
          for (const forbiddenText of forbidden) {
            if (!forbiddenText || forbiddenText.trim().length === 0) {
              continue; // Skip empty forbidden statements
            }
            const forbiddenEmbedding = await embeddingService.generateEmbedding(forbiddenText);
            const similarity = cosineSimilarity(actualEmbedding, forbiddenEmbedding);
            similarities.push({ statement: forbiddenText, similarity });
          }
          
          if (similarities.length === 0) {
            return {
              assertion,
              passed: false,
              error: 'All forbidden statements are empty',
              message: 'Provide at least one non-empty forbidden statement',
            };
          }
          
          // Find highest similarity (most contradictory)
          const maxSimilarity = Math.max(...similarities.map(s => s.similarity));
          const contradiction = similarities.find(s => s.similarity === maxSimilarity);
          const passed = maxSimilarity < threshold; // Pass if below contradiction threshold
          
          return {
            assertion,
            passed,
            actual: `"${actual.substring(0, 100)}${actual.length > 100 ? '...' : ''}"`,
            expected: `Not similar to forbidden statements (threshold: ${threshold})`,
            message: passed
              ? `✓ No contradictions detected (max similarity: ${maxSimilarity.toFixed(3)} with "${contradiction!.statement.substring(0, 40)}...")`
              : `✗ Contradiction detected: similarity ${maxSimilarity.toFixed(3)} with "${contradiction!.statement.substring(0, 50)}${contradiction!.statement.length > 50 ? '...' : ''}" exceeds threshold ${threshold}`,
          };
        } catch (error: any) {
          // Provide helpful error messages
          let helpText = '';
          if (error.message.includes('API key')) {
            helpText = ' Set OPENAI_API_KEY environment variable to use semantic assertions.';
          }
          
          return {
            assertion,
            passed: false,
            error: error.message,
            message: `Failed to evaluate semantic-contradiction: ${error.message}${helpText}`,
          };
        }
      }

      case 'semantic-intent': {
        // TODO: Implement intent classification (Week 4)
        // This will require an LLM-judged approach (bounded, cached)
        return {
          assertion,
          passed: false,
          error: 'Not implemented',
          message: 'semantic-intent assertion coming in 2026 Q1 Week 4',
        };
      }

      case 'policy': {
        // TODO: Implement policy enforcement (Week 4)
        return {
          assertion,
          passed: false,
          error: 'Not implemented',
          message: 'policy assertion coming in 2026 Q1 Week 4',
        };
      }

      default:
        return {
          assertion,
          passed: false,
          error: `Unknown assertion type: ${assertion.type}`,
          message: 'Unsupported assertion type',
        };
    }
  } catch (error: any) {
    return {
      assertion,
      passed: false,
      error: error.message,
      message: `Assertion evaluation failed: ${error.message}`,
    };
  }
}

/**
 * Evaluate all assertions for a test
 */
export async function evaluateAssertions(
  assertions: Assertion[],
  response: LLMResponse | null,
  metadata: TraceMetadata
): Promise<AssertionResult[]> {
  return Promise.all(
    assertions.map(assertion => 
      evaluateAssertion(assertion, response, metadata)
    )
  );
}
