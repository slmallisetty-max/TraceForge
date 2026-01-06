#!/usr/bin/env node

/**
 * Performance Benchmark for Embedding Cache
 * Tests cache hit rate and performance improvements
 */

import { OpenAIEmbeddingService, CachedEmbeddingService, cosineSimilarity } from '../dist/embeddings.js';
import { rm } from 'fs/promises';
import { performance } from 'perf_hooks';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test data
const testTexts = [
  "The capital of France is Paris",
  "Paris is the capital city of France",
  "France's capital is Paris",
  "What is the capital of Germany?",
  "Berlin is Germany's capital",
  "The Eiffel Tower is in Paris",
  "Paris is a beautiful city",
  "Machine learning is a subset of artificial intelligence",
  "AI includes machine learning techniques",
  "Deep learning uses neural networks",
];

async function benchmarkWithoutCache() {
  log('\n📊 Benchmark 1: Without Cache', 'cyan');
  log('─'.repeat(50), 'gray');
  
  if (!process.env.OPENAI_API_KEY) {
    log('⚠️  OPENAI_API_KEY not set, skipping', 'yellow');
    return null;
  }
  
  const service = new OpenAIEmbeddingService(process.env.OPENAI_API_KEY);
  const start = performance.now();
  
  log('Generating embeddings for 10 texts...', 'gray');
  
  try {
    const embeddings = await service.generateEmbeddings(testTexts);
    const end = performance.now();
    const duration = end - start;
    
    log(`✅ Completed in ${duration.toFixed(0)}ms`, 'green');
    log(`   Average: ${(duration / testTexts.length).toFixed(0)}ms per embedding`, 'gray');
    
    return {
      duration,
      count: testTexts.length,
      avgPerEmbedding: duration / testTexts.length,
      embeddings,
    };
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
    return null;
  }
}

async function benchmarkWithCache() {
  log('\n📊 Benchmark 2: With Cache (First Run)', 'cyan');
  log('─'.repeat(50), 'gray');
  
  if (!process.env.OPENAI_API_KEY) {
    log('⚠️  OPENAI_API_KEY not set, skipping', 'yellow');
    return null;
  }
  
  // Clean cache
  const cacheDir = './.ai-tests/embeddings-benchmark';
  try {
    await rm(cacheDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore
  }
  
  const baseService = new OpenAIEmbeddingService(process.env.OPENAI_API_KEY);
  const cachedService = new CachedEmbeddingService(baseService, cacheDir);
  
  log('Generating embeddings with cache (cold cache)...', 'gray');
  
  const start = performance.now();
  
  try {
    const embeddings = await cachedService.generateEmbeddings(testTexts);
    const end = performance.now();
    const duration = end - start;
    
    log(`✅ Completed in ${duration.toFixed(0)}ms`, 'green');
    log(`   Average: ${(duration / testTexts.length).toFixed(0)}ms per embedding`, 'gray');
    
    return {
      duration,
      count: testTexts.length,
      avgPerEmbedding: duration / testTexts.length,
      embeddings,
      service: cachedService,
    };
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'yellow');
    return null;
  }
}

async function benchmarkCacheHit(service) {
  log('\n📊 Benchmark 3: With Cache (Cache Hits)', 'cyan');
  log('─'.repeat(50), 'gray');
  
  log('Reading from cache (warm cache)...', 'gray');
  
  const start = performance.now();
  const embeddings = await service.generateEmbeddings(testTexts);
  const end = performance.now();
  const duration = end - start;
  
  log(`✅ Completed in ${duration.toFixed(0)}ms`, 'green');
  log(`   Average: ${(duration / testTexts.length).toFixed(2)}ms per embedding`, 'gray');
  
  return {
    duration,
    count: testTexts.length,
    avgPerEmbedding: duration / testTexts.length,
    embeddings,
  };
}

async function benchmarkSimilarityCalculations(embeddings) {
  log('\n📊 Benchmark 4: Similarity Calculations', 'cyan');
  log('─'.repeat(50), 'gray');
  
  log('Calculating cosine similarity for all pairs...', 'gray');
  
  const start = performance.now();
  let comparisons = 0;
  
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      comparisons++;
    }
  }
  
  const end = performance.now();
  const duration = end - start;
  
  log(`✅ ${comparisons} comparisons in ${duration.toFixed(2)}ms`, 'green');
  log(`   Average: ${(duration / comparisons).toFixed(4)}ms per comparison`, 'gray');
  
  return {
    duration,
    comparisons,
    avgPerComparison: duration / comparisons,
  };
}

