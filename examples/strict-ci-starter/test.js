// Test that verifies AI behavior
import { summarizeText } from './src/app.js';

async function runTest() {
  console.log('🧪 Running AI behavior test...\n');

  const testInput = `
    TraceForge is an execution record and replay layer for AI systems.
    It guarantees that no AI behavior change reaches production without
    a recorded execution and verified replay. This makes AI systems
    reproducible, verifiable, and auditable.
  `;

  try {
    const summary = await summarizeText(testInput);
    
    console.log('✅ Test passed!');
    console.log(`📝 Summary: ${summary}`);
    
    // Verify summary is reasonable
    if (!summary || summary.length < 10) {
      throw new Error('Summary too short');
    }
    
    console.log('\n✨ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed!');
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

runTest();
