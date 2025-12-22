import TravelAgent from './index.js';

/**
 * Regression test suite for TravelAgent
 * 
 * WORKFLOW:
 * 1. Record mode: npm run test:record (with real API key)
 *    - Generates cassettes in .ai-tests/cassettes/
 *    - Creates baseline traces in .ai-tests/traces/
 * 
 * 2. Replay mode: npm run test:replay (no API key needed)
 *    - Uses cassettes to mock API responses
 *    - Compares outputs against baselines
 *    - No API calls or costs
 */

// Assertion helpers
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertContains(text, substring, message) {
  if (!text.includes(substring)) {
    throw new Error(`${message}\nExpected text to contain: "${substring}"\nGot: "${text}"`);
  }
}

function assertOutputStable(actual, baseline, threshold = 0.8) {
  // Simple word overlap check for semantic stability
  const actualWords = new Set(actual.toLowerCase().split(/\s+/));
  const baselineWords = new Set(baseline.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...actualWords].filter(w => baselineWords.has(w)));
  const union = new Set([...actualWords, ...baselineWords]);
  
  const similarity = intersection.size / union.size;
  
  if (similarity < threshold) {
    throw new Error(
      `Output drift detected!\n` +
      `Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${threshold * 100}%)\n` +
      `Baseline: ${baseline}\n` +
      `Current:  ${actual}`
    );
  }
}

// Test suite
async function runTests() {
  const agent = new TravelAgent();
  let passed = 0;
  let failed = 0;

  console.log('🧪 Running Travel Agent Regression Tests\n');
  console.log(`Mode: ${process.env.TRACEFORGE_VCR_MODE || 'passthrough'}\n`);

  // Test 1: Paris recommendations
  try {
    console.log('Test 1: Paris travel recommendations...');
    const result = await agent.getRecommendation('Paris', 'art and food');
    
    assertContains(result, 'Paris', 'Should mention Paris');
    assertContains(result, '1.', 'Should provide numbered recommendations');
    
    // In record mode, this baseline would be saved
    // In replay mode, we'd load and compare
    const baseline = 'Paris recommendations baseline would be loaded here';
    
    console.log('✓ Paris recommendations test passed\n');
    passed++;
  } catch (error) {
    console.error('✗ Paris recommendations test failed:', error.message, '\n');
    failed++;
  }

  // Test 2: Sentiment analysis consistency
  try {
    console.log('Test 2: Sentiment analysis...');
    const result = await agent.analyzeReview(
      'The hotel was clean but the staff was rude and unhelpful.'
    );
    
    assertContains(
      result.toLowerCase(),
      'negative',
      'Should classify mixed-negative review as negative'
    );
    
    console.log('✓ Sentiment analysis test passed\n');
    passed++;
  } catch (error) {
    console.error('✗ Sentiment analysis test failed:', error.message, '\n');
    failed++;
  }

  // Test 3: Multiple requests consistency
  try {
    console.log('Test 3: Response consistency check...');
    const result1 = await agent.analyzeReview('This product is amazing!');
    const result2 = await agent.analyzeReview('This product is amazing!');
    
    // With low temperature, identical inputs should give similar outputs
    assertOutputStable(result1, result2, 0.7);
    
    console.log('✓ Consistency test passed\n');
    passed++;
  } catch (error) {
    console.error('✗ Consistency test failed:', error.message, '\n');
    failed++;
  }

  // Summary
  console.log('━'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