async function benchmarkRealisticWorkload() {
  log('\n📊 Benchmark 5: Realistic Test Workload', 'cyan');
  log('─'.repeat(50), 'gray');
  
  if (!process.env.OPENAI_API_KEY) {
    log('⚠️  OPENAI_API_KEY not set, skipping', 'yellow');
    return null;
  }
  
  // Simulate: 5 tests, each with 3 assertions, 2 texts per assertion
  const numTests = 5;
  const assertionsPerTest = 3;
  const textsPerAssertion = 2;
  const totalTexts = numTests * assertionsPerTest * textsPerAssertion;
  
  log(`Simulating ${numTests} tests × ${assertionsPerTest} assertions × ${textsPerAssertion} texts = ${totalTexts} embeddings`, 'gray');
  
  const cacheDir = './.ai-tests/embeddings-benchmark-realistic';
  try {
    await rm(cacheDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore
  }
  
  const baseService = new OpenAIEmbeddingService(process.env.OPENAI_API_KEY);
  const cachedService = new CachedEmbeddingService(baseService, cacheDir);
  
  // First run (cold cache)
  log('\n  Run 1: Cold cache (API calls)', 'gray');
  const start1 = performance.now();
  
  for (let test = 0; test < numTests; test++) {
    for (let assertion = 0; assertion < assertionsPerTest; assertion++) {
      // Reuse some texts to simulate realistic scenario
      const text1 = testTexts[test % testTexts.length];
      const text2 = testTexts[(test + assertion) % testTexts.length];
      await cachedService.generateEmbeddings([text1, text2]);
    }
  }
  
  const end1 = performance.now();
  const duration1 = end1 - start1;
  
  log(`  ✅ Completed in ${duration1.toFixed(0)}ms`, 'green');
  
  // Second run (warm cache)
  log('\n  Run 2: Warm cache (cache hits)', 'gray');
  const start2 = performance.now();
  
  for (let test = 0; test < numTests; test++) {
    for (let assertion = 0; assertion < assertionsPerTest; assertion++) {
      const text1 = testTexts[test % testTexts.length];
      const text2 = testTexts[(test + assertion) % testTexts.length];
      await cachedService.generateEmbeddings([text1, text2]);
    }
  }
  
  const end2 = performance.now();
  const duration2 = end2 - start2;
  
  log(`  ✅ Completed in ${duration2.toFixed(0)}ms`, 'green');
  
  const speedup = duration1 / duration2;
  log(`\n  📈 Speedup: ${speedup.toFixed(1)}x faster with cache`, speedup > 10 ? 'green' : 'yellow');
  
  return {
    coldCacheDuration: duration1,
    warmCacheDuration: duration2,
    speedup,
    totalTexts,
  };
}

async function main() {
  log('🚀 Embedding Cache Performance Benchmark', 'cyan');
  log('═'.repeat(50), 'gray');
  
  if (!process.env.OPENAI_API_KEY) {
    log('\n⚠️  OPENAI_API_KEY not set', 'yellow');
    log('   Some benchmarks will be skipped', 'gray');
    log('   Set it with: export OPENAI_API_KEY=sk-...', 'gray');
  } else {
    log('\n✅ OPENAI_API_KEY found', 'green');
    log('   This will make real API calls (est. cost: <$0.01)', 'gray');
  }
  
  // Run benchmarks
  const results = {};
  
  results.withoutCache = await benchmarkWithoutCache();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit buffer
  
  const cacheResult = await benchmarkWithCache();
  results.withCacheFirstRun = cacheResult;
  
  if (cacheResult?.service) {
    results.withCacheHit = await benchmarkCacheHit(cacheResult.service);
  }
  
  if (results.withCacheFirstRun?.embeddings) {
    results.similarity = await benchmarkSimilarityCalculations(results.withCacheFirstRun.embeddings);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit buffer
  results.realistic = await benchmarkRealisticWorkload();
  
  // Summary
  log('\n' + '═'.repeat(50), 'gray');
  log('📊 Summary', 'cyan');
  log('═'.repeat(50), 'gray');
  
  if (results.withoutCache && results.withCacheFirstRun) {
    const overhead = results.withCacheFirstRun.duration - results.withoutCache.duration;
    log(`\nCache overhead (first run): +${overhead.toFixed(0)}ms (${((overhead / results.withoutCache.duration) * 100).toFixed(1)}%)`, 'yellow');
  }
  
  if (results.withCacheHit && results.withoutCache) {
    const speedup = results.withoutCache.duration / results.withCacheHit.duration;
    log(`Cache speedup (subsequent runs): ${speedup.toFixed(0)}x faster`, 'green');
    log(`  Without cache: ${results.withoutCache.duration.toFixed(0)}ms`, 'gray');
    log(`  With cache:    ${results.withCacheHit.duration.toFixed(0)}ms`, 'gray');
  }
  
  if (results.similarity) {
    log(`\nSimilarity calculation: ${(results.similarity.avgPerComparison * 1000).toFixed(2)}μs per comparison`, 'green');
    log(`  (${Math.round(1000 / results.similarity.avgPerComparison).toLocaleString()} comparisons/second)`, 'gray');
  }
  
  if (results.realistic) {
    log(`\nRealistic workload (${results.realistic.totalTexts} embeddings):`, 'green');
    log(`  Cold cache: ${results.realistic.coldCacheDuration.toFixed(0)}ms`, 'gray');
    log(`  Warm cache: ${results.realistic.warmCacheDuration.toFixed(0)}ms`, 'gray');
    log(`  Speedup: ${results.realistic.speedup.toFixed(1)}x`, 'green');
  }
  
  log('\n' + '═'.repeat(50), 'gray');
  log('✅ Benchmark complete!', 'green');
  
  if (results.realistic && results.realistic.speedup < 5) {
    log('\n⚠️  Cache speedup lower than expected', 'yellow');
    log('   This may indicate network or disk I/O issues', 'gray');
  }
}

main().catch(err => {
  log(`\n💥 Error: ${err.message}`, 'yellow');
  console.error(err);
  process.exit(1);
});
